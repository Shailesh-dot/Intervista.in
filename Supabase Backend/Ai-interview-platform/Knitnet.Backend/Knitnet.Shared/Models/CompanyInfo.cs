using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Knitnet.Shared.Models;

[Table("company_infos")]
public class CompanyInfo
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Column("company_id")]
    public Guid CompanyId { get; set; }

    [Column("website")]
    public string? Website { get; set; }

    [Column("industry")]
    public string? Industry { get; set; }

    [Column("company_size")]
    public string? CompanySize { get; set; }

    [Column("founded_year")]
    public int? FoundedYear { get; set; }

    [Column("description")]
    public string? Description { get; set; }

    [Column("logo_url")]
    public string? LogoUrl { get; set; }

    [Column("address_line1")]
    public string? AddressLine1 { get; set; }

    [Column("address_line2")]
    public string? AddressLine2 { get; set; }

    [Column("city")]
    public string? City { get; set; }

    [Column("state")]
    public string? State { get; set; }

    [Column("country")]
    public string? Country { get; set; }

    [Column("postal_code")]
    public string? PostalCode { get; set; }

    [Column("linkedin_url")]
    public string? LinkedinUrl { get; set; }

    [Column("github_url")]
    public string? GithubUrl { get; set; }

    [Column("is_verified")]
    public bool IsVerified { get; set; }

    [Column("is_active")]
    public bool IsActive { get; set; } = true;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
