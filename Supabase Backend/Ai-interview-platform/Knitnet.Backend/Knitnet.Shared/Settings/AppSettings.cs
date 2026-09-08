namespace Knitnet.Shared.Settings;

public class JwtSettings
{
    public string SecretKey { get; set; } = "CHANGE_ME_MIN_32_CHARS_LONG_SECRET_KEY";
    public string Issuer { get; set; } = "KnitnetBackend";
    public string Audience { get; set; } = "KnitnetFrontend";
    public int ExpiryHours { get; set; } = 3;
}

public class SupabaseSettings
{
    public string Url { get; set; } = "https://YOUR_PROJECT_REF.supabase.co";
    public string ServiceRoleKey { get; set; } = "YOUR_SUPABASE_SERVICE_ROLE_KEY";
    public string ProfileImagesBucket { get; set; } = "profile-images";
    public string CompanyLogosBucket { get; set; } = "company-logos";
    public string VerificationDocsBucket { get; set; } = "verification-docs";
}

public class RazorpaySettings
{
    public string KeyId { get; set; } = "rzp_test_XXXXXXXXXXXXXX";
    public string KeySecret { get; set; } = "YOUR_RAZORPAY_KEY_SECRET";
    public string WebhookSecret { get; set; } = "YOUR_RAZORPAY_WEBHOOK_SECRET";
}

public class VerificationSettings
{
    public int SnapshotCount { get; set; } = 15;
    public string TempStoragePath { get; set; } = "/tmp/verification";
}
