namespace Knitnet.UserApi.DTOs;

// ─── Auth DTOs ───────────────────────────────────────────────

public class SignupDto
{
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string ConfirmPassword { get; set; } = string.Empty;
    // Company-specific fields (ignored for students)
    public string? CompanyName { get; set; }
    public string? ContactNo { get; set; }
}

public class LoginDto
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public class LoginResponseDto
{
    public string Token { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public int UserId { get; set; }
    public Guid? CompanyId { get; set; }
}

public class ForgotPasswordDto
{
    public string Email { get; set; } = string.Empty;
}

public class ResetPasswordDto
{
    /// <summary>The raw token received via email link.</summary>
    public string Token { get; set; } = string.Empty;
    public string NewPassword { get; set; } = string.Empty;
    public string ConfirmPassword { get; set; } = string.Empty;
}

// ─── Profile DTOs ────────────────────────────────────────────

public class ProfileCreateDto
{
    public string FullName { get; set; } = string.Empty;
    public DateOnly Dob { get; set; }
    public int Age { get; set; }
    public string College { get; set; } = string.Empty;
    public string RollNumber { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string? PhotoUrl { get; set; }
    public string Gender { get; set; } = string.Empty;
}

public class ProfileResponseDto
{
    public int UserId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public DateOnly Dob { get; set; }
    public int Age { get; set; }
    public string College { get; set; } = string.Empty;
    public string RollNumber { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string PhotoUrl { get; set; } = string.Empty;
    public string Gender { get; set; } = string.Empty;
}

// ─── Verification DTOs ──────────────────────────────────────

public class VerificationCreateDto
{
    public string? UserName { get; set; }
    public string? AadhaarLast4 { get; set; }
    public string? AadhaarZipUrl { get; set; }
    public string? PassportPhotoUrl { get; set; }
    public string? ShareCode { get; set; }
}

public class VerificationCompleteDto
{
    public string UniqueId { get; set; } = string.Empty;
    public string PassportPhotoUrl { get; set; } = string.Empty;
}

public class VerificationStatusDto
{
    public bool Verified { get; set; }
    public string? UniqueId { get; set; }
    public string? PhotoUrl { get; set; }
}

// ─── Snapshot DTOs (AI Proctoring) ──────────────────────────

public class StartSnapshotSessionDto
{
    public string? TestId { get; set; }
    public string? TestCode { get; set; }
    public string? IndividualMailCode { get; set; }
}

public class StartSnapshotSessionResponseDto
{
    public string SessionId { get; set; } = string.Empty;
}

public class SnapshotResponseDto
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string? TestId { get; set; }
    public string? TestCode { get; set; }
    public string? IndividualMailCode { get; set; }
    public string SessionId { get; set; } = string.Empty;
    public int SnapshotIndex { get; set; }
    public string SnapshotUrl { get; set; } = string.Empty;
    public string StorageBucket { get; set; } = string.Empty;
    public string StoragePath { get; set; } = string.Empty;
    public long FileSizeBytes { get; set; }
    public string ContentType { get; set; } = string.Empty;
    public DateTime CapturedAt { get; set; }
}
