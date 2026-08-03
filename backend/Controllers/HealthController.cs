using BiometricCore.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BiometricCore.Controllers;

[ApiController]
[Route("api/v1/health")]
public class HealthController : ControllerBase
{
    private readonly AppDbContext _db;

    public HealthController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public IActionResult Get()
    {
        return Ok(new
        {
            status = "Healthy",
            environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Production",
            timestamp = DateTime.UtcNow
        });
    }

    [HttpGet("seed-data")]
    public async Task<IActionResult> GetSeedDataStatus()
    {
        var employeeCount = await _db.Employees.CountAsync();
        var faceProfileCount = await _db.FaceProfiles.CountAsync();
        var attendanceCount = await _db.Attendance.CountAsync();

        var sampleEmployee = await _db.Employees
            .OrderBy(e => e.CreatedAt)
            .Select(e => new { e.EmployeeId, e.EmployeeNumber, e.Email, e.Role, e.IsActive })
            .FirstOrDefaultAsync();

        return Ok(new
        {
            database = "connected",
            employeeCount,
            faceProfileCount,
            attendanceCount,
            sampleEmployee
        });
    }

    [HttpGet("seed-samples")]
    public async Task<IActionResult> GetSeedSamples()
    {
        var seededEmployees = await _db.Employees
            .OrderBy(e => e.CreatedAt)
            .Select(e => new
            {
                e.EmployeeId,
                e.EmployeeNumber,
                e.Email,
                e.Role,
                e.IsActive,
                e.PopiaConsentGranted,
                e.CreatedAt
            })
            .Take(5)
            .ToListAsync();

        var seededAttendance = await _db.Attendance
            .OrderByDescending(a => a.AttendanceDate)
            .Select(a => new
            {
                a.AttendanceId,
                a.EmployeeId,
                a.AttendanceDate,
                a.ClockIn,
                a.ClockOut,
                a.Lat,
                a.Long,
                a.DeviceName,
                a.Confidence
            })
            .Take(10)
            .ToListAsync();

        var seededProfiles = await _db.FaceProfiles
            .OrderBy(fp => fp.CreatedAt)
            .Select(fp => new
            {
                fp.FaceProfileId,
                fp.EmployeeId,
                fp.CreatedAt,
                VectorBytesLength = fp.FaceEmbedding.Length
            })
            .Take(5)
            .ToListAsync();

        return Ok(new
        {
            seededEmployees,
            seededProfiles,
            seededAttendance
        });
    }
}
