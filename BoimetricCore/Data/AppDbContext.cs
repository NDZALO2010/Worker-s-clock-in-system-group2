using Microsoft.EntityFrameworkCore;

namespace BiometricCore.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public DbSet<AttendanceRecord> Attendance { get; set; } = null!;
    public DbSet<FaceProfile> FaceProfiles { get; set; } = null!;
    public DbSet<Employee> Employees { get; set; } = null!;
}
