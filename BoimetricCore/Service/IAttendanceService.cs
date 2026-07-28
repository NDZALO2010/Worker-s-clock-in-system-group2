using BiometricCore.DTOs;

namespace BiometricCore.Services;

public interface IAttendanceService
{
    Task<(bool Success, string Message, Guid? AttendanceId)> ClockInAsync(ClockInRequestDto dto);
    Task<(bool Success, string Message)> ClockOutAsync(ClockOutRequestDto dto);
    Task<IEnumerable<TeamStatusDto>> GetTeamStatusAsync(Guid supervisorId);
    Task<byte[]> ExportPayrollCsvAsync(DateTime startDate, DateTime endDate);
}