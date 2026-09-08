using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Knitnet.Shared.Models;
using Knitnet.Shared.Settings;
using Knitnet.TransactionApi.Data;
using Knitnet.TransactionApi.DTOs;

namespace Knitnet.TransactionApi.Services;

// ═══════════════════════════════════════════════════════════════
// BILLING SERVICE
// ═══════════════════════════════════════════════════════════════
public interface IBillingService
{
    Task<BillingResponseDto> CreateOrUpdateAsync(Guid companyId, CreateBillingDto dto);
    Task<BillingResponseDto?> GetByCompanyIdAsync(Guid companyId);
}

public class BillingService : IBillingService
{
    private readonly TransactionDbContext _db;
    public BillingService(TransactionDbContext db) { _db = db; }

    public async Task<BillingResponseDto> CreateOrUpdateAsync(Guid companyId, CreateBillingDto dto)
    {
        if (dto.IsGstRegistered && string.IsNullOrEmpty(dto.Gstin))
            throw new ArgumentException("GSTIN required when GST registered");

        var e = await _db.BillingInfos.FirstOrDefaultAsync(b => b.CompanyId == companyId);
        if (e == null)
        {
            e = new BillingInfo
            {
                CompanyId = companyId, BillingName = dto.BillingName,
                BillingEmail = dto.BillingEmail, BillingPhone = dto.BillingPhone,
                Gstin = dto.Gstin, IsGstRegistered = dto.IsGstRegistered,
                Line1 = dto.Line1, Line2 = dto.Line2,
                City = dto.City, State = dto.State, PostalCode = dto.PostalCode, Country = dto.Country
            };
            _db.BillingInfos.Add(e);
        }
        else
        {
            e.BillingName = dto.BillingName; e.BillingEmail = dto.BillingEmail;
            e.BillingPhone = dto.BillingPhone; e.Gstin = dto.Gstin;
            e.IsGstRegistered = dto.IsGstRegistered;
            e.Line1 = dto.Line1; e.Line2 = dto.Line2;
            e.City = dto.City; e.State = dto.State;
            e.PostalCode = dto.PostalCode; e.Country = dto.Country;
            e.UpdatedAt = DateTime.UtcNow;
        }
        await _db.SaveChangesAsync();
        return Map(e);
    }

    public async Task<BillingResponseDto?> GetByCompanyIdAsync(Guid companyId)
    {
        var b = await _db.BillingInfos.FirstOrDefaultAsync(x => x.CompanyId == companyId);
        return b == null ? null : Map(b);
    }

    private static BillingResponseDto Map(BillingInfo b) => new()
    {
        Id = b.Id, CompanyId = b.CompanyId, BillingName = b.BillingName,
        BillingEmail = b.BillingEmail, BillingPhone = b.BillingPhone,
        Gstin = b.Gstin, IsGstRegistered = b.IsGstRegistered,
        City = b.City, State = b.State
    };
}

// ═══════════════════════════════════════════════════════════════
// CREDIT SERVICE - ACID-compliant balance management
// Sole source of truth for credits. No duplicates.
// ═══════════════════════════════════════════════════════════════
public interface ICreditService
{
    Task<TransactionResponseDto> DeductCreditsAsync(Guid companyId, CreateUsageDto dto);
    Task<int> GetBalanceAsync(Guid companyId);
    Task AddCreditsFromPaymentAsync(Guid companyId, int credits, string paymentId, string orderId, decimal amount);
}

public class CreditService : ICreditService
{
    private readonly TransactionDbContext _db;
    public CreditService(TransactionDbContext db) { _db = db; }

    public async Task<TransactionResponseDto> DeductCreditsAsync(Guid companyId, CreateUsageDto dto)
    {
        using var dbTx = await _db.Database.BeginTransactionAsync();

        var balance = await _db.CreditBalances.FirstOrDefaultAsync(c => c.CompanyId == companyId);
        var currentBalance = balance?.Balance ?? 0;

        if (currentBalance < dto.Credits)
            throw new InvalidOperationException("Insufficient credits");

        var tx = new Transaction
        {
            CompanyId = companyId, Credits = -dto.Credits, Type = "USAGE",
            Status = "SUCCESS", Description = dto.Description,
            ReferenceId = dto.ReferenceId, Amount = 0
        };
        _db.Transactions.Add(tx);

        if (balance == null)
        {
            balance = new CreditBalance { CompanyId = companyId, Balance = -dto.Credits, LastTransactionId = tx.Id };
            _db.CreditBalances.Add(balance);
        }
        else
        {
            balance.Balance -= dto.Credits;
            balance.LastTransactionId = tx.Id;
            balance.LastUpdatedAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();
        await dbTx.CommitAsync();

        return new TransactionResponseDto
        {
            Id = tx.Id, CompanyId = companyId, Credits = tx.Credits,
            Type = tx.Type, Status = tx.Status,
            BalanceAfter = balance.Balance, CreatedAt = tx.CreatedAt
        };
    }

    public async Task<int> GetBalanceAsync(Guid companyId)
    {
        var b = await _db.CreditBalances.FirstOrDefaultAsync(c => c.CompanyId == companyId);
        return b?.Balance ?? 0;
    }

    /// <summary>
    /// Called ONLY by the webhook handler. Never by frontend.
    /// IDEMPOTENT: If the transaction for this orderId is already SUCCESS, this is a no-op.
    /// ATOMIC: Entire operation runs inside a DB transaction.
    /// </summary>
    public async Task AddCreditsFromPaymentAsync(Guid companyId, int credits, string paymentId, string orderId, decimal amount)
    {
        using var dbTx = await _db.Database.BeginTransactionAsync();

        // ── IDEMPOTENCY GUARD ──────────────────────────────
        // Razorpay may call the webhook multiple times for the same event.
        // If this order is already processed, skip entirely to prevent double-crediting.
        var existingTx = await _db.Transactions.FirstOrDefaultAsync(t => t.OrderId == orderId);
        if (existingTx != null && existingTx.Status == "SUCCESS")
        {
            await dbTx.RollbackAsync();
            return; // Already processed — safe to ignore
        }

        // Find and update the PENDING transaction
        if (existingTx != null && existingTx.Status == "PENDING")
        {
            existingTx.Status = "SUCCESS";
            existingTx.ReferenceId = paymentId;
        }
        else if (existingTx == null)
        {
            // Fallback: webhook arrived before order was recorded (race condition)
            _db.Transactions.Add(new Transaction
            {
                CompanyId = companyId, Credits = credits, Type = "PURCHASE",
                Status = "SUCCESS", Description = "Razorpay payment",
                ReferenceId = paymentId, OrderId = orderId, Amount = amount
            });
        }

        // ── ATOMIC BALANCE UPDATE ──────────────────────────
        var balance = await _db.CreditBalances.FirstOrDefaultAsync(c => c.CompanyId == companyId);
        if (balance == null)
        {
            _db.CreditBalances.Add(new CreditBalance { CompanyId = companyId, Balance = credits, LastUpdatedAt = DateTime.UtcNow });
        }
        else
        {
            balance.Balance += credits;
            balance.LastUpdatedAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();
        await dbTx.CommitAsync();
    }
}

// ═══════════════════════════════════════════════════════════════
// RAZORPAY SERVICE - COMPLETELY NEW IMPLEMENTATION
// Credits are ONLY added via webhook. Frontend verify is supplementary.
// ═══════════════════════════════════════════════════════════════
public interface IRazorpayService
{
    Task<CreateOrderResponseDto> CreateOrderAsync(Guid companyId, CreateOrderDto dto);
    Task<object> VerifyPaymentAsync(VerifyPaymentDto dto);
    Task ProcessWebhookAsync(string rawBody, string signature);
}

public class RazorpayService : IRazorpayService
{
    private readonly TransactionDbContext _db;
    private readonly RazorpaySettings _settings;
    private readonly ICreditService _credits;
    private readonly HttpClient _http;

    public RazorpayService(TransactionDbContext db, IOptions<RazorpaySettings> settings,
        ICreditService credits, IHttpClientFactory httpFactory)
    {
        _db = db; _settings = settings.Value; _credits = credits;
        _http = httpFactory.CreateClient("Razorpay");
    }

    public async Task<CreateOrderResponseDto> CreateOrderAsync(Guid companyId, CreateOrderDto dto)
    {
        // Call Razorpay Orders API
        var authBytes = Encoding.ASCII.GetBytes($"{_settings.KeyId}:{_settings.KeySecret}");
        _http.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue(
            "Basic", Convert.ToBase64String(authBytes));

        var payload = new { amount = (int)(dto.Amount * 100), currency = "INR", receipt = Guid.NewGuid().ToString()[..8] };
        var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

        var response = await _http.PostAsync("https://api.razorpay.com/v1/orders", content);
        if (!response.IsSuccessStatusCode)
            throw new Exception("Failed to create Razorpay order");

        var body = await response.Content.ReadAsStringAsync();
        var json = JsonSerializer.Deserialize<JsonElement>(body);
        var orderId = json.GetProperty("id").GetString()!;

        // Create PENDING transaction — credits NOT added yet
        _db.Transactions.Add(new Transaction
        {
            CompanyId = companyId, Credits = dto.Credits, Type = "PURCHASE",
            Status = "PENDING", Description = "Credit purchase via Razorpay",
            OrderId = orderId, Amount = dto.Amount
        });
        await _db.SaveChangesAsync();

        return new CreateOrderResponseDto
        {
            OrderId = orderId, Amount = dto.Amount, Currency = "INR", KeyId = _settings.KeyId
        };
    }

    /// <summary>Client-side signature check. Supplementary only — credits already handled by webhook.</summary>
    public async Task<object> VerifyPaymentAsync(VerifyPaymentDto dto)
    {
        var payload = $"{dto.RazorpayOrderId}|{dto.RazorpayPaymentId}";
        var expected = ComputeHmacSha256(payload, _settings.KeySecret);
        if (expected != dto.RazorpaySignature)
            throw new UnauthorizedAccessException("Invalid payment signature");
        return await Task.FromResult(new { verified = true, orderId = dto.RazorpayOrderId });
    }

    /// <summary>
    /// THE ONLY trusted source for payment confirmation.
    /// Verifies HMAC SHA256 signature → processes payment.captured → adds credits.
    /// </summary>
    public async Task ProcessWebhookAsync(string rawBody, string signature)
    {
        var log = new RazorpayWebhookLog { Payload = rawBody, EventType = "unknown" };

        // Step 1: Verify signature
        var expected = ComputeHmacSha256(rawBody, _settings.WebhookSecret);
        if (expected != signature)
        {
            log.EventType = "SIGNATURE_FAILED";
            _db.WebhookLogs.Add(log);
            await _db.SaveChangesAsync();
            throw new UnauthorizedAccessException("Invalid webhook signature");
        }

        // Step 2: Parse event
        var json = JsonSerializer.Deserialize<JsonElement>(rawBody);
        var eventType = json.GetProperty("event").GetString() ?? "";
        log.EventType = eventType;

        // Step 3: Process with IDEMPOTENCY
        if (eventType == "payment.captured")
        {
            var entity = json.GetProperty("payload").GetProperty("payment").GetProperty("entity");
            var paymentId = entity.GetProperty("id").GetString()!;
            var orderId = entity.GetProperty("order_id").GetString()!;
            var amountPaise = entity.GetProperty("amount").GetInt64();

            var tx = await _db.Transactions.FirstOrDefaultAsync(t => t.OrderId == orderId);

            // IDEMPOTENCY: skip if already SUCCESS or no matching order
            if (tx != null && tx.Status == "PENDING")
            {
                await _credits.AddCreditsFromPaymentAsync(
                    tx.CompanyId, tx.Credits, paymentId, orderId, amountPaise / 100m);
                log.Processed = true;
            }
            else if (tx != null && tx.Status == "SUCCESS")
            {
                // Duplicate webhook — already processed, log but don't re-credit
                log.Processed = false;
            }
        }
        else if (eventType == "payment.failed")
        {
            var entity = json.GetProperty("payload").GetProperty("payment").GetProperty("entity");
            var orderId = entity.GetProperty("order_id").GetString()!;
            var tx = await _db.Transactions.FirstOrDefaultAsync(t => t.OrderId == orderId);

            // IDEMPOTENCY: only transition PENDING → FAILED
            if (tx != null && tx.Status == "PENDING")
            {
                tx.Status = "FAILED";
                log.Processed = true;
            }
        }

        _db.WebhookLogs.Add(log);
        await _db.SaveChangesAsync();
    }

    private static string ComputeHmacSha256(string data, string secret)
    {
        var keyBytes = Encoding.UTF8.GetBytes(secret);
        using var hmac = new HMACSHA256(keyBytes);
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(data));
        return BitConverter.ToString(hash).Replace("-", "").ToLowerInvariant();
    }
}
