using System.Collections.Concurrent;
using System.Diagnostics;
using System.Globalization;
using System.Net;
using System.Net.Http.Json;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Knitnet.LoadTester;

// ─── Command-Line Options ────────────────────────────────────
public class LoadTestOptions
{
    public string TargetBaseUrl { get; set; } = "http://localhost:5280";
    public int VirtualUsers { get; set; } = 1;
    public string Scenario { get; set; } = "login"; // "login", "signup", "both"
    public int? TotalRequests { get; set; }
    public int? DurationSeconds { get; set; }
    public int TimeoutSeconds { get; set; } = 30;
    public string? RunName { get; set; }
    public string Email { get; set; } = "loadtest_user@example.invalid";
    public string Password { get; set; } = "LoadTestPass123!";
    public string OutputDirectory { get; set; } = @"c:\Intervista Project\load-tests";
    public int RetryRounds { get; set; } = 0; // Default: 0 retries (baseline mode)
    public int RetryDelaySeconds { get; set; } = 2; // Default delay between retry rounds

    public static LoadTestOptions Parse(string[] args)
    {
        var opt = new LoadTestOptions();
        for (int i = 0; i < args.Length; i++)
        {
            var a = args[i];
            if (a.Equals("--target", StringComparison.OrdinalIgnoreCase) && i + 1 < args.Length) opt.TargetBaseUrl = args[++i];
            else if (a.Equals("--users", StringComparison.OrdinalIgnoreCase) && i + 1 < args.Length) opt.VirtualUsers = int.Parse(args[++i]);
            else if (a.Equals("--scenario", StringComparison.OrdinalIgnoreCase) && i + 1 < args.Length) opt.Scenario = args[++i].ToLowerInvariant();
            else if (a.Equals("--requests", StringComparison.OrdinalIgnoreCase) && i + 1 < args.Length) opt.TotalRequests = int.Parse(args[++i]);
            else if (a.Equals("--duration", StringComparison.OrdinalIgnoreCase) && i + 1 < args.Length) opt.DurationSeconds = int.Parse(args[++i]);
            else if (a.Equals("--timeout", StringComparison.OrdinalIgnoreCase) && i + 1 < args.Length) opt.TimeoutSeconds = int.Parse(args[++i]);
            else if (a.Equals("--run-name", StringComparison.OrdinalIgnoreCase) && i + 1 < args.Length) opt.RunName = args[++i];
            else if (a.Equals("--email", StringComparison.OrdinalIgnoreCase) && i + 1 < args.Length) opt.Email = args[++i];
            else if (a.Equals("--password", StringComparison.OrdinalIgnoreCase) && i + 1 < args.Length) opt.Password = args[++i];
            else if (a.Equals("--output-dir", StringComparison.OrdinalIgnoreCase) && i + 1 < args.Length) opt.OutputDirectory = args[++i];
            else if (a.Equals("--retry-rounds", StringComparison.OrdinalIgnoreCase) && i + 1 < args.Length) opt.RetryRounds = int.Parse(args[++i]);
            else if (a.Equals("--retry-delay", StringComparison.OrdinalIgnoreCase) && i + 1 < args.Length) opt.RetryDelaySeconds = int.Parse(args[++i]);
            else if (a.Equals("--help", StringComparison.OrdinalIgnoreCase) || a.Equals("-h", StringComparison.OrdinalIgnoreCase))
            {
                PrintUsage();
                Environment.Exit(0);
            }
        }
        return opt;
    }

    public static void PrintUsage()
    {
        Console.WriteLine(@"
Knitnet.LoadTester - C# Load Testing Harness for Knitnet.UserApi
================================================================
Options:
  --target <url>       Target base URL (default: http://localhost:5280)
  --users <int>        Number of concurrent virtual users (default: 1)
  --scenario <str>     Scenario: login | signup | both (default: login)
  --requests <int>     Total requests to execute (defaults to --users if --duration not set)
  --duration <int>     Test duration in seconds (optional)
  --timeout <int>      HTTP request timeout in seconds (default: 30)
  --run-name <str>     Descriptive name for the test run (optional)
  --email <str>        Email address for login scenario (default: loadtest_user@example.invalid)
  --password <str>     Password for login scenario (default: LoadTestPass123!)
  --output-dir <path>  Base directory for test artifacts (default: c:\Intervista Project\load-tests)
  --retry-rounds <int> Maximum retry rounds for HTTP 500 errors (default: 0 = baseline/no retries)
  --retry-delay <int>  Delay in seconds between retry rounds (default: 2)
  --help, -h           Show this help message
");
    }
}

// ─── Per-Request Measurement Record ──────────────────────────
public class RequestRecord
{
    public string RunId { get; set; } = string.Empty;
    public int RequestSeq { get; set; }
    public int VirtualUserId { get; set; }
    public int RoundNumber { get; set; } = 1;
    public int AttemptNumber { get; set; } = 1;
    public string Scenario { get; set; } = string.Empty;
    public string Operation { get; set; } = string.Empty; // ""Signup"" or ""Login""
    public DateTime TimestampUtc { get; set; }
    public string Method { get; set; } = "POST";
    public string Endpoint { get; set; } = string.Empty;
    public int StatusCode { get; set; }
    public double DurationMs { get; set; }
    public string ResultCategory { get; set; } = "UNKNOWN";
    public bool IsSuccess { get; set; }
    public bool IsTimeout { get; set; }
    public string ExceptionType { get; set; } = "None";
    public string TraceId { get; set; } = "none";
    public DateTime? InitialAttemptTimestampUtc { get; set; }
    public double? InitialAttemptDurationMs { get; set; }
    public int? InitialStatusCode { get; set; }
    public double? TimeWaitedBeforeRetryMs { get; set; }
    public double? TotalElapsedFromFirstAttemptMs { get; set; }
}

// ─── Request Work Item (Tracks request lifecycle across rounds) ─
public class RequestWorkItem
{
    public int RequestSeq { get; set; }
    public int VirtualUserId { get; set; }
    public string Scenario { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public int AttemptCount { get; set; } = 0;
    public int LastStatusCode { get; set; } = 0;
    public DateTime? InitialAttemptTimestampUtc { get; set; }
    public double? InitialAttemptDurationMs { get; set; }
    public int? InitialStatusCode { get; set; }
    public bool SignupSucceeded { get; set; } = false;
    public RequestRecord? LastRecord { get; set; }
}

// ─── Round Execution Info ────────────────────────────────────
public class RoundExecutionInfo
{
    public int RoundNumber { get; set; }
    public DateTime StartTimeUtc { get; set; }
    public DateTime EndTimeUtc { get; set; }
    public double DurationSeconds { get; set; }
    public double DelayBeforeThisRoundSeconds { get; set; }
    public int TotalRequests { get; set; }
    public int Count200 { get; set; }
    public int Count500 { get; set; }
    public int Count429 { get; set; }
}

// ─── Retry Statistics Summary ────────────────────────────────
public class RetryStatsSummary
{
    public int InitialSuccesses { get; set; }
    public int RecoveredSuccesses { get; set; }
    public int FinalSuccesses { get; set; }
    public int FinalFailures { get; set; }
    public int InitialHttp500 { get; set; }
    public int RecoveredFrom500 { get; set; }
    public int RemainingHttp500 { get; set; }
    public int TotalRetryAttempts { get; set; }
    public double InitialSuccessPercent { get; set; }
    public double FinalSuccessPercent { get; set; }
}

// ─── DTOs matching UserApi schema ────────────────────────────
public class SignupPayload
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("email")]
    public string Email { get; set; } = string.Empty;

    [JsonPropertyName("password")]
    public string Password { get; set; } = string.Empty;

    [JsonPropertyName("confirmPassword")]
    public string ConfirmPassword { get; set; } = string.Empty;
}

public class LoginPayload
{
    [JsonPropertyName("email")]
    public string Email { get; set; } = string.Empty;

    [JsonPropertyName("password")]
    public string Password { get; set; } = string.Empty;
}

// ─── Program Execution ───────────────────────────────────────
public static class Program
{
    private static readonly ConcurrentBag<RequestRecord> Records = new();
    private static readonly StringBuilder ClientLog = new();
    private static int _globalSeq;

    public static async Task Main(string[] args)
    {
        var options = LoadTestOptions.Parse(args);

        var dateFolder = DateTime.UtcNow.ToString("yyyy-MM-dd");
        var runPrefix = string.IsNullOrWhiteSpace(options.RunName)
            ? $"run-{options.VirtualUsers}-{options.Scenario}-{DateTime.UtcNow:HHmmss}"
            : options.RunName;
        var runId = runPrefix;

        var runDir = Path.Combine(options.OutputDirectory, dateFolder, runId);
        Directory.CreateDirectory(runDir);

        LogBoth($"=================================================================");
        LogBoth($" Knitnet.LoadTester - C# Load Testing Harness");
        LogBoth($"=================================================================");
        LogBoth($" Run ID:         {runId}");
        LogBoth($" Target URL:      {options.TargetBaseUrl}");
        LogBoth($" Virtual Users:   {options.VirtualUsers}");
        LogBoth($" Scenario:        {options.Scenario.ToUpperInvariant()}");
        LogBoth($" Timeout:         {options.TimeoutSeconds}s");
        LogBoth($" Output Dir:      {runDir}");
        LogBoth($" Retry Rounds:    {options.RetryRounds} (Delay: {options.RetryDelaySeconds}s)");
        if (options.DurationSeconds.HasValue)
            LogBoth($" Duration:        {options.DurationSeconds.Value}s");
        else
            LogBoth($" Target Requests: {options.TotalRequests ?? options.VirtualUsers}");
        LogBoth($"=================================================================\n");

        using var cts = new CancellationTokenSource();
        var wasInterrupted = false;

        Console.CancelKeyPress += (sender, eventArgs) =>
        {
            eventArgs.Cancel = true;
            wasInterrupted = true;
            LogBoth("[WARN] Cancellation requested (Ctrl+C). Flushing partial results...");
            cts.Cancel();
        };

        if (options.DurationSeconds.HasValue)
        {
            cts.CancelAfter(TimeSpan.FromSeconds(options.DurationSeconds.Value));
        }

        // Shared HttpClient with high connection limits for concurrency
        using var handler = new SocketsHttpHandler
        {
            PooledConnectionLifetime = TimeSpan.FromMinutes(15),
            PooledConnectionIdleTimeout = TimeSpan.FromMinutes(2),
            MaxConnectionsPerServer = 1000,
            EnableMultipleHttp2Connections = true
        };
        using var httpClient = new HttpClient(handler)
        {
            BaseAddress = new Uri(options.TargetBaseUrl.TrimEnd('/')),
            Timeout = TimeSpan.FromSeconds(options.TimeoutSeconds)
        };

        var overallStartTimeUtc = DateTime.UtcNow;
        var overallStopwatch = Stopwatch.StartNew();

        int targetTotalRequests = options.TotalRequests ?? options.VirtualUsers;
        var roundInfos = new List<RoundExecutionInfo>();
        var items = new List<RequestWorkItem>();

        try
        {
            using var semaphore = new SemaphoreSlim(options.VirtualUsers, options.VirtualUsers);

            if (options.DurationSeconds.HasValue)
            {
                // Continuous duration worker mode (retries not applicable)
                var tasks = new List<Task>();
                for (int u = 1; u <= options.VirtualUsers; u++)
                {
                    int userId = u;
                    tasks.Add(Task.Run(async () =>
                    {
                        while (!cts.Token.IsCancellationRequested)
                        {
                            await semaphore.WaitAsync(cts.Token);
                            try
                            {
                                int seq = Interlocked.Increment(ref _globalSeq);
                                var item = CreateWorkItem(options, runId, seq, userId);
                                await ExecuteWorkItemAsync(httpClient, options, runId, item, 1, cts.Token);
                            }
                            catch (OperationCanceledException) when (cts.Token.IsCancellationRequested)
                            {
                                break;
                            }
                            finally
                            {
                                semaphore.Release();
                            }
                        }
                    }, cts.Token));
                }
                await Task.WhenAll(tasks);
            }
            else
            {
                // Pre-generate work items for fixed request count
                for (int i = 1; i <= targetTotalRequests; i++)
                {
                    int seq = i;
                    int userId = ((i - 1) % options.VirtualUsers) + 1;
                    items.Add(CreateWorkItem(options, runId, seq, userId));
                }

                // ══════════════════════════════════════════════════════
                // ROUND 1: Initial Baseline Attempt (0 retries in this round)
                // ══════════════════════════════════════════════════════
                LogBoth($"--- ROUND 1: Executing {items.Count} requests concurrently (Concurrency: {options.VirtualUsers}) ---");
                var round1Sw = Stopwatch.StartNew();
                var round1StartUtc = DateTime.UtcNow;

                var round1Tasks = new List<Task>();
                foreach (var item in items)
                {
                    if (cts.Token.IsCancellationRequested) break;
                    await semaphore.WaitAsync(cts.Token);
                    round1Tasks.Add(Task.Run(async () =>
                    {
                        try
                        {
                            await ExecuteWorkItemAsync(httpClient, options, runId, item, 1, cts.Token);
                        }
                        catch (OperationCanceledException) when (cts.Token.IsCancellationRequested)
                        {
                            // Interrupted
                        }
                        finally
                        {
                            semaphore.Release();
                        }
                    }, cts.Token));
                }
                await Task.WhenAll(round1Tasks);
                round1Sw.Stop();
                var round1EndUtc = DateTime.UtcNow;

                var round1Info = new RoundExecutionInfo
                {
                    RoundNumber = 1,
                    StartTimeUtc = round1StartUtc,
                    EndTimeUtc = round1EndUtc,
                    DurationSeconds = Math.Round(round1Sw.Elapsed.TotalSeconds, 2),
                    DelayBeforeThisRoundSeconds = 0,
                    TotalRequests = items.Count,
                    Count200 = items.Count(i => i.LastStatusCode == 200),
                    Count500 = items.Count(i => i.LastStatusCode == 500),
                    Count429 = items.Count(i => i.LastStatusCode == 429)
                };
                roundInfos.Add(round1Info);

                LogBoth($"Round 1 finished in {round1Info.DurationSeconds:F2}s. 200 OK: {round1Info.Count200} | 500 Error: {round1Info.Count500} | 429: {round1Info.Count429}");

                // ══════════════════════════════════════════════════════
                // RETRY ROUNDS (Optional: only if configured and 500s occurred)
                // ══════════════════════════════════════════════════════
                if (options.RetryRounds > 0 && !cts.Token.IsCancellationRequested)
                {
                    var retryPool = items.Where(i => i.LastStatusCode == 500).ToList();
                    int currentRound = 2;

                    while (retryPool.Count > 0 && currentRound <= 1 + options.RetryRounds && !cts.Token.IsCancellationRequested)
                    {
                        LogBoth($"\nWaiting {options.RetryDelaySeconds}s delay before Round {currentRound}...");
                        await Task.Delay(TimeSpan.FromSeconds(options.RetryDelaySeconds), cts.Token);

                        LogBoth($"--- ROUND {currentRound}: Retrying {retryPool.Count} failed (HTTP 500) requests ---");
                        var roundSw = Stopwatch.StartNew();
                        var roundStartUtc = DateTime.UtcNow;

                        var roundTasks = new List<Task>();
                        foreach (var item in retryPool)
                        {
                            if (cts.Token.IsCancellationRequested) break;
                            await semaphore.WaitAsync(cts.Token);
                            roundTasks.Add(Task.Run(async () =>
                            {
                                try
                                {
                                    await ExecuteWorkItemAsync(httpClient, options, runId, item, currentRound, cts.Token);
                                }
                                catch (OperationCanceledException) when (cts.Token.IsCancellationRequested)
                                {
                                    // Interrupted
                                }
                                finally
                                {
                                    semaphore.Release();
                                }
                            }, cts.Token));
                        }
                        await Task.WhenAll(roundTasks);
                        roundSw.Stop();
                        var roundEndUtc = DateTime.UtcNow;

                        var roundInfo = new RoundExecutionInfo
                        {
                            RoundNumber = currentRound,
                            StartTimeUtc = roundStartUtc,
                            EndTimeUtc = roundEndUtc,
                            DurationSeconds = Math.Round(roundSw.Elapsed.TotalSeconds, 2),
                            DelayBeforeThisRoundSeconds = options.RetryDelaySeconds,
                            TotalRequests = retryPool.Count,
                            Count200 = retryPool.Count(i => i.LastStatusCode == 200),
                            Count500 = retryPool.Count(i => i.LastStatusCode == 500),
                            Count429 = retryPool.Count(i => i.LastStatusCode == 429)
                        };
                        roundInfos.Add(roundInfo);

                        LogBoth($"Round {currentRound} finished in {roundInfo.DurationSeconds:F2}s. 200 OK: {roundInfo.Count200} | 500 Error: {roundInfo.Count500} | 429: {roundInfo.Count429}");

                        // Only requests that STILL produced HTTP 500 are eligible for the next retry round
                        retryPool = retryPool.Where(i => i.LastStatusCode == 500).ToList();
                        currentRound++;
                    }
                }
            }
        }
        catch (OperationCanceledException)
        {
            wasInterrupted = true;
        }
        finally
        {
            overallStopwatch.Stop();
        }

        var overallEndTimeUtc = DateTime.UtcNow;
        var overallElapsedSec = overallStopwatch.Elapsed.TotalSeconds;

        LogBoth($"\nExecution completed in {overallElapsedSec:F2} seconds. Total request records generated: {Records.Count}\n");

        // Compute Metrics & Produce Artifacts
        var allRecords = Records.OrderBy(r => r.RequestSeq).ThenBy(r => r.RoundNumber).ToList();
        WriteRequestsCsv(Path.Combine(runDir, "requests.csv"), allRecords);

        var summary = BuildSummary(runId, overallStartTimeUtc, overallEndTimeUtc, overallElapsedSec, options, items, allRecords, roundInfos, wasInterrupted);
        var summaryJson = JsonSerializer.Serialize(summary, new JsonSerializerOptions { WriteIndented = true });
        File.WriteAllText(Path.Combine(runDir, "summary.json"), summaryJson);

        var metadata = BuildMetadata(runId, overallStartTimeUtc, overallEndTimeUtc, options, wasInterrupted);
        var metadataJson = JsonSerializer.Serialize(metadata, new JsonSerializerOptions { WriteIndented = true });
        File.WriteAllText(Path.Combine(runDir, "metadata.json"), metadataJson);

        // Display results in console
        PrintSummaryToConsole(summary, roundInfos);

        // Write client log
        File.WriteAllText(Path.Combine(runDir, "client.log"), ClientLog.ToString());
    }

    private static RequestWorkItem CreateWorkItem(LoadTestOptions opt, string runId, int seq, int userId)
    {
        var uniqueNum = $"{DateTime.UtcNow:HHmmss}_{seq:D4}";
        var email = opt.Scenario == "login"
            ? opt.Email
            : $"loadtest_{runId}_{uniqueNum}@example.invalid";
        var password = opt.Scenario == "login"
            ? opt.Password
            : $"LoadTestPass_{Guid.NewGuid():N}";
        var name = $"LoadTest User {seq}";

        return new RequestWorkItem
        {
            RequestSeq = seq,
            VirtualUserId = userId,
            Scenario = opt.Scenario,
            Name = name,
            Email = email,
            Password = password
        };
    }

    // ─── Scenario Execution Dispatcher ───────────────────────────
    private static async Task ExecuteWorkItemAsync(
        HttpClient client,
        LoadTestOptions opt,
        string runId,
        RequestWorkItem item,
        int roundNumber,
        CancellationToken ct)
    {
        item.AttemptCount++;

        switch (item.Scenario)
        {
            case "signup":
                await ExecuteSignupAsync(client, opt, runId, item, roundNumber, ct);
                break;
            case "login":
                await ExecuteLoginAsync(client, opt, runId, item, roundNumber, ct);
                break;
            case "both":
                if (!item.SignupSucceeded)
                {
                    var (signupOk, _, _) = await ExecuteSignupAsync(client, opt, runId, item, roundNumber, ct);
                    if (signupOk)
                    {
                        item.SignupSucceeded = true;
                        await ExecuteLoginAsync(client, opt, runId, item, roundNumber, ct);
                    }
                }
                else
                {
                    // Signup already succeeded in a prior round; retry only the failed login
                    await ExecuteLoginAsync(client, opt, runId, item, roundNumber, ct);
                }
                break;
            default:
                throw new ArgumentException($"Unsupported scenario: {item.Scenario}");
        }
    }

    // ─── Signup Request Execution ────────────────────────────────
    private static async Task<(bool Success, string Email, string Password)> ExecuteSignupAsync(
        HttpClient client,
        LoadTestOptions opt,
        string runId,
        RequestWorkItem item,
        int roundNumber,
        CancellationToken ct)
    {
        var payload = new SignupPayload
        {
            Name = item.Name,
            Email = item.Email,
            Password = item.Password,
            ConfirmPassword = item.Password
        };

        var record = new RequestRecord
        {
            RunId = runId,
            RequestSeq = item.RequestSeq,
            VirtualUserId = item.VirtualUserId,
            RoundNumber = roundNumber,
            AttemptNumber = item.AttemptCount,
            Scenario = opt.Scenario,
            Operation = "Signup",
            TimestampUtc = DateTime.UtcNow,
            Method = "POST",
            Endpoint = "/api/user/auth/signup/student"
        };

        if (roundNumber > 1 && item.InitialAttemptTimestampUtc.HasValue)
        {
            record.InitialAttemptTimestampUtc = item.InitialAttemptTimestampUtc;
            record.InitialAttemptDurationMs = item.InitialAttemptDurationMs;
            record.InitialStatusCode = item.InitialStatusCode;
            record.TimeWaitedBeforeRetryMs = Math.Round((record.TimestampUtc - item.InitialAttemptTimestampUtc.Value).TotalMilliseconds, 2);
        }

        var sw = Stopwatch.StartNew();
        try
        {
            using var response = await client.PostAsJsonAsync("/api/user/auth/signup/student", payload, ct);
            sw.Stop();
            record.DurationMs = Math.Round(sw.Elapsed.TotalMilliseconds, 2);
            record.StatusCode = (int)response.StatusCode;
            record.TraceId = ExtractTraceId(response);
            record.ResultCategory = ClassifyStatusCode(record.StatusCode);
            record.IsSuccess = response.IsSuccessStatusCode;
            record.IsTimeout = false;

            await response.Content.ReadAsStringAsync(ct);
        }
        catch (TaskCanceledException ex) when (ex.CancellationToken != ct || ex.InnerException is TimeoutException)
        {
            sw.Stop();
            record.DurationMs = Math.Round(sw.Elapsed.TotalMilliseconds, 2);
            record.StatusCode = 0;
            record.ResultCategory = "TIMEOUT";
            record.IsSuccess = false;
            record.IsTimeout = true;
            record.ExceptionType = "TaskCanceledException (Timeout)";
        }
        catch (HttpRequestException ex)
        {
            sw.Stop();
            record.DurationMs = Math.Round(sw.Elapsed.TotalMilliseconds, 2);
            record.StatusCode = (int?)ex.StatusCode ?? 0;
            record.ResultCategory = record.StatusCode > 0 ? ClassifyStatusCode(record.StatusCode) : "NETWORK_ERROR";
            record.IsSuccess = false;
            record.IsTimeout = false;
            record.ExceptionType = ex.GetType().Name;
        }
        catch (Exception ex)
        {
            sw.Stop();
            record.DurationMs = Math.Round(sw.Elapsed.TotalMilliseconds, 2);
            record.StatusCode = 0;
            record.ResultCategory = "NETWORK_ERROR";
            record.IsSuccess = false;
            record.IsTimeout = false;
            record.ExceptionType = ex.GetType().Name;
        }

        if (roundNumber == 1)
        {
            item.InitialAttemptTimestampUtc = record.TimestampUtc;
            item.InitialAttemptDurationMs = record.DurationMs;
            item.InitialStatusCode = record.StatusCode;
            record.InitialAttemptTimestampUtc = record.TimestampUtc;
            record.InitialAttemptDurationMs = record.DurationMs;
            record.InitialStatusCode = record.StatusCode;
            record.TimeWaitedBeforeRetryMs = 0;
            record.TotalElapsedFromFirstAttemptMs = record.DurationMs;
        }
        else if (item.InitialAttemptTimestampUtc.HasValue)
        {
            record.TotalElapsedFromFirstAttemptMs = Math.Round((DateTime.UtcNow - item.InitialAttemptTimestampUtc.Value).TotalMilliseconds, 2);
        }

        item.LastStatusCode = record.StatusCode;
        item.LastRecord = record;
        Records.Add(record);

        return (record.IsSuccess, item.Email, item.Password);
    }

    // ─── Login Request Execution ─────────────────────────────────
    private static async Task ExecuteLoginAsync(
        HttpClient client,
        LoadTestOptions opt,
        string runId,
        RequestWorkItem item,
        int roundNumber,
        CancellationToken ct)
    {
        var payload = new LoginPayload
        {
            Email = item.Email,
            Password = item.Password
        };

        var record = new RequestRecord
        {
            RunId = runId,
            RequestSeq = item.RequestSeq,
            VirtualUserId = item.VirtualUserId,
            RoundNumber = roundNumber,
            AttemptNumber = item.AttemptCount,
            Scenario = opt.Scenario,
            Operation = "Login",
            TimestampUtc = DateTime.UtcNow,
            Method = "POST",
            Endpoint = "/api/user/auth/login"
        };

        if (roundNumber > 1 && item.InitialAttemptTimestampUtc.HasValue)
        {
            record.InitialAttemptTimestampUtc = item.InitialAttemptTimestampUtc;
            record.InitialAttemptDurationMs = item.InitialAttemptDurationMs;
            record.InitialStatusCode = item.InitialStatusCode;
            record.TimeWaitedBeforeRetryMs = Math.Round((record.TimestampUtc - item.InitialAttemptTimestampUtc.Value).TotalMilliseconds, 2);
        }

        var sw = Stopwatch.StartNew();
        try
        {
            using var response = await client.PostAsJsonAsync("/api/user/auth/login", payload, ct);
            sw.Stop();
            record.DurationMs = Math.Round(sw.Elapsed.TotalMilliseconds, 2);
            record.StatusCode = (int)response.StatusCode;
            record.TraceId = ExtractTraceId(response);
            record.ResultCategory = ClassifyStatusCode(record.StatusCode);
            record.IsSuccess = response.IsSuccessStatusCode;
            record.IsTimeout = false;

            await response.Content.ReadAsStringAsync(ct);
        }
        catch (TaskCanceledException ex) when (ex.CancellationToken != ct || ex.InnerException is TimeoutException)
        {
            sw.Stop();
            record.DurationMs = Math.Round(sw.Elapsed.TotalMilliseconds, 2);
            record.StatusCode = 0;
            record.ResultCategory = "TIMEOUT";
            record.IsSuccess = false;
            record.IsTimeout = true;
            record.ExceptionType = "TaskCanceledException (Timeout)";
        }
        catch (HttpRequestException ex)
        {
            sw.Stop();
            record.DurationMs = Math.Round(sw.Elapsed.TotalMilliseconds, 2);
            record.StatusCode = (int?)ex.StatusCode ?? 0;
            record.ResultCategory = record.StatusCode > 0 ? ClassifyStatusCode(record.StatusCode) : "NETWORK_ERROR";
            record.IsSuccess = false;
            record.IsTimeout = false;
            record.ExceptionType = ex.GetType().Name;
        }
        catch (Exception ex)
        {
            sw.Stop();
            record.DurationMs = Math.Round(sw.Elapsed.TotalMilliseconds, 2);
            record.StatusCode = 0;
            record.ResultCategory = "NETWORK_ERROR";
            record.IsSuccess = false;
            record.IsTimeout = false;
            record.ExceptionType = ex.GetType().Name;
        }

        if (roundNumber == 1)
        {
            item.InitialAttemptTimestampUtc = record.TimestampUtc;
            item.InitialAttemptDurationMs = record.DurationMs;
            item.InitialStatusCode = record.StatusCode;
            record.InitialAttemptTimestampUtc = record.TimestampUtc;
            record.InitialAttemptDurationMs = record.DurationMs;
            record.InitialStatusCode = record.StatusCode;
            record.TimeWaitedBeforeRetryMs = 0;
            record.TotalElapsedFromFirstAttemptMs = record.DurationMs;
        }
        else if (item.InitialAttemptTimestampUtc.HasValue)
        {
            record.TotalElapsedFromFirstAttemptMs = Math.Round((DateTime.UtcNow - item.InitialAttemptTimestampUtc.Value).TotalMilliseconds, 2);
        }

        item.LastStatusCode = record.StatusCode;
        item.LastRecord = record;
        Records.Add(record);
    }

    // ─── Helpers ─────────────────────────────────────────────────
    private static string ClassifyStatusCode(int statusCode)
    {
        return statusCode switch
        {
            >= 200 and <= 299 => "SUCCESS",
            400 => "BAD_REQUEST",
            401 => "UNAUTHORIZED",
            403 => "FORBIDDEN",
            404 => "NOT_FOUND",
            429 => "RATE_LIMITED",
            >= 500 and <= 599 => "SERVER_ERROR",
            >= 400 and <= 499 => "OTHER_HTTP_ERROR",
            _ => "OTHER_HTTP_ERROR"
        };
    }

    private static string ExtractTraceId(HttpResponseMessage response)
    {
        if (response.Headers.TryGetValues("X-Trace-Id", out var traceVals))
            return traceVals.FirstOrDefault() ?? "none";
        if (response.Headers.TryGetValues("TraceIdentifier", out var idVals))
            return idVals.FirstOrDefault() ?? "none";
        if (response.Headers.TryGetValues("traceparent", out var parentVals))
            return parentVals.FirstOrDefault() ?? "none";
        return "none";
    }

    private static void LogBoth(string message)
    {
        Console.WriteLine(message);
        ClientLog.AppendLine($"[{DateTime.UtcNow:yyyy-MM-dd HH:mm:ss.fff}] {message}");
    }

    // ─── Percentile Calculation (Nearest-Rank Method) ────────────
    public static LatencyMetrics CalculateLatency(List<double> latencies)
    {
        if (latencies.Count == 0)
            return new LatencyMetrics();

        var sorted = latencies.OrderBy(x => x).ToList();
        var n = sorted.Count;

        double GetPercentile(double p)
        {
            int idx = (int)Math.Ceiling((p / 100.0) * n) - 1;
            return sorted[Math.Clamp(idx, 0, n - 1)];
        }

        return new LatencyMetrics
        {
            MinMs = Math.Round(sorted.First(), 2),
            MaxMs = Math.Round(sorted.Last(), 2),
            AverageMs = Math.Round(sorted.Average(), 2),
            P50Ms = Math.Round(GetPercentile(50), 2),
            P90Ms = Math.Round(GetPercentile(90), 2),
            P95Ms = Math.Round(GetPercentile(95), 2),
            P99Ms = Math.Round(GetPercentile(99), 2)
        };
    }

    // ─── Metrics Generation ──────────────────────────────────────
    private static MetricsBlock ComputeMetricsBlock(List<RequestRecord> records, double elapsedSec)
    {
        int total = records.Count;
        int success = records.Count(r => r.IsSuccess);
        int sc200 = records.Count(r => r.StatusCode == 200);
        int sc400 = records.Count(r => r.StatusCode == 400);
        int sc401 = records.Count(r => r.StatusCode == 401);
        int sc429 = records.Count(r => r.StatusCode == 429);
        int sc500 = records.Count(r => r.StatusCode is >= 500 and <= 599);
        int scOther4xx = records.Count(r => r.StatusCode is >= 400 and <= 499 && r.StatusCode != 400 && r.StatusCode != 401 && r.StatusCode != 429);
        int scOther5xx = records.Count(r => r.StatusCode is >= 500 and <= 599 && r.StatusCode != 500);
        int timeouts = records.Count(r => r.IsTimeout);
        int networkErrors = records.Count(r => r.ResultCategory == "NETWORK_ERROR");

        var latencies = records.Select(r => r.DurationMs).ToList();
        var latencyMetrics = CalculateLatency(latencies);

        return new MetricsBlock
        {
            TotalRequests = total,
            SuccessfulRequests = success,
            StatusCounts = new StatusCounts
            {
                Count200 = sc200,
                Count400 = sc400,
                Count401 = sc401,
                Count429 = sc429,
                Count500 = sc500,
                Other4xx = scOther4xx,
                Other5xx = scOther5xx
            },
            FailureCounts = new FailureCounts
            {
                Timeout = timeouts,
                NetworkError = networkErrors,
                Other = records.Count(r => !r.IsSuccess && !r.IsTimeout && r.ResultCategory != "NETWORK_ERROR")
            },
            Latency = latencyMetrics,
            Throughput = new ThroughputMetrics
            {
                RequestsPerSecond = elapsedSec > 0 ? Math.Round(total / elapsedSec, 2) : 0
            },
            Percentages = new PercentageMetrics
            {
                SuccessPercent = total > 0 ? Math.Round((double)success / total * 100, 2) : 0,
                FailurePercent = total > 0 ? Math.Round((double)(total - success) / total * 100, 2) : 0,
                RateLimitedPercent = total > 0 ? Math.Round((double)sc429 / total * 100, 2) : 0,
                ServerErrorPercent = total > 0 ? Math.Round((double)sc500 / total * 100, 2) : 0,
                TimeoutPercent = total > 0 ? Math.Round((double)timeouts / total * 100, 2) : 0
            }
        };
    }

    private static SummaryReport BuildSummary(
        string runId,
        DateTime startUtc,
        DateTime endUtc,
        double elapsedSec,
        LoadTestOptions opt,
        List<RequestWorkItem> items,
        List<RequestRecord> allRecords,
        List<RoundExecutionInfo> roundInfos,
        bool wasInterrupted)
    {
        // Round 1 (Initial baseline)
        var round1Records = allRecords.Where(r => r.RoundNumber == 1).ToList();
        var initialBlock = ComputeMetricsBlock(round1Records, roundInfos.FirstOrDefault()?.DurationSeconds ?? elapsedSec);

        // Final status per item (or all records if duration mode)
        var finalRecords = items.Count > 0
            ? items.Select(i => i.LastRecord).Where(r => r != null).Select(r => r!).ToList()
            : allRecords;
        var finalBlock = ComputeMetricsBlock(finalRecords, elapsedSec);

        // Sub-metrics
        MetricsBlock? signupBlock = null;
        MetricsBlock? loginBlock = null;
        if (opt.Scenario == "both")
        {
            var signupRecords = finalRecords.Where(r => r.Operation == "Signup").ToList();
            var loginRecords = finalRecords.Where(r => r.Operation == "Login").ToList();
            signupBlock = ComputeMetricsBlock(signupRecords, elapsedSec);
            loginBlock = ComputeMetricsBlock(loginRecords, elapsedSec);
        }

        // Retry stats (if items were tracked)
        RetryStatsSummary? retryStats = null;
        if (items.Count > 0)
        {
            int initSuccess = items.Count(i => i.InitialStatusCode == 200);
            int init500 = items.Count(i => i.InitialStatusCode == 500);
            int recovered = items.Count(i => i.InitialStatusCode == 500 && i.LastStatusCode == 200);
            int finalSuccess = items.Count(i => i.LastStatusCode == 200);
            int rem500 = items.Count(i => i.LastStatusCode == 500);
            int finalFailures = items.Count(i => i.LastStatusCode != 200);
            int retryAttempts = allRecords.Count(r => r.RoundNumber > 1);

            retryStats = new RetryStatsSummary
            {
                InitialSuccesses = initSuccess,
                RecoveredSuccesses = recovered,
                FinalSuccesses = finalSuccess,
                FinalFailures = finalFailures,
                InitialHttp500 = init500,
                RecoveredFrom500 = recovered,
                RemainingHttp500 = rem500,
                TotalRetryAttempts = retryAttempts,
                InitialSuccessPercent = items.Count > 0 ? Math.Round((double)initSuccess / items.Count * 100, 2) : 0,
                FinalSuccessPercent = items.Count > 0 ? Math.Round((double)finalSuccess / items.Count * 100, 2) : 0
            };
        }

        return new SummaryReport
        {
            RunId = runId,
            StartTimeUtc = startUtc,
            EndTimeUtc = endUtc,
            TargetBaseUrl = opt.TargetBaseUrl,
            Scenario = opt.Scenario,
            VirtualUsers = opt.VirtualUsers,
            TotalRequests = allRecords.Count,
            WasInterrupted = wasInterrupted,
            Initial = initialBlock,
            Final = finalBlock,
            Rounds = roundInfos,
            RetryStats = retryStats,
            SignupMetrics = signupBlock,
            LoginMetrics = loginBlock
        };
    }

    private static MetadataReport BuildMetadata(
        string runId,
        DateTime startUtc,
        DateTime endUtc,
        LoadTestOptions opt,
        bool wasInterrupted)
    {
        return new MetadataReport
        {
            RunId = runId,
            MachineName = Environment.MachineName,
            OperatingSystem = RuntimeInformation.OSDescription,
            DotNetVersion = Environment.Version.ToString(),
            TargetUrl = opt.TargetBaseUrl,
            Scenario = opt.Scenario,
            VirtualUsers = opt.VirtualUsers,
            ConfiguredTimeoutSeconds = opt.TimeoutSeconds,
            RetryRounds = opt.RetryRounds,
            RetryDelaySeconds = opt.RetryDelaySeconds,
            StartTimeUtc = startUtc,
            EndTimeUtc = endUtc,
            WasInterrupted = wasInterrupted,
            PercentileCalculationMethod = "Nearest-Rank: ceil((P / 100) * N) - 1, clamped [0, N-1]"
        };
    }

    // ─── CSV Writer ──────────────────────────────────────────────
    private static void WriteRequestsCsv(string filePath, List<RequestRecord> records)
    {
        var sb = new StringBuilder();
        sb.AppendLine("RunId,RequestSeq,VirtualUserId,RoundNumber,AttemptNumber,Scenario,Operation,TimestampUtc,Method,Endpoint,StatusCode,DurationMs,ResultCategory,IsSuccess,IsTimeout,ExceptionType,TraceId,InitialAttemptTimestampUtc,InitialAttemptDurationMs,InitialStatusCode,TimeWaitedBeforeRetryMs,TotalElapsedFromFirstAttemptMs");

        foreach (var r in records)
        {
            sb.AppendLine(string.Join(",",
                EscapeCsv(r.RunId),
                r.RequestSeq,
                r.VirtualUserId,
                r.RoundNumber,
                r.AttemptNumber,
                EscapeCsv(r.Scenario),
                EscapeCsv(r.Operation),
                r.TimestampUtc.ToString("o", CultureInfo.InvariantCulture),
                EscapeCsv(r.Method),
                EscapeCsv(r.Endpoint),
                r.StatusCode,
                r.DurationMs.ToString("F2", CultureInfo.InvariantCulture),
                EscapeCsv(r.ResultCategory),
                r.IsSuccess,
                r.IsTimeout,
                EscapeCsv(r.ExceptionType),
                EscapeCsv(r.TraceId),
                r.InitialAttemptTimestampUtc?.ToString("o", CultureInfo.InvariantCulture) ?? string.Empty,
                r.InitialAttemptDurationMs?.ToString("F2", CultureInfo.InvariantCulture) ?? string.Empty,
                r.InitialStatusCode?.ToString() ?? string.Empty,
                r.TimeWaitedBeforeRetryMs?.ToString("F2", CultureInfo.InvariantCulture) ?? string.Empty,
                r.TotalElapsedFromFirstAttemptMs?.ToString("F2", CultureInfo.InvariantCulture) ?? string.Empty
            ));
        }

        File.WriteAllText(filePath, sb.ToString());
    }

    private static string EscapeCsv(string val)
    {
        if (val.Contains(',') || val.Contains('\"') || val.Contains('\n'))
            return $"\"{val.Replace("\"", "\"\"")}\"";
        return val;
    }

    // ─── Console Presentation ────────────────────────────────────
    private static void PrintSummaryToConsole(SummaryReport s, List<RoundExecutionInfo> rounds)
    {
        LogBoth("=================================================================");
        LogBoth("                     AUTH LOAD TEST SUMMARY                      ");
        LogBoth("=================================================================");
        LogBoth($"Run ID:                {s.RunId}");
        LogBoth($"Target URL:            {s.TargetBaseUrl}");
        LogBoth($"Concurrent Users:      {s.VirtualUsers}");
        LogBoth($"Scenario:              {s.Scenario.ToUpperInvariant()}");
        LogBoth($"Total Records:         {s.TotalRequests}");

        // Round-by-Round Breakdown
        foreach (var r in rounds)
        {
            LogBoth($"\nROUND {r.RoundNumber}");
            LogBoth("----------------------------------");
            LogBoth($"Requests Executed:     {r.TotalRequests}");
            LogBoth($"HTTP 200 OK:           {r.Count200}");
            LogBoth($"HTTP 500 Error:        {r.Count500}");
            LogBoth($"HTTP 429 Rate Limited: {r.Count429}");
            LogBoth($"Round Duration:        {r.DurationSeconds:F2}s");
            if (r.DelayBeforeThisRoundSeconds > 0)
                LogBoth($"Delay Before Round:    {r.DelayBeforeThisRoundSeconds:F2}s");
        }

        // Final Retry Outcomes
        if (s.RetryStats != null && rounds.Count > 1)
        {
            LogBoth("\nFINAL RETRY OUTCOME");
            LogBoth("----------------------------------");
            LogBoth($"Initial Successes:     {s.RetryStats.InitialSuccesses} ({s.RetryStats.InitialSuccessPercent}%)");
            LogBoth($"Recovered Successes:   {s.RetryStats.RecoveredSuccesses}");
            LogBoth($"Final Successes:       {s.RetryStats.FinalSuccesses} ({s.RetryStats.FinalSuccessPercent}%)");
            LogBoth($"Final Failures:        {s.RetryStats.FinalFailures}");
            LogBoth($"Initial HTTP 500:      {s.RetryStats.InitialHttp500}");
            LogBoth($"Recovered from 500:    {s.RetryStats.RecoveredFrom500}");
            LogBoth($"Remaining HTTP 500:    {s.RetryStats.RemainingHttp500}");
            LogBoth($"Total Retry Attempts:  {s.RetryStats.TotalRetryAttempts}");
        }

        // Latency Comparisons
        LogBoth("\nLATENCY DISTRIBUTION (Round-Trip):");
        LogBoth("----------------------------------");
        LogBoth($"Initial Avg:           {s.Initial.Latency.AverageMs:F2} ms | Final Avg:  {s.Final.Latency.AverageMs:F2} ms");
        LogBoth($"Initial P50:           {s.Initial.Latency.P50Ms:F2} ms | Final P50:  {s.Final.Latency.P50Ms:F2} ms");
        LogBoth($"Initial P90:           {s.Initial.Latency.P90Ms:F2} ms | Final P90:  {s.Final.Latency.P90Ms:F2} ms");
        LogBoth($"Initial P95:           {s.Initial.Latency.P95Ms:F2} ms | Final P95:  {s.Final.Latency.P95Ms:F2} ms");
        LogBoth($"Initial P99:           {s.Initial.Latency.P99Ms:F2} ms | Final P99:  {s.Final.Latency.P99Ms:F2} ms");
        LogBoth($"Initial Max:           {s.Initial.Latency.MaxMs:F2} ms | Final Max:  {s.Final.Latency.MaxMs:F2} ms");

        if (s.SignupMetrics != null && s.LoginMetrics != null)
        {
            LogBoth("\n--- Signup Sub-Metrics ---");
            LogBoth($"Total: {s.SignupMetrics.TotalRequests} | Success: {s.SignupMetrics.SuccessfulRequests} | 429: {s.SignupMetrics.StatusCounts.Count429} | P50: {s.SignupMetrics.Latency.P50Ms:F2}ms | P95: {s.SignupMetrics.Latency.P95Ms:F2}ms");

            LogBoth("--- Login Sub-Metrics ---");
            LogBoth($"Total: {s.LoginMetrics.TotalRequests} | Success: {s.LoginMetrics.SuccessfulRequests} | 429: {s.LoginMetrics.StatusCounts.Count429} | P50: {s.LoginMetrics.Latency.P50Ms:F2}ms | P95: {s.LoginMetrics.Latency.P95Ms:F2}ms");
        }

        LogBoth("=================================================================\n");
    }
}

// ─── Data Structures for Serialization ───────────────────────
public class SummaryReport
{
    public string RunId { get; set; } = string.Empty;
    public DateTime StartTimeUtc { get; set; }
    public DateTime EndTimeUtc { get; set; }
    public string TargetBaseUrl { get; set; } = string.Empty;
    public string Scenario { get; set; } = string.Empty;
    public int VirtualUsers { get; set; }
    public int TotalRequests { get; set; }
    public bool WasInterrupted { get; set; }
    public MetricsBlock Initial { get; set; } = new();
    public MetricsBlock Final { get; set; } = new();
    public List<RoundExecutionInfo> Rounds { get; set; } = new();
    public RetryStatsSummary? RetryStats { get; set; }
    public MetricsBlock? SignupMetrics { get; set; }
    public MetricsBlock? LoginMetrics { get; set; }
}

public class MetricsBlock
{
    public int TotalRequests { get; set; }
    public int SuccessfulRequests { get; set; }
    public StatusCounts StatusCounts { get; set; } = new();
    public FailureCounts FailureCounts { get; set; } = new();
    public LatencyMetrics Latency { get; set; } = new();
    public ThroughputMetrics Throughput { get; set; } = new();
    public PercentageMetrics Percentages { get; set; } = new();
}

public class StatusCounts
{
    public int Count200 { get; set; }
    public int Count400 { get; set; }
    public int Count401 { get; set; }
    public int Count429 { get; set; }
    public int Count500 { get; set; }
    public int Other4xx { get; set; }
    public int Other5xx { get; set; }
}

public class FailureCounts
{
    public int Timeout { get; set; }
    public int NetworkError { get; set; }
    public int Other { get; set; }
}

public class LatencyMetrics
{
    public double MinMs { get; set; }
    public double AverageMs { get; set; }
    public double P50Ms { get; set; }
    public double P90Ms { get; set; }
    public double P95Ms { get; set; }
    public double P99Ms { get; set; }
    public double MaxMs { get; set; }
}

public class ThroughputMetrics
{
    public double RequestsPerSecond { get; set; }
}

public class PercentageMetrics
{
    public double SuccessPercent { get; set; }
    public double FailurePercent { get; set; }
    public double RateLimitedPercent { get; set; }
    public double ServerErrorPercent { get; set; }
    public double TimeoutPercent { get; set; }
}

public class MetadataReport
{
    public string RunId { get; set; } = string.Empty;
    public string MachineName { get; set; } = string.Empty;
    public string OperatingSystem { get; set; } = string.Empty;
    public string DotNetVersion { get; set; } = string.Empty;
    public string TargetUrl { get; set; } = string.Empty;
    public string Scenario { get; set; } = string.Empty;
    public int VirtualUsers { get; set; }
    public int ConfiguredTimeoutSeconds { get; set; }
    public int RetryRounds { get; set; }
    public int RetryDelaySeconds { get; set; }
    public DateTime StartTimeUtc { get; set; }
    public DateTime EndTimeUtc { get; set; }
    public bool WasInterrupted { get; set; }
    public string PercentileCalculationMethod { get; set; } = string.Empty;
}
