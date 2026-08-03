using BiometricCore.Entities;
using BiometricCore.Services;
using Microsoft.EntityFrameworkCore;

namespace BiometricCore.Data;

public static class DbSeeder
{
    public static async Task SeedAsync(AppDbContext context, ILogger logger)
    {
        logger.LogInformation("Applying any pending EF Core migrations.");
        await context.Database.MigrateAsync();

        if (await context.Employees.AnyAsync())
        {
            logger.LogInformation("Database already contains employee data; skipping seeding.");
            return;
        }

        logger.LogInformation("Seeding initial sample data into the database.");

        var admin = new Employee
        {
            EmployeeId = Guid.NewGuid(),
            EmployeeNumber = "ADMIN-001",
            FirstName = "System",
            LastName = "Administrator",
            Email = "admin@clockit.local",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin@123"),
            Role = "Admin",
            IsActive = true,
            PopiaConsentGranted = true,
            CreatedAt = DateTime.UtcNow
        };

        var supervisor = new Employee
        {
            EmployeeId = Guid.NewGuid(),
            EmployeeNumber = "SUP-001",
            FirstName = "Tanya",
            LastName = "Supervisor",
            Email = "tanya.supervisor@clockit.local",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Supervisor@123"),
            Role = "Supervisor",
            IsActive = true,
            PopiaConsentGranted = true,
            CreatedAt = DateTime.UtcNow
        };

        var employee = new Employee
        {
            EmployeeId = Guid.NewGuid(),
            EmployeeNumber = "EMP-001",
            FirstName = "Lunga",
            LastName = "Maseko",
            Email = "lunga.maseko@clockit.local",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Employee@123"),
            Role = "Employee",
            SupervisorId = supervisor.EmployeeId,
            IsActive = true,
            PopiaConsentGranted = true,
            CreatedAt = DateTime.UtcNow
        };

        var faceEmbedding = Enumerable.Range(1, 512).Select(i => 0.002f * i).ToArray();

        var faceProfile = new FaceProfile
        {
            FaceProfileId = Guid.NewGuid(),
            EmployeeId = employee.EmployeeId,
            FaceEmbedding = MathUtility.ToByteArray(faceEmbedding),
            CreatedAt = DateTime.UtcNow
        };

        var attendance = new AttendanceRecord
        {
            AttendanceId = Guid.NewGuid(),
            EmployeeId = employee.EmployeeId,
            AttendanceDate = DateTime.UtcNow.Date,
            ClockIn = DateTime.UtcNow.Date.AddHours(8),
            ClockOut = DateTime.UtcNow.Date.AddHours(17),
            Lat = -25.7479,
            Long = 28.2293,
            DeviceName = "Seeded Device",
            Confidence = 0.82,
            AuthMethod = "Face"
        };

        context.Employees.AddRange(admin, supervisor, employee);
        context.FaceProfiles.Add(faceProfile);
        context.Attendance.Add(attendance);

        await context.SaveChangesAsync();
        logger.LogInformation("Sample data seeded successfully.");
    }
}
