using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using System.Diagnostics;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Knitnet.Shared.Models;
using Knitnet.Shared.Settings;
using Knitnet.Shared.Services;
using Knitnet.UserApi.Data;
using Knitnet.UserApi.DTOs;

namespace Knitnet.UserApi.Services;

// ─── Interface ───────────────────────────────────────────────
public interface IAuthService
{
    Task<string> SignupStudentAsync(SignupDto dto);
    Task<string> SignupCompanyAsync(SignupDto dto);
    Task<LoginResponseDto> LoginAsync(LoginDto dto);
    Task<string> RequestPasswordResetAsync(ForgotPasswordDto dto);
    Task<string> ResetPasswordAsync(ResetPasswordDto dto);
    Task<object?> GetProfileByEmailAsync(string email);
}

// ─── Implementation ──────────────────────────────────────────
/// <summary>
/// FIX 1 APPLIED: Company creation now delegates to CompanyProvisionService.
/// No more direct EF insert into Companies table from AuthService.
/// PHASE 1 APPLIED: Password reset now requires a secure email token.
/// </summary>
public class AuthService : IAuthService
{
    private readonly UserDbContext _db;
    private readonly JwtSettings _jwt;
    private readonly IJwtTokenService _tokenService;
    private readonly ICompanyProvisionService _companyProvisioner;
    private readonly ILogger<AuthService> _logger;

    public AuthService(
        UserDbContext db,
        IOptions<JwtSettings> jwt,
        IJwtTokenService tokenService,
        ICompanyProvisionService companyProvisioner,
        ILogger<AuthService> logger)
    {
        _db = db;
        _jwt = jwt.Value;
        _tokenService = tokenService;
        _companyProvisioner = companyProvisioner;
        _logger = logger;
    }

    public async Task<string> SignupStudentAsync(SignupDto dto)
    {
        var totalSw = Stopwatch.StartNew();
        _logger.LogInformation("[AUTH] Operation=Signup Stage=Start");

        if (dto.Password != dto.ConfirmPassword)
            throw new ArgumentException("Passwords do not match");

        var dbCheckSw = Stopwatch.StartNew();
        var emailExists = await _db.Users.AnyAsync(u => u.Email == dto.Email);
        dbCheckSw.Stop();
        _logger.LogInformation("[DATABASE] Operation=DuplicateEmailCheck DurationMs={DurationMs:F2}", dbCheckSw.Elapsed.TotalMilliseconds);

        if (emailExists)
            throw new ArgumentException("Email already registered");

        var hashSw = Stopwatch.StartNew();
        var hashedPassword = BCrypt.Net.BCrypt.HashPassword(dto.Password);
        hashSw.Stop();
        _logger.LogInformation("[BCrypt] Operation=Hash DurationMs={DurationMs:F2}", hashSw.Elapsed.TotalMilliseconds);

        var user = new User
        {
            Name = dto.Name,
            Email = dto.Email,
            Password = hashedPassword,
            Role = "student"
        };
        _db.Users.Add(user);

        var dbInsertSw = Stopwatch.StartNew();
        await _db.SaveChangesAsync();
        dbInsertSw.Stop();
        _logger.LogInformation("[DATABASE] Operation=UserInsert DurationMs={DurationMs:F2}", dbInsertSw.Elapsed.TotalMilliseconds);

        totalSw.Stop();
        _logger.LogInformation("[AUTH] Operation=Signup Stage=Completed DurationMs={DurationMs:F2} UserId={UserId}", totalSw.Elapsed.TotalMilliseconds, user.Id);

        return "Student account created";
    }

    public async Task<string> SignupCompanyAsync(SignupDto dto)
    {
        var totalSw = Stopwatch.StartNew();
        _logger.LogInformation("[AUTH] Operation=CompanySignup Stage=Start");

        if (dto.Password != dto.ConfirmPassword)
            throw new ArgumentException("Passwords do not match");

        var dbCheckSw = Stopwatch.StartNew();
        var emailExists = await _db.Users.AnyAsync(u => u.Email == dto.Email);
        dbCheckSw.Stop();
        _logger.LogInformation("[DATABASE] Operation=DuplicateEmailCheck DurationMs={DurationMs:F2}", dbCheckSw.Elapsed.TotalMilliseconds);

        if (emailExists)
            throw new ArgumentException("Email already registered");

        var hashSw = Stopwatch.StartNew();
        var hashedPassword = BCrypt.Net.BCrypt.HashPassword(dto.Password);
        hashSw.Stop();
        _logger.LogInformation("[BCrypt] Operation=Hash DurationMs={DurationMs:F2}", hashSw.Elapsed.TotalMilliseconds);

        var user = new User
        {
            Name = dto.Name,
            Email = dto.Email,
            Password = hashedPassword,
            Role = "company"
        };
        _db.Users.Add(user);

        var dbInsertSw = Stopwatch.StartNew();
        await _db.SaveChangesAsync();
        dbInsertSw.Stop();
        _logger.LogInformation("[DATABASE] Operation=UserInsert DurationMs={DurationMs:F2}", dbInsertSw.Elapsed.TotalMilliseconds);

        // FIX 1: Delegate to shared CompanyProvisionService
        // This is the ONLY path for company creation — no duplicate logic
        await _companyProvisioner.ProvisionCompanyAsync(
            _db,
            user.Id,
            dto.CompanyName ?? dto.Name,
            dto.ContactNo ?? string.Empty);

        totalSw.Stop();
        _logger.LogInformation("[AUTH] Operation=CompanySignup Stage=Completed DurationMs={DurationMs:F2} UserId={UserId}", totalSw.Elapsed.TotalMilliseconds, user.Id);

        return "Company account created";
    }

    public async Task<LoginResponseDto> LoginAsync(LoginDto dto)
    {
        var totalSw = Stopwatch.StartNew();
        _logger.LogInformation("[AUTH] Operation=Login Stage=Start");

        var dbUserSw = Stopwatch.StartNew();
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);
        dbUserSw.Stop();
        _logger.LogInformation("[DATABASE] Operation=UserLookup DurationMs={DurationMs:F2}", dbUserSw.Elapsed.TotalMilliseconds);

        if (user == null)
            throw new UnauthorizedAccessException("Invalid credentials");

        var verifySw = Stopwatch.StartNew();
        var isPasswordValid = BCrypt.Net.BCrypt.Verify(dto.Password, user.Password);
        verifySw.Stop();
        _logger.LogInformation("[BCrypt] Operation=Verify DurationMs={DurationMs:F2}", verifySw.Elapsed.TotalMilliseconds);

        if (!isPasswordValid)
            throw new UnauthorizedAccessException("Invalid credentials");

        Guid? companyId = null;
        if (user.Role == "company")
        {
            var dbCompanySw = Stopwatch.StartNew();
            var company = await _db.Companies.FirstOrDefaultAsync(c => c.UserId == user.Id);
            dbCompanySw.Stop();
            companyId = company?.Uid;
            _logger.LogInformation("[DATABASE] Operation=CompanyLookup DurationMs={DurationMs:F2}", dbCompanySw.Elapsed.TotalMilliseconds);
        }

        var jwtSw = Stopwatch.StartNew();
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Email, user.Email),
            new(ClaimTypes.Role, user.Role)
        };
        if (companyId.HasValue)
            claims.Add(new("companyId", companyId.Value.ToString()));

        var token = _tokenService.GenerateToken(claims, _jwt);
        jwtSw.Stop();
        _logger.LogInformation("[AUTH] Operation=Login Stage=JwtGeneration DurationMs={DurationMs:F2}", jwtSw.Elapsed.TotalMilliseconds);

        totalSw.Stop();
        _logger.LogInformation("[AUTH] Operation=Login Stage=Completed DurationMs={DurationMs:F2} UserId={UserId}", totalSw.Elapsed.TotalMilliseconds, user.Id);

        return new LoginResponseDto
        {
            Token = token,
            Role = user.Role,
            UserId = user.Id,
            CompanyId = companyId
        };
    }

    // ─── PHASE 1: Step 1 — Request a password reset ──────────
    /// <summary>
    /// Generates a secure one-time token, stores its SHA-256 hash in DB,
    /// and returns the raw token so the caller (controller) can email it.
    /// Always returns the same message regardless of whether the email exists
    /// to prevent account enumeration attacks.
    /// </summary>
    public async Task<string> RequestPasswordResetAsync(ForgotPasswordDto dto)
    {
        var dbUserSw = Stopwatch.StartNew();
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);
        dbUserSw.Stop();
        _logger.LogInformation("[DATABASE] Operation=UserLookup DurationMs={DurationMs:F2}", dbUserSw.Elapsed.TotalMilliseconds);

        // ⚠️ Anti-enumeration: always return success even if email not found
        if (user == null)
            return "If an account with that email exists, a reset link has been sent.";

        // Invalidate any existing unused tokens for this user
        var oldTokens = await _db.PasswordResetTokens
            .Where(t => t.UserId == user.Id && t.UsedAtUtc == null)
            .ToListAsync();
        _db.PasswordResetTokens.RemoveRange(oldTokens);

        // Generate a cryptographically secure random token
        var rawToken = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32))
            .Replace("+", "-").Replace("/", "_").Replace("=", ""); // URL-safe

        // Store only the SHA-256 hash — never the raw token
        var tokenHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(rawToken)));

        _db.PasswordResetTokens.Add(new PasswordResetToken
        {
            UserId = user.Id,
            TokenHash = tokenHash,
            ExpiresAtUtc = DateTime.UtcNow.AddMinutes(20),
        });
        
        var dbSaveSw = Stopwatch.StartNew();
        await _db.SaveChangesAsync();
        dbSaveSw.Stop();
        _logger.LogInformation("[DATABASE] Operation=PasswordResetTokenSave DurationMs={DurationMs:F2}", dbSaveSw.Elapsed.TotalMilliseconds);

        // Return raw token to controller which will embed it in the email link
        return rawToken;
    }

    // ─── PHASE 1: Step 2 — Verify token and reset password ───
    public async Task<string> ResetPasswordAsync(ResetPasswordDto dto)
    {
        var totalSw = Stopwatch.StartNew();
        _logger.LogInformation("[AUTH] Operation=ResetPassword Stage=Start");

        if (dto.NewPassword != dto.ConfirmPassword)
            throw new ArgumentException("Passwords do not match");

        if (string.IsNullOrWhiteSpace(dto.Token))
            throw new ArgumentException("Reset token is required");

        // Hash the submitted token to compare against DB
        var tokenHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(dto.Token)));

        var dbTokenSw = Stopwatch.StartNew();
        var resetToken = await _db.PasswordResetTokens
            .Include(t => t.User)
            .FirstOrDefaultAsync(t =>
                t.TokenHash == tokenHash &&
                t.UsedAtUtc == null &&
                t.ExpiresAtUtc > DateTime.UtcNow);
        dbTokenSw.Stop();
        _logger.LogInformation("[DATABASE] Operation=ResetTokenLookup DurationMs={DurationMs:F2}", dbTokenSw.Elapsed.TotalMilliseconds);

        if (resetToken == null)
            throw new ArgumentException("Reset link is invalid, expired, or already used.");

        // Reset the password
        var hashSw = Stopwatch.StartNew();
        var hashedPassword = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
        hashSw.Stop();
        _logger.LogInformation("[BCrypt] Operation=Hash DurationMs={DurationMs:F2}", hashSw.Elapsed.TotalMilliseconds);

        resetToken.User.Password = hashedPassword;

        // Mark token as used (one-time use)
        resetToken.UsedAtUtc = DateTime.UtcNow;

        var dbSaveSw = Stopwatch.StartNew();
        await _db.SaveChangesAsync();
        dbSaveSw.Stop();
        _logger.LogInformation("[DATABASE] Operation=PasswordResetSave DurationMs={DurationMs:F2}", dbSaveSw.Elapsed.TotalMilliseconds);

        totalSw.Stop();
        _logger.LogInformation("[AUTH] Operation=ResetPassword Stage=Completed DurationMs={DurationMs:F2} UserId={UserId}", totalSw.Elapsed.TotalMilliseconds, resetToken.UserId);

        return "Password updated successfully";
    }

    public async Task<object?> GetProfileByEmailAsync(string email)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email);
        return user == null ? null : new { user.Name, user.Email, user.Role };
    }
}
