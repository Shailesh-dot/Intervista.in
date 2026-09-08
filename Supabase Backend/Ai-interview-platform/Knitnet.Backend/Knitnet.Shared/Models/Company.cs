using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Knitnet.Shared.Models;

/// <summary>
/// Company entity. Auth is via users table (user_id FK).
/// No email/password stored here - single auth system.
/// </summary>
[Table("companies")]
public class Company
{
    [Key]
    [Column("uid")]
    public Guid Uid { get; set; } = Guid.NewGuid();

    [Column("user_id")]
    public int UserId { get; set; }

    [Column("company_name")]
    public string CompanyName { get; set; } = string.Empty;

    [Column("contact_no")]
    public string ContactNo { get; set; } = string.Empty;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties for FK enforcement
    public User? User { get; set; }
    public CompanyInfo? CompanyInfo { get; set; }
    public ICollection<HR> HRs { get; set; } = new List<HR>();
    public ICollection<TestInfo> TestInfos { get; set; } = new List<TestInfo>();
}
