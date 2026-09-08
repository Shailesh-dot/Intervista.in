using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Knitnet.Shared.Models;
using Knitnet.Shared.Settings;
using Knitnet.UserApi.Data;
using Knitnet.UserApi.DTOs;

namespace Knitnet.UserApi.Services;

public interface IVerificationService
{
    Task<VerificationStatusDto> GetStatusAsync(int userId);
    Task<string> CreateAsync(int userId, VerificationCreateDto dto);
    Task<string> CompleteAsync(VerificationCompleteDto dto);
    Task SaveSnapshotAsync(int userId, int index, IFormFile snapshot);
    void CleanupSnapshots(int userId);
}

public class VerificationService : IVerificationService
{
    private readonly UserDbContext _db;
    private readonly VerificationSettings _settings;

    public VerificationService(UserDbContext db, IOptions<VerificationSettings> settings)
    {
        _db = db;
        _settings = settings.Value;
    }

    public async Task<VerificationStatusDto> GetStatusAsync(int userId)
    {
        var userIdStr = userId.ToString();
        var v = await _db.IdentityVerifications
            .Where(x => x.UserId == userIdStr && !string.IsNullOrEmpty(x.PassportPhotoUrl))
            .OrderByDescending(x => x.Id)
            .FirstOrDefaultAsync();

        return v == null
            ? new VerificationStatusDto { Verified = false }
            : new VerificationStatusDto { Verified = true, UniqueId = v.UniqueId, PhotoUrl = v.PassportPhotoUrl };
    }

    public async Task<string> CreateAsync(int userId, VerificationCreateDto dto)
    {
        var uniqueId = Guid.NewGuid().ToString();
        _db.IdentityVerifications.Add(new IdentityVerification
        {
            UserId = userId.ToString(), UserName = dto.UserName,
            AadhaarLast4 = dto.AadhaarLast4, AadhaarZipUrl = dto.AadhaarZipUrl,
            PassportPhotoUrl = dto.PassportPhotoUrl, UniqueId = uniqueId, ShareCode = dto.ShareCode
        });
        await _db.SaveChangesAsync();
        return uniqueId;
    }

    public async Task<string> CompleteAsync(VerificationCompleteDto dto)
    {
        var v = await _db.IdentityVerifications.FirstOrDefaultAsync(x => x.UniqueId == dto.UniqueId)
            ?? throw new ArgumentException("Verification record not found");
        v.PassportPhotoUrl = dto.PassportPhotoUrl;
        await _db.SaveChangesAsync();
        return v.UniqueId!;
    }

    /// <summary>
    /// Saves a verification snapshot to temporary VM SSD storage.
    /// Max snapshots: configurable via VerificationSettings.SnapshotCount (default 15).
    /// </summary>
    public async Task SaveSnapshotAsync(int userId, int index, IFormFile snapshot)
    {
        if (index >= _settings.SnapshotCount)
            throw new ArgumentException($"Max {_settings.SnapshotCount} snapshots allowed");

        var dir = Path.Combine(_settings.TempStoragePath, userId.ToString());
        Directory.CreateDirectory(dir);
        var filePath = Path.Combine(dir, $"snapshot_{index}.jpg");
        using var stream = new FileStream(filePath, FileMode.Create);
        await snapshot.CopyToAsync(stream);
    }

    /// <summary>
    /// Deletes all temporary snapshots for a user after test completion.
    /// </summary>
    public void CleanupSnapshots(int userId)
    {
        var dir = Path.Combine(_settings.TempStoragePath, userId.ToString());
        if (Directory.Exists(dir)) Directory.Delete(dir, true);
    }
}
