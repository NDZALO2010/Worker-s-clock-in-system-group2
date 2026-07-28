using BiometricCore.DTOs;
using BiometricCore.Services;
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

    /// <summary>
    /// Clock-in endpoint accepting GPS coordinates and face image payload.
    /// </summary>
    [HttpPost("clockin")]
    public async Task<IActionResult> ClockIn([FromForm] ClockInRequestDto dto)
    {
        if (dto.FaceImage == null || dto.FaceImage.Length == 0)
            return BadRequest(new { message = "Face image capture is required for biometric verification." });

        var result = await _attendanceService.ClockInAsync(dto);
        if (!result.Success)
        {
            return BadRequest(new { message = result.Message });
        }

        return Ok(new { message = result.Message, attendanceId = result.AttendanceId });
    }

    /// <summary>
    /// Clock-out endpoint updating the active shift record.
    /// </summary>
    [HttpPost("clockout")]
    public async Task<IActionResult> ClockOut([FromBody] ClockOutRequestDto dto)
    {
        var result = await _attendanceService.ClockOutAsync(dto);
        if (!result.Success)
        {
            return BadRequest(new { message = result.Message });
        }

        return Ok(new { message = result.Message });
    }

    /// <summary>
    /// Supervisor Endpoint: Fetches real-time status of assigned team members.
    /// </summary>
    [HttpGet("supervisor/team-status")]
    public async Task<IActionResult> GetTeamStatus([FromQuery] Guid supervisorId)
    {
        var teamStatus = await _attendanceService.GetTeamStatusAsync(supervisorId);
        return Ok(teamStatus);
    }

    /// <summary>
    /// Exports formatted attendance and hours worked report in CSV format for HR/Payroll.
    /// </summary>
    [HttpGet("payroll-export")]
    public async Task<IActionResult> ExportPayrollReport([FromQuery] DateTime startDate, [FromQuery] DateTime endDate)
    {
        byte[] csvBytes = await _attendanceService.ExportPayrollCsvAsync(startDate, endDate);
        string fileName = $"Payroll_Attendance_{startDate:yyyyMMdd}_to_{endDate:yyyyMMdd}.csv";
        return File(csvBytes, "text/csv", fileName);
    }
}