namespace Knitnet.TransactionApi.DTOs;

// ─── Billing DTOs ────────────────────────────────────────────
public class CreateBillingDto
{
    public string BillingName { get; set; } = string.Empty;
    public string BillingEmail { get; set; } = string.Empty;
    public string BillingPhone { get; set; } = string.Empty;
    public string? Gstin { get; set; }
    public bool IsGstRegistered { get; set; }
    public string? Line1 { get; set; }
    public string? Line2 { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string? PostalCode { get; set; }
    public string? Country { get; set; }
}

public class BillingResponseDto
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public string BillingName { get; set; } = string.Empty;
    public string BillingEmail { get; set; } = string.Empty;
    public string BillingPhone { get; set; } = string.Empty;
    public string? Gstin { get; set; }
    public bool IsGstRegistered { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
}

// ─── Credit/Transaction DTOs ─────────────────────────────────
public class CreateUsageDto
{
    public int Credits { get; set; }
    public string? Description { get; set; }
    public string? ReferenceId { get; set; }
}

public class TransactionResponseDto
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public int Credits { get; set; }
    public string Type { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public int BalanceAfter { get; set; }
    public DateTime CreatedAt { get; set; }
}

// ─── Razorpay DTOs ───────────────────────────────────────────
public class CreateOrderDto
{
    public int Credits { get; set; }
    public decimal Amount { get; set; }
}

public class CreateOrderResponseDto
{
    public string OrderId { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "INR";
    public string KeyId { get; set; } = string.Empty;
}

public class VerifyPaymentDto
{
    public string RazorpayOrderId { get; set; } = string.Empty;
    public string RazorpayPaymentId { get; set; } = string.Empty;
    public string RazorpaySignature { get; set; } = string.Empty;
}
