using Microsoft.EntityFrameworkCore;
using Knitnet.Shared.Models;

namespace Knitnet.TransactionApi.Data;

public class TransactionDbContext : DbContext
{
    public TransactionDbContext(DbContextOptions<TransactionDbContext> options) : base(options) { }

    public DbSet<BillingInfo> BillingInfos => Set<BillingInfo>();
    public DbSet<Transaction> Transactions => Set<Transaction>();
    public DbSet<CreditBalance> CreditBalances => Set<CreditBalance>();
    public DbSet<RazorpayWebhookLog> WebhookLogs => Set<RazorpayWebhookLog>();

    protected override void OnModelCreating(ModelBuilder m)
    {
        m.Entity<BillingInfo>().HasIndex(b => b.CompanyId).IsUnique();
        m.Entity<CreditBalance>().HasKey(c => c.CompanyId);
        m.Entity<Transaction>().HasIndex(t => t.OrderId);
        m.Entity<Transaction>().HasIndex(t => t.ReferenceId);
        m.Entity<RazorpayWebhookLog>().Property(w => w.Payload).HasColumnType("jsonb");
    }
}
