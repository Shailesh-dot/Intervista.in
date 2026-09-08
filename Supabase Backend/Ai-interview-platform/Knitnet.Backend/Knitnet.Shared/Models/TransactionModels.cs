using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Knitnet.Shared.Models;

[Table("billing_infos")]
public class BillingInfo
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Column("company_id")]
    public Guid CompanyId { get; set; }

    [Column("billing_name")]
    public string BillingName { get; set; } = string.Empty;

    [Column("billing_email")]
    public string BillingEmail { get; set; } = string.Empty;

    [Column("billing_phone")]
    public string BillingPhone { get; set; } = string.Empty;

    [Column("gstin")]
    public string? Gstin { get; set; }

    [Column("is_gst_registered")]
    public bool IsGstRegistered { get; set; }

    [Column("line1")]
    public string? Line1 { get; set; }

    [Column("line2")]
    public string? Line2 { get; set; }

    [Column("city")]
    public string? City { get; set; }

    [Column("state")]
    public string? State { get; set; }

    [Column("postal_code")]
    public string? PostalCode { get; set; }

    [Column("country")]
    public string? Country { get; set; }

    // NOTE: credits_balance REMOVED - CreditBalance table is sole source of truth

    [Column("is_active")]
    public bool IsActive { get; set; } = true;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

[Table("transactions")]
public class Transaction
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Column("company_id")]
    public Guid CompanyId { get; set; }

    [Column("credits")]
    public int Credits { get; set; }

    [Column("type")]
    public string Type { get; set; } = string.Empty;

    [Column("status")]
    public string Status { get; set; } = "PENDING";

    [Column("description")]
    public string? Description { get; set; }

    [Column("reference_id")]
    public string? ReferenceId { get; set; }

    [Column("order_id")]
    public string? OrderId { get; set; }

    [Column("amount")]
    public decimal Amount { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

[Table("credit_balances")]
public class CreditBalance
{
    [Key]
    [Column("company_id")]
    public Guid CompanyId { get; set; }

    [Column("balance")]
    public int Balance { get; set; }

    [Column("last_transaction_id")]
    public Guid? LastTransactionId { get; set; }

    [Column("last_updated_at")]
    public DateTime LastUpdatedAt { get; set; } = DateTime.UtcNow;
}

[Table("credit_points")]
public class CreditPoint
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("module")]
    public string Module { get; set; } = string.Empty;

    [Column("points")]
    public int Points { get; set; }
}

[Table("razorpay_webhook_logs")]
public class RazorpayWebhookLog
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Column("event_type")]
    public string EventType { get; set; } = string.Empty;

    [Column("payload")]
    public string Payload { get; set; } = "{}";

    [Column("received_at")]
    public DateTime ReceivedAt { get; set; } = DateTime.UtcNow;

    [Column("processed")]
    public bool Processed { get; set; }
}
