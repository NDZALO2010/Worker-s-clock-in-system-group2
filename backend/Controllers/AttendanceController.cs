using System.Security.Claims;
using BiometricCore.DTOs;
using BiometricCore.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BiometricCore.Controllers;

[ApiController]
[Route("api/v1/attendance")]
public class AttendanceController : ControllerBase
{
    private readonly IAttendanceService _attendanceService;

    public AttendanceController(IAttendanceService attendanceService)
    {
        _attendanceService = attendanceService;
    }

    [HttpPost("clockin")]
    [Consumes("multipart/form-data")]
    [AllowAnonymous]
    public async Task<IActionResult> ClockIn([FromForm] ClockInRequestDto dto)
    {
        bool hasFace = dto.FaceImage != null && dto.FaceImage.Length > 0;
        bool hasFingerprint = dto.FingerprintImage != null && dto.FingerprintImage.Length > 0;

        if (!hasFace && !hasFingerprint)
            return BadRequest(new { message = "A face image or fingerprint scan is required for biometric verification." });

        var result = await _attendanceService.ClockInAsync(dto);
        if (!result.Success)
        {
            return BadRequest(new { message = result.Message });
        }

        return Ok(new { message = result.Message, attendanceId = result.AttendanceId, employeeName = result.EmployeeName });
    }

    [HttpPost("clockout")]
    [Consumes("multipart/form-data")]
    [AllowAnonymous]
    public async Task<IActionResult> ClockOut([FromForm] ClockOutRequestDto dto)
    {
        bool hasFace = dto.FaceImage != null && dto.FaceImage.Length > 0;
        bool hasFingerprint = dto.FingerprintImage != null && dto.FingerprintImage.Length > 0;

        if (!hasFace && !hasFingerprint)
            return BadRequest(new { message = "A face image or fingerprint scan is required for biometric verification." });

        var result = await _attendanceService.ClockOutAsync(dto);
        if (!result.Success)
        {
            return BadRequest(new { message = result.Message });
        }

        return Ok(new { message = result.Message, employeeName = result.EmployeeName });
    }

    [HttpGet("history")]
    [Authorize]
    public async Task<IActionResult> GetMyHistory()
    {
        if (!Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var employeeId))
        {
            return Unauthorized(new { message = "Authenticated employee context is required." });
        }

        var history = await _attendanceService.GetEmployeeHistoryAsync(employeeId);
        return Ok(history);
    }

    [HttpGet("supervisor/team-status")]
    [Authorize(Roles = "Admin,Supervisor,HR")]
    public async Task<IActionResult> GetTeamStatus([FromQuery] Guid supervisorId)
    {
        if (!Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var currentEmployeeId))
        {
            return Unauthorized(new { message = "Authenticated employee context is required." });
        }

        if (!User.IsInRole("Admin") && supervisorId != currentEmployeeId)
        {
            return Forbid();
        }

        var teamStatus = await _attendanceService.GetTeamStatusAsync(supervisorId);
        return Ok(teamStatus);
    }

    [HttpGet("payroll-export")]
    [Authorize(Roles = "Admin,Supervisor,HR")]
    public async Task<IActionResult> ExportPayrollReport([FromQuery] DateTime startDate, [FromQuery] DateTime endDate)
    {
        byte[] csvBytes = await _attendanceService.ExportPayrollCsvAsync(startDate, endDate);
        string fileName = $"Payroll_Attendance_{startDate:yyyyMMdd}_to_{endDate:yyyyMMdd}.csv";

        return File(csvBytes, "text/csv", fileName);
    }
}
