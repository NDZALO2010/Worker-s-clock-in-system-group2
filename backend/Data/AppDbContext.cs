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

        // Enforce at the database level that an employee can have at most one open
        // (not yet clocked out) attendance session at a time. This closes a race where
        // two near-simultaneous clock-in requests both pass the application-level check
        // before either commits, leaving a duplicate open session that later blocks
        // that employee's next legitimate clock-in.
        modelBuilder.Entity<AttendanceRecord>()
            .HasIndex(a => a.EmployeeId)
            .IsUnique()
            .HasFilter("\"ClockOut\" IS NULL")
            .HasDatabaseName("IX_Attendance_OneOpenSessionPerEmployee");
    }
}
