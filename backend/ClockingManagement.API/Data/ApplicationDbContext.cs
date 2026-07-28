using Microsoft.EntityFrameworkCore;
using ClockingManagement.API.Models;

namespace ClockingManagement.API.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public DbSet<Employee> Employees { get; set; }

    public DbSet<Attendance> Attendance { get; set; }

    public DbSet<FaceProfile> FaceProfiles { get; set; }

    public DbSet<FingerprintProfile> FingerprintProfiles { get; set; }

    public DbSet<AuditLog> AuditLogs { get; set; }
}