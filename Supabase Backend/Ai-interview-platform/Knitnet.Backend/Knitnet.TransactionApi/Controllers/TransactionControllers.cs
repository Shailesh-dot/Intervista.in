using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Knitnet.TransactionApi.DTOs;
using Knitnet.TransactionApi.Services;

namespace Knitnet.TransactionApi.Controllers;

public abstract class TxBaseController : ControllerBase
{
    protected Guid CompanyId => Guid.Parse(User.FindFirst("companyId")?.Value ?? Guid.Empty.ToString());
}

[ApiController, Route("api/transaction/billing"), Authorize(Roles = "company")]
public class BillingController : TxBaseController
{
    private readonly IBillingService _svc;
    public BillingController(IBillingService svc) { _svc = svc; }

    [HttpPost]
    public async Task<IActionResult> CreateOrUpdate(CreateBillingDto dto)
    {
        try { return Ok(await _svc.CreateOrUpdateAsync(CompanyId, dto)); }
        catch (ArgumentException ex) { return BadRequest(new { error = ex.Message }); }
    }

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var r = await _svc.GetByCompanyIdAsync(CompanyId);
        return r == null ? NotFound() : Ok(r);
    }
}

[ApiController, Route("api/transaction/credits"), Authorize(Roles = "company")]
public class CreditController : TxBaseController
{
    private readonly ICreditService _svc;
    public CreditController(ICreditService svc) { _svc = svc; }

    [HttpPost("usage")]
    public async Task<IActionResult> Deduct(CreateUsageDto dto)
    {
        try { return Ok(await _svc.DeductCreditsAsync(CompanyId, dto)); }
        catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
    }

    [HttpGet("balance")]
    public async Task<IActionResult> Balance()
        => Ok(new { balance = await _svc.GetBalanceAsync(CompanyId) });
}

[ApiController, Route("api/transaction/razorpay")]
public class RazorpayController : TxBaseController
{
    private readonly IRazorpayService _svc;
    public RazorpayController(IRazorpayService svc) { _svc = svc; }

    [Authorize(Roles = "company"), HttpPost("create-order")]
    public async Task<IActionResult> CreateOrder(CreateOrderDto dto)
    {
        try { return Ok(await _svc.CreateOrderAsync(CompanyId, dto)); }
        catch (Exception ex) { return BadRequest(new { error = ex.Message }); }
    }

    [Authorize(Roles = "company"), HttpPost("verify")]
    public async Task<IActionResult> Verify(VerifyPaymentDto dto)
    {
        try { return Ok(await _svc.VerifyPaymentAsync(dto)); }
        catch (UnauthorizedAccessException ex) { return Unauthorized(new { error = ex.Message }); }
    }

    /// <summary>
    /// Razorpay webhook endpoint. ANONYMOUS — Razorpay calls this directly.
    /// Signature verified inside the service via HMAC SHA256.
    /// </summary>
    [AllowAnonymous, HttpPost("webhook")]
    public async Task<IActionResult> Webhook()
    {
        using var reader = new StreamReader(Request.Body);
        var rawBody = await reader.ReadToEndAsync();
        var signature = Request.Headers["X-Razorpay-Signature"].FirstOrDefault() ?? "";

        try { await _svc.ProcessWebhookAsync(rawBody, signature); return Ok(new { status = "processed" }); }
        catch (UnauthorizedAccessException) { return Unauthorized(new { error = "Invalid signature" }); }
    }
}
