using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Knitnet.Shared.Models;
using Knitnet.Shared.Settings;
using Knitnet.UserApi.Data;
using Knitnet.UserApi.DTOs;

namespace Knitnet.UserApi.Services;

// ═══════════════════════════════════════════════════════════════
// SNAPSHOT SERVICE — AI Proctoring Snapshot Persistence
//
// Handles:
//   1. Session management (group snapshots per exam sitting)
//   2. Permanent upload to Supabase Storage + DB record insert
//   3. Query endpoints for the AI face-authentication model
//
// Uses the existing IStorageService for Supabase uploads and
// signed URL generation. Images go to the verification-docs
// bucket under snapshots/{userId}/{sessionId}/.
// ═══════════════════════════════════════════════════════════════

public interface ISnapshotService
{
    /// <summary>Creates a new session UUID for grouping snapshots from a single exam sitting.</summary>
    Task<StartSnapshotSessionResponseDto> StartSessionAsync(int userId, StartSnapshotSessionDto dto);

    /// <summary>Uploads snapshot to Supabase, writes temp file, and inserts DB metadata record.</summary>
    Task SaveSnapshotAsync(int userId, string sessionId, int index, IFormFile file, string? testId, string? testCode, string? individualMailCode);

    /// <summary>Returns all snapshot metadata for a user, with signed URLs.</summary>
    Task<List<SnapshotResponseDto>> GetByUserIdAsync(int userId);

    /// <summary>Returns snapshot metadata for a user + test combination, with signed URLs.</summary>
    Task<List<SnapshotResponseDto>> GetByUserAndTestAsync(int userId, string testId);

    /// <summary>Returns all snapshot metadata for a specific session, with signed URLs.</summary>
    Task<List<SnapshotResponseDto>> GetBySessionAsync(string sessionId);
}

public class SnapshotService : ISnapshotService
{
    private readonly UserDbContext _db;
    private readonly IStorageService _storage;
    private readonly VerificationSettings _verificationSettings;

    /// <summary>
    /// Supabase bucket for proctoring snapshots.
    /// Reuses the existing private verification-docs bucket.
    /// </summary>
    private const string SnapshotBucket = "verification-docs";

    /// <summary>Folder prefix inside the bucket to namespace proctoring snapshots.</summary>
    private const string SnapshotFolder = "snapshots";

    /// <summary>Signed URL validity period — 1 hour default, long enough for AI batch processing.</summary>
    private const int SignedUrlExpirySeconds = 3600;

    public SnapshotService(
        UserDbContext db,
        IStorageService storage,
        IOptions<VerificationSettings> verificationSettings)
    {
        _db = db;
        _storage = storage;
        _verificationSettings = verificationSettings.Value;
    }

    public async Task<StartSnapshotSessionResponseDto> StartSessionAsync(int userId, StartSnapshotSessionDto dto)
    {
        // ── ONE-ATTEMPT GUARD ──────────────────────────────────────────
        // Block if the student already has a result record for this test
        if (!string.IsNullOrEmpty(dto.TestCode))
        {
            var alreadyAttempted = await _db.Results.AnyAsync(
                r => r.StudentId == userId &&
                     r.TestCode.ToLower() == dto.TestCode.ToLower()
            );
            if (alreadyAttempted)
                throw new ArgumentException("You have already attempted this test. Each test can only be taken once.");
        }
        else if (!string.IsNullOrEmpty(dto.TestId))
        {
            var alreadyAttempted = await _db.Results.AnyAsync(
                r => r.StudentId == userId &&
                     r.TestId.ToLower() == dto.TestId.ToLower()
            );
            if (alreadyAttempted)
                throw new ArgumentException("You have already attempted this test. Each test can only be taken once.");
        }
        // ──────────────────────────────────────────────────────────────

        // Generate a unique session ID for this exam sitting.
        // The session groups all snapshots together so the AI model
        // can distinguish between multiple attempts on the same test.
        var sessionId = Guid.NewGuid().ToString();

        return new StartSnapshotSessionResponseDto
        {
            SessionId = sessionId
        };
    }

    public async Task SaveSnapshotAsync(int userId, string sessionId, int index, IFormFile file, string? testId, string? testCode, string? individualMailCode)
    {
        if (string.IsNullOrEmpty(sessionId))
            throw new ArgumentException("Session ID is required");

        // Validate individual mail code (must be exactly 6 characters if provided)
        if (!string.IsNullOrEmpty(individualMailCode) && individualMailCode.Length != 6)
            throw new ArgumentException("Individual mail code must be exactly 6 characters.");

        // ── 1. Upload to Supabase Storage ─────────────────────
        // Path: snapshots/{userId}/{sessionId}/snapshot_{index}.jpg
        var folder = $"{SnapshotFolder}/{userId}/{sessionId}";

        // Use the storage service's upload — it returns the public URL
        var storageUrl = await _storage.UploadAsync(file, SnapshotBucket, folder);

        // Extract the object path from the returned URL for signed URL generation later.
        var uploadedObjectPath = ExtractObjectPath(storageUrl, SnapshotBucket);

        // ── 2. Also save to temp storage (preserves existing behavior) ──
        var tempDir = Path.Combine(_verificationSettings.TempStoragePath, userId.ToString());
        Directory.CreateDirectory(tempDir);
        var tempFilePath = Path.Combine(tempDir, $"snapshot_{index}.jpg");
        using (var tempStream = new FileStream(tempFilePath, FileMode.Create))
        {
            file.OpenReadStream().CopyTo(tempStream);
        }

        // ── 3. Insert metadata record into DB ─────────────────
        var snapshot = new VerificationSnapshot
        {
            UserId = userId,
            TestId = testId ?? await ResolveTestIdForSession(sessionId),
            TestCode = testCode,
            IndividualMailCode = individualMailCode,
            SessionId = sessionId,
            SnapshotIndex = index,
            StorageBucket = SnapshotBucket,
            StoragePath = uploadedObjectPath,
            StorageUrl = storageUrl,
            FileSizeBytes = file.Length,
            ContentType = file.ContentType ?? "image/jpeg",
            CapturedAt = DateTime.UtcNow
        };

        _db.VerificationSnapshots.Add(snapshot);
        await _db.SaveChangesAsync();
    }

    public async Task<List<SnapshotResponseDto>> GetByUserIdAsync(int userId)
    {
        var snapshots = await _db.VerificationSnapshots
            .Where(s => s.UserId == userId)
            .OrderByDescending(s => s.CapturedAt)
            .ToListAsync();

        return await MapWithSignedUrls(snapshots);
    }

    public async Task<List<SnapshotResponseDto>> GetByUserAndTestAsync(int userId, string testId)
    {
        var snapshots = await _db.VerificationSnapshots
            .Where(s => s.UserId == userId && s.TestId == testId)
            .OrderBy(s => s.SnapshotIndex)
            .ToListAsync();

        return await MapWithSignedUrls(snapshots);
    }

    public async Task<List<SnapshotResponseDto>> GetBySessionAsync(string sessionId)
    {
        var snapshots = await _db.VerificationSnapshots
            .Where(s => s.SessionId == sessionId)
            .OrderBy(s => s.SnapshotIndex)
            .ToListAsync();

        return await MapWithSignedUrls(snapshots);
    }

    // ═══════════════════════════════════════════════════════════
    // PRIVATE HELPERS
    // ═══════════════════════════════════════════════════════════

    /// <summary>
    /// Generates time-limited signed URLs for each snapshot.
    /// The AI model receives these URLs and must fetch images within the expiry window.
    /// </summary>
    private async Task<List<SnapshotResponseDto>> MapWithSignedUrls(List<VerificationSnapshot> snapshots)
    {
        var result = new List<SnapshotResponseDto>();

        foreach (var s in snapshots)
        {
            string signedUrl;
            try
            {
                signedUrl = await _storage.GetSignedUrlAsync(
                    s.StorageBucket, s.StoragePath, SignedUrlExpirySeconds);
            }
            catch
            {
                // Fallback to stored URL if signing fails (e.g., bucket is public)
                signedUrl = s.StorageUrl;
            }

            result.Add(new SnapshotResponseDto
            {
                Id = s.Id,
                UserId = s.UserId,
                TestId = s.TestId,
                TestCode = s.TestCode,
                IndividualMailCode = s.IndividualMailCode,
                SessionId = s.SessionId,
                SnapshotIndex = s.SnapshotIndex,
                SnapshotUrl = signedUrl,
                StorageBucket = s.StorageBucket,
                StoragePath = s.StoragePath,
                FileSizeBytes = s.FileSizeBytes,
                ContentType = s.ContentType,
                CapturedAt = s.CapturedAt
            });
        }

        return result;
    }

    /// <summary>
    /// Extracts the Supabase object path from a full public URL.
    /// Input:  https://xxx.supabase.co/storage/v1/object/public/verification-docs/snapshots/1/abc/file.jpg
    /// Output: snapshots/1/abc/file.jpg
    /// </summary>
    private static string ExtractObjectPath(string fullUrl, string bucket)
    {
        var marker = $"/object/public/{bucket}/";
        var idx = fullUrl.IndexOf(marker, StringComparison.Ordinal);
        if (idx >= 0)
            return fullUrl[(idx + marker.Length)..];

        // Fallback: try the non-public path pattern
        var marker2 = $"/object/{bucket}/";
        var idx2 = fullUrl.IndexOf(marker2, StringComparison.Ordinal);
        return idx2 >= 0 ? fullUrl[(idx2 + marker2.Length)..] : fullUrl;
    }

    /// <summary>
    /// Looks up the test_id from the first snapshot in this session.
    /// Returns null if session is brand new (test_id is set later via the first snapshot's context).
    /// </summary>
    private async Task<string?> ResolveTestIdForSession(string sessionId)
    {
        var existing = await _db.VerificationSnapshots
            .Where(s => s.SessionId == sessionId && s.TestId != null)
            .Select(s => s.TestId)
            .FirstOrDefaultAsync();
        return existing;
    }
}
