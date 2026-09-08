using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Knitnet.Shared.Models;

/// <summary>
/// Stores hashed password reset tokens.
/// The raw token is NEVER stored — only its SHA-256 hash.
/// </summary>
[Table("password_reset_tokens")]
public class PasswordResetToken
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("user_id")]
    public int UserId { get; set; }

    /// <summary>SHA-256 hash of the raw token sent to the user's email.</summary>
    [Required]
    [MaxLength(64)]
    [Column("token_hash")]
    public string TokenHash { get; set; } = string.Empty;

    [Column("expires_at_utc")]
    public DateTime ExpiresAtUtc { get; set; }

    /// <summary>Set when the token is consumed. Null = still valid.</summary>
    [Column("used_at_utc")]
    public DateTime? UsedAtUtc { get; set; }

    [Column("created_at_utc")]
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    // Navigation
    public User User { get; set; } = null!;
}
