using Microsoft.EntityFrameworkCore;
using Knitnet.Shared.Models;

namespace Knitnet.CompanyApi.Data;

public class CompanyDbContext : DbContext
{
    public CompanyDbContext(DbContextOptions<CompanyDbContext> options) : base(options) { }

    public DbSet<Company> Companies => Set<Company>();
    public DbSet<CompanyInfo> CompanyInfos => Set<CompanyInfo>();
    public DbSet<HR> HRs => Set<HR>();
    public DbSet<TestInfo> TestInfos => Set<TestInfo>();
    public DbSet<TestMapping> TestMappings => Set<TestMapping>();
    public DbSet<AiInterviewMapping> AiInterviewMappings => Set<AiInterviewMapping>();
    public DbSet<VerbalMapping> VerbalMappings => Set<VerbalMapping>();
    public DbSet<CodingMapping> CodingMappings => Set<CodingMapping>();
    public DbSet<AptitudeMapping> AptitudeMappings => Set<AptitudeMapping>();
    public DbSet<ResultBase> Results => Set<ResultBase>();
    public DbSet<AptitudeResult> AptitudeResults => Set<AptitudeResult>();
    public DbSet<CodingResult> CodingResults => Set<CodingResult>();
    public DbSet<AiInterviewResult> AiInterviewResults => Set<AiInterviewResult>();
    public DbSet<VerbalResult> VerbalResults => Set<VerbalResult>();
    public DbSet<CreditPoint> CreditPoints => Set<CreditPoint>();

    protected override void OnModelCreating(ModelBuilder m)
    {
        // ───────────────────────────────────────────────────
        // FIX 3: STRICT FK ENFORCEMENT via Fluent API
        // ───────────────────────────────────────────────────

        // Company → CompanyInfo (1:1)
        m.Entity<Company>()
            .HasOne(c => c.CompanyInfo)
            .WithOne()
            .HasForeignKey<CompanyInfo>(ci => ci.CompanyId)
            .OnDelete(DeleteBehavior.Cascade);

        // Company → HRs (1:many)
        m.Entity<Company>()
            .HasMany(c => c.HRs)
            .WithOne(h => h.Company)
            .HasForeignKey(h => h.CompanyId)
            .OnDelete(DeleteBehavior.Cascade);

        // Company → TestInfos (1:many)
        m.Entity<Company>()
            .HasMany(c => c.TestInfos)
            .WithOne(t => t.Company)
            .HasForeignKey(t => t.CompanyId)
            .OnDelete(DeleteBehavior.Cascade);

        // TestInfo → TestMappings (1:many via TestId string key)
        m.Entity<TestMapping>()
            .HasOne(tm => tm.TestInfo)
            .WithMany(ti => ti.TestMappings)
            .HasForeignKey(tm => tm.TestId)
            .HasPrincipalKey(ti => ti.TestId)
            .OnDelete(DeleteBehavior.Cascade);

        // TestMapping → Results (1:many)
        m.Entity<ResultBase>()
            .HasOne(r => r.TestMapping)
            .WithMany(tm => tm.Results)
            .HasForeignKey(r => r.TestMappingId)
            .OnDelete(DeleteBehavior.SetNull);

        // TestMapping → sub-mapping relationships (1:1 each)
        m.Entity<TestMapping>()
            .HasOne(t => t.AiInterview).WithOne(a => a.TestMapping)
            .HasForeignKey<AiInterviewMapping>(a => a.TestMappingId)
            .OnDelete(DeleteBehavior.Cascade);
        m.Entity<TestMapping>()
            .HasOne(t => t.Verbal).WithOne(v => v.TestMapping)
            .HasForeignKey<VerbalMapping>(v => v.TestMappingId)
            .OnDelete(DeleteBehavior.Cascade);
        m.Entity<TestMapping>()
            .HasOne(t => t.Coding).WithOne(c => c.TestMapping)
            .HasForeignKey<CodingMapping>(c => c.TestMappingId)
            .OnDelete(DeleteBehavior.Cascade);
        m.Entity<TestMapping>()
            .HasOne(t => t.Aptitude).WithOne(a => a.TestMapping)
            .HasForeignKey<AptitudeMapping>(a => a.TestMappingId)
            .OnDelete(DeleteBehavior.Cascade);

        // ResultBase → sub-result relationships (1:1 each)
        m.Entity<ResultBase>()
            .HasOne(r => r.Aptitude).WithOne(a => a.ResultBase)
            .HasForeignKey<AptitudeResult>(a => a.ResultBaseId)
            .OnDelete(DeleteBehavior.Cascade);
        m.Entity<ResultBase>()
            .HasOne(r => r.Coding).WithOne(c => c.ResultBase)
            .HasForeignKey<CodingResult>(c => c.ResultBaseId)
            .OnDelete(DeleteBehavior.Cascade);
        m.Entity<ResultBase>()
            .HasOne(r => r.AiInterview).WithOne(a => a.ResultBase)
            .HasForeignKey<AiInterviewResult>(a => a.ResultBaseId)
            .OnDelete(DeleteBehavior.Cascade);
        m.Entity<ResultBase>()
            .HasOne(r => r.Verbal).WithOne(v => v.ResultBase)
            .HasForeignKey<VerbalResult>(v => v.ResultBaseId)
            .OnDelete(DeleteBehavior.Cascade);

        // ─── Indexes ─────────────────────────────────────
        m.Entity<Company>().HasIndex(c => c.UserId).IsUnique();
        m.Entity<CompanyInfo>().HasIndex(c => c.CompanyId).IsUnique();
        m.Entity<HR>().HasIndex(h => h.Email).IsUnique();
        m.Entity<CreditPoint>().HasIndex(c => c.Module).IsUnique();

        // ─── Result jsonb columns ────────────────────────
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
