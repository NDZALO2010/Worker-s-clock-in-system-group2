using BiometricCore.Data;
using BiometricCore.DTOs;
using BiometricCore.Hubs;
using BiometricCore.Utilities;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace BiometricCore.Services;

public class AttendanceHubNotifier : IAttendanceHubNotifier
{
    private readonly IHubContext<AttendanceHub> _hubContext;
    private readonly AppDbContext _db;

    public AttendanceHubNotifier(IHubContext<AttendanceHub> hubContext, AppDbContext db)
    {
        _hubContext = hubContext;
        _db = db;
    }

    public async Task BroadcastAttendanceUpdateAsync(Guid employeeId)
    {
        var employee = await _db.Employees.FindAsync(employeeId);
        if (employee == null)
        {
            return;
        }

        DateTime today = SouthAfricaTime.TodayAsUtcTaggedDate();
        var log = await _db.Attendance
            .Where(a => a.EmployeeId == employeeId && a.AttendanceDate == today)
            .OrderByDescending(a => a.ClockIn)
            .FirstOrDefaultAsync();

        var status = new TeamStatusDto
        {
            EmployeeId = employee.EmployeeId,
            FullName = $"{employee.FirstName} {employee.LastName}",
            EmployeeNumber = employee.EmployeeNumber,
            Status = log == null ? "Absent" : (log.ClockOut == null ? "Clocked In" : "Clocked Out"),
            ClockInTime = log?.ClockIn,
            SimilarityScore = log?.Confidence
        };

        var groups = new List<string> { "Admins", "HR", $"Employee-{employeeId}" };
        if (employee.SupervisorId.HasValue)
        {
            groups.Add($"Supervisor-{employee.SupervisorId.Value}");
        }

        await _hubContext.Clients.Groups(groups).SendAsync("AttendanceUpdated", status);
    }

    public async Task PushNotificationAsync(Guid employeeId, object payload)
    {
        await _hubContext.Clients.Group($"Employee-{employeeId}").SendAsync("NotificationReceived", payload);
    }
}
