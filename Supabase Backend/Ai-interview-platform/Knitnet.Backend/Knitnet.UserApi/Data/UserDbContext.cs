using Microsoft.EntityFrameworkCore;
using Knitnet.Shared.Models;

namespace Knitnet.UserApi.Data;

public class UserDbContext : DbContext
{
    public UserDbContext(DbContextOptions<UserDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<UserProfile> UserProfiles => Set<UserProfile>();
    public DbSet<IdentityVerification> IdentityVerifications => Set<IdentityVerification>();

    // Read-only access to results so students can view their own scores
    public DbSet<ResultBase> Results => Set<ResultBase>();
    public DbSet<AptitudeResult> AptitudeResults => Set<AptitudeResult>();
    public DbSet<CodingResult> CodingResults => Set<CodingResult>();
    public DbSet<AiInterviewResult> AiInterviewResults => Set<AiInterviewResult>();
    public DbSet<VerbalResult> VerbalResults => Set<VerbalResult>();

    // Read-only: lookup company during login
    public DbSet<Company> Companies => Set<Company>();

    // Proctoring snapshots for AI face-authentication
    public DbSet<VerificationSnapshot> VerificationSnapshots => Set<VerificationSnapshot>();

    // Test information table shared from company module
    public DbSet<TestInfo> TestInfos => Set<TestInfo>();

    // Password reset tokens (Phase 1 security hardening)
    public DbSet<PasswordResetToken> PasswordResetTokens => Set<PasswordResetToken>();

    protected override void OnModelCreating(ModelBuilder m)
    {
        // ───────────────────────────────────────────────────
        // FIX 3: STRICT FK ENFORCEMENT via Fluent API
        // ───────────────────────────────────────────────────

        // Users → UserProfile (1:1)
        m.Entity<User>()
            .HasOne(u => u.Profile)
            .WithOne(p => p.User)
            .HasForeignKey<UserProfile>(p => p.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // Note: identity_verifications.user_id is 'text' type (set by Python verification module),
        // so no typed FK relationship to users.id (integer) is configured here.

        // Users → Company (1:1)
        m.Entity<User>()
            .HasOne(u => u.Company)
            .WithOne(c => c.User)
            .HasForeignKey<Company>(c => c.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // Users → VerificationSnapshots (1:many)
        m.Entity<User>()
            .HasMany(u => u.VerificationSnapshots)
            .WithOne(s => s.User)
            .HasForeignKey(s => s.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // VerificationSnapshots → TestInfos (many:1)
        m.Entity<VerificationSnapshot>()
            .HasOne(s => s.TestInfo)
            .WithMany()
            .HasForeignKey(s => s.TestId)
            .OnDelete(DeleteBehavior.Cascade);

        // ─── Indexes ─────────────────────────────────────
        m.Entity<User>().HasIndex(u => u.Email).IsUnique();
        m.Entity<UserProfile>().HasIndex(p => p.UserId).IsUnique();

        // PasswordResetTokens: unique hash index + FK to Users
        m.Entity<PasswordResetToken>()
            .HasIndex(t => t.TokenHash)
            .IsUnique();
        m.Entity<PasswordResetToken>()
            .HasOne(t => t.User)
            .WithMany()
            .HasForeignKey(t => t.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // Snapshot indexes for AI model query patterns
        m.Entity<VerificationSnapshot>()
            .HasIndex(s => new { s.UserId, s.TestId });
        m.Entity<VerificationSnapshot>()
            .HasIndex(s => s.SessionId);

        // ─── Result jsonb columns (read-only) ────────────
        m.Entity<AptitudeResult>(e =>
        {
            e.Property(x => x.Questions).HasColumnType("jsonb");
            e.Property(x => x.UserAnswers).HasColumnType("jsonb");
            e.Property(x => x.CorrectAnswers).HasColumnType("jsonb");
            e.Property(x => x.Topics).HasColumnType("jsonb");
        });
        m.Entity<CodingResult>(e =>
        {
            e.Property(x => x.TestcaseTotals).HasColumnType("jsonb");
            e.Property(x => x.TestcasePassed).HasColumnType("jsonb");
            e.Property(x => x.Answers).HasColumnType("jsonb");
        });
        m.Entity<AiInterviewResult>(e =>
        {
            e.Property(x => x.Questions).HasColumnType("jsonb");
            e.Property(x => x.Answers).HasColumnType("jsonb");
            e.Property(x => x.CorrectAnswers).HasColumnType("jsonb");
        });
        m.Entity<VerbalResult>(e =>
        {
            e.Property(x => x.Metrics).HasColumnType("jsonb");
            e.Property(x => x.Listening).HasColumnType("jsonb");
            e.Property(x => x.Speaking).HasColumnType("jsonb");
        });
    }
}

