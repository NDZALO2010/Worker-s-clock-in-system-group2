using BiometricCore.DTOs;

namespace BiometricCore.Services;

public interface IAttendanceService
{
    Task<(bool Success, string Message, Guid? AttendanceId, string? EmployeeName)> ClockInAsync(ClockInRequestDto dto);
    Task<(bool Success, string Message, string? EmployeeName)> ClockOutAsync(ClockOutRequestDto dto);
    Task<IEnumerable<AttendanceHistoryDto>> GetEmployeeHistoryAsync(Guid employeeId);
    Task<IEnumerable<TeamStatusDto>> GetTeamStatusAsync(Guid supervisorId);
    Task<byte[]> ExportPayrollCsvAsync(DateTime startDate, DateTime endDate);
}
