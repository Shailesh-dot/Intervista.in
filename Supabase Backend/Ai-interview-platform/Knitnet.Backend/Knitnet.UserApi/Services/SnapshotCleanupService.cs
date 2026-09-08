using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Knitnet.Shared.Settings;

namespace Knitnet.UserApi.Services;

/// <summary>
/// Background job that periodically cleans up stale verification snapshots
/// from the temp storage directory. Runs every 5 minutes and deletes
/// any snapshot folder older than the configured max age (default: 30 minutes).
/// </summary>
public class SnapshotCleanupService : BackgroundService
{
    private readonly ILogger<SnapshotCleanupService> _logger;
    private readonly VerificationSettings _settings;

    /// <summary>How often the cleanup loop runs.</summary>
    private static readonly TimeSpan ScanInterval = TimeSpan.FromMinutes(5);

    /// <summary>Max age of a snapshot folder before it gets deleted.</summary>
    private static readonly TimeSpan MaxAge = TimeSpan.FromMinutes(30);

    public SnapshotCleanupService(
        ILogger<SnapshotCleanupService> logger,
        IOptions<VerificationSettings> settings)
    {
        _logger = logger;
        _settings = settings.Value;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("SnapshotCleanupService started. Scanning {Path} every {Interval}m, max age {MaxAge}m",
            _settings.TempStoragePath, ScanInterval.TotalMinutes, MaxAge.TotalMinutes);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                CleanupStaleSnapshots();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during snapshot cleanup");
            }

            await Task.Delay(ScanInterval, stoppingToken);
        }
    }

    private void CleanupStaleSnapshots()
    {
        var basePath = _settings.TempStoragePath;
        if (!Directory.Exists(basePath))
            return;

        var cutoff = DateTime.UtcNow - MaxAge;
        var directories = Directory.GetDirectories(basePath);
        var cleaned = 0;

        foreach (var dir in directories)
        {
            var lastWrite = Directory.GetLastWriteTimeUtc(dir);
            if (lastWrite < cutoff)
            {
                try
                {
                    Directory.Delete(dir, recursive: true);
                    cleaned++;
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to delete stale snapshot dir: {Dir}", dir);
                }
            }
        }

        if (cleaned > 0)
            _logger.LogInformation("Cleaned up {Count} stale snapshot directories", cleaned);
    }
}
