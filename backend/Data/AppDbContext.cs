using BiometricCore.Entities;
using Microsoft.EntityFrameworkCore;

namespace BiometricCore.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<Employee> Employees => Set<Employee>();
    public DbSet<FaceProfile> FaceProfiles => Set<FaceProfile>();
    public DbSet<FingerprintProfile> FingerprintProfiles => Set<FingerprintProfile>();
    public DbSet<AttendanceRecord> Attendance => Set<AttendanceRecord>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<Notification> Notifications => Set<Notification>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Employee>()
            .HasIndex(e => e.EmployeeNumber)
            .IsUnique();

        modelBuilder.Entity<Employee>()
            .HasIndex(e => e.Email)
            .IsUnique();

        modelBuilder.Entity<Employee>()
            .HasOne(e => e.Supervisor)
            .WithMany()
            .HasForeignKey(e => e.SupervisorId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<FaceProfile>()
            .Property(f => f.FaceEmbedding)
            .HasColumnType("bytea");

        modelBuilder.Entity<FingerprintProfile>()
            .Property(f => f.FingerprintTemplate)
            .HasColumnType("bytea");
    }
}
