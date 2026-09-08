using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Knitnet.Shared.Models;

[Table("verification_snapshots")]
public class VerificationSnapshot
{
    [Key]
    [Column("id")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }

    [Column("user_id")]
    public int UserId { get; set; }

    [Column("test_id")]
    public string? TestId { get; set; }

    [ForeignKey("TestId")]
    public TestInfo? TestInfo { get; set; }

    [Column("test_code")]
    public string? TestCode { get; set; }

    [Column("individual_mail_code")]
    public string? IndividualMailCode { get; set; }

    [Column("session_id")]
    public string SessionId { get; set; } = string.Empty;

    [Column("snapshot_index")]
    public int SnapshotIndex { get; set; }

    [Column("storage_bucket")]
    public string StorageBucket { get; set; } = string.Empty;

    [Column("storage_path")]
    public string StoragePath { get; set; } = string.Empty;

    [Column("storage_url")]
    public string StorageUrl { get; set; } = string.Empty;

    [Column("file_size_bytes")]
    public long FileSizeBytes { get; set; }

    [Column("content_type")]
    public string ContentType { get; set; } = "image/jpeg";

    [Column("captured_at")]
    public DateTime CapturedAt { get; set; } = DateTime.UtcNow;

    // Navigation property back to User
    public User? User { get; set; }
}
