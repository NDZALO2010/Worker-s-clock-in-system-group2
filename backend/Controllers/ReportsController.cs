using BiometricCore.Data;
using BiometricCore.DTOs;
using BiometricCore.Utilities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BiometricCore.Controllers;

[ApiController]
[Route("api/v1/reports")]
public class ReportsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly double _standardDailyHours;
    private readonly TimeSpan _lateThreshold;

    public ReportsController(AppDbContext db, IConfiguration config)
    {
        _db = db;
        _standardDailyHours = double.Parse(config["Attendance:StandardDailyHours"] ?? "8");
        _lateThreshold = TimeSpan.Parse(config["Attendance:LateThresholdTime"] ?? "08:30:00");
    }

    [HttpGet]
    [Authorize(Roles = "Admin,Supervisor,HR")]
    public async Task<IActionResult> GenerateReport([FromQuery] Guid? employeeId, [FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate)
    {
        var query = _db.Attendance
            .Include(a => a.Employee)
            .AsQueryable();

        if (employeeId.HasValue)
        {
            query = query.Where(a => a.EmployeeId == employeeId.Value);
        }

        if (startDate.HasValue)
        {
            var startUtc = DateTime.SpecifyKind(startDate.Value.Date, DateTimeKind.Utc);
            query = query.Where(a => a.AttendanceDate >= startUtc);
        }

        if (endDate.HasValue)
        {
            var endUtc = DateTime.SpecifyKind(endDate.Value.Date, DateTimeKind.Utc);
            query = query.Where(a => a.AttendanceDate <= endUtc);
        }

        var records = await query.OrderBy(a => a.AttendanceDate).ToListAsync();

        var report = records.Select(r =>
        {
            double hoursWorked = r.ClockOut.HasValue ? Math.Round((r.ClockOut.Value - r.ClockIn).TotalHours, 2) : 0;

            return new PayrollExportDto
            {
                EmployeeNumber = r.Employee.EmployeeNumber,
                EmployeeName = $"{r.Employee.FirstName} {r.Employee.LastName}",
                Date = r.AttendanceDate.ToString("yyyy-MM-dd"),
                ClockIn = SouthAfricaTime.ToSast(r.ClockIn).ToString("HH:mm:ss"),
                ClockOut = r.ClockOut.HasValue ? SouthAfricaTime.ToSast(r.ClockOut.Value).ToString("HH:mm:ss") : "N/A",
                TotalHoursWorked = hoursWorked,
                OvertimeHours = AttendanceCalculator.CalculateOvertimeHours(hoursWorked, _standardDailyHours),
                IsLate = AttendanceCalculator.IsLate(r.ClockIn, _lateThreshold)
            };
        }).ToList();

        return Ok(report);
    }
}
