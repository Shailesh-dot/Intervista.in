using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;
using Knitnet.Shared.Settings;
using Knitnet.UserApi.Data;
using Knitnet.UserApi.Services;

var builder = WebApplication.CreateBuilder(args);

// ─── Database ────────────────────────────────────────────────
builder.Services.AddDbContext<UserDbContext>(o =>
    o.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// ─── Settings ────────────────────────────────────────────────
builder.Services.Configure<JwtSettings>(builder.Configuration.GetSection("JwtSettings"));
builder.Services.Configure<SupabaseSettings>(builder.Configuration.GetSection("SupabaseSettings"));
builder.Services.Configure<VerificationSettings>(builder.Configuration.GetSection("VerificationSettings"));

// ─── JWT Auth ────────────────────────────────────────────────
var jwt = builder.Configuration.GetSection("JwtSettings").Get<JwtSettings>()!;
if (string.IsNullOrWhiteSpace(jwt.SecretKey) ||
    jwt.SecretKey == "CHANGE_ME_MIN_32_CHARS_LONG_SECRET_KEY" ||
    jwt.SecretKey.Length < 32)
    throw new InvalidOperationException(
        "JWT SecretKey is missing, too short, or still set to the placeholder. " +
        "Set a real secret via user-secrets or environment variable.");
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o => o.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true, ValidateAudience = true,
        ValidateLifetime = true, ValidateIssuerSigningKey = true,
        ValidIssuer = jwt.Issuer, ValidAudience = jwt.Audience,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.SecretKey)),
        ClockSkew = TimeSpan.FromSeconds(30)
    });
builder.Services.AddAuthorization();

// ─── Services ────────────────────────────────────────────────
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IProfileService, ProfileService>();
builder.Services.AddScoped<IVerificationService, VerificationService>();
builder.Services.AddScoped<IStorageService, SupabaseStorageService>();
builder.Services.AddScoped<IStudentResultService, StudentResultService>();
builder.Services.AddScoped<ISnapshotService, SnapshotService>();
// Shared services (FIX 1 & FIX 2)
builder.Services.AddScoped<Knitnet.Shared.Services.ICompanyProvisionService, Knitnet.Shared.Services.CompanyProvisionService>();
builder.Services.AddScoped<Knitnet.Shared.Services.IJwtTokenService, Knitnet.Shared.Services.JwtTokenService>();
// Background jobs (FIX 4)
builder.Services.AddHostedService<SnapshotCleanupService>();
builder.Services.AddHttpClient("Supabase");

// ─── CORS ────────────────────────────────────────────────────
var frontendUrls = Environment.GetEnvironmentVariable("FRONTEND_URL") ?? "http://localhost:5173";
var allowedOrigins = frontendUrls.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
builder.Services.AddCors(o => o.AddPolicy("AllowFrontend", p =>
    p.WithOrigins(allowedOrigins).AllowAnyHeader().AllowAnyMethod()));

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// ─── Forwarded Headers (Nginx → real client IP) ─────────────
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    // Clear defaults so Docker-internal Nginx IP is trusted as a proxy
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});

// ─── Rate Limiting ───────────────────────────────────────────
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    options.OnRejected = (context, cancellationToken) =>
    {
        var httpContext = context.HttpContext;
        var traceId = httpContext.TraceIdentifier;
        var method = httpContext.Request.Method;
        var path = httpContext.Request.Path.Value ?? string.Empty;
        var clientIp = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        var logger = httpContext.RequestServices.GetRequiredService<ILoggerFactory>().CreateLogger("RateLimiting");

        logger.LogWarning("[RATE_LIMIT_REJECTED] TraceId={TraceId} Method={Method} Path={Path} ClientIp={ClientIp} StatusCode=429",
            traceId, method, path, clientIp);

        return ValueTask.CompletedTask;
    };

    // LOGIN: 300 requests/minute per client IP
    options.AddPolicy("login", context =>
    {
        var clientIp = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        return RateLimitPartition.GetFixedWindowLimiter(
            clientIp,
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 300,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            });
    });

    // SIGNUP: 300 requests/minute per client IP
    options.AddPolicy("signup", context =>
    {
        var clientIp = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        return RateLimitPartition.GetFixedWindowLimiter(
            clientIp,
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 300,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            });
    });

    // PASSWORD RESET: 100 requests/10 minutes per client IP
    options.AddPolicy("password-reset", context =>
    {
        var clientIp = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        return RateLimitPartition.GetFixedWindowLimiter(
            clientIp,
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 100,
                Window = TimeSpan.FromMinutes(10),
                QueueLimit = 0
            });
    });

    // STANDARD: 60 requests/minute — for general endpoints (UNCHANGED)
    options.AddFixedWindowLimiter("standard", limiterOptions =>
    {
        limiterOptions.PermitLimit = 60;
        limiterOptions.Window = TimeSpan.FromMinutes(1);
        limiterOptions.QueueLimit = 0;
    });
});

var app = builder.Build();
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// MUST be first — reads X-Forwarded-For so rate limiter sees real client IP, not Nginx IP
app.UseForwardedHeaders();

// ─── Request Timing & Exception Middleware ───────────────────
app.Use(async (context, next) =>
{
    var sw = System.Diagnostics.Stopwatch.StartNew();
    try
    {
        await next();
    }
    catch (Exception ex)
    {
        var logger = context.RequestServices.GetRequiredService<ILoggerFactory>().CreateLogger("RequestTiming");
        logger.LogError(ex, "[ERROR] Method={Method} Path={Path} ExceptionType={ExceptionType} Message={Message} TraceId={TraceId}",
            context.Request.Method, context.Request.Path.Value ?? string.Empty, ex.GetType().Name, ex.Message, context.TraceIdentifier);
        throw;
    }
    finally
    {
        sw.Stop();
        var durationMs = sw.Elapsed.TotalMilliseconds;
        var traceId = context.TraceIdentifier;
        var method = context.Request.Method;
        var path = context.Request.Path.Value ?? string.Empty;
        var statusCode = context.Response.StatusCode;
        var clientIp = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        var logger = context.RequestServices.GetRequiredService<ILoggerFactory>().CreateLogger("RequestTiming");

        logger.LogInformation("[REQUEST] TraceId={TraceId} Method={Method} Path={Path} StatusCode={StatusCode} DurationMs={DurationMs:F2} ClientIp={ClientIp}",
            traceId, method, path, statusCode, durationMs, clientIp);
    }
});

app.UseRouting();

app.UseCors("AllowFrontend");
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.Run();
