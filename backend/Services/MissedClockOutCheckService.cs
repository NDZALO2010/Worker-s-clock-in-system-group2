using BiometricCore.Data;
using BiometricCore.Utilities;
using Microsoft.EntityFrameworkCore;

namespace BiometricCore.Services;

/// <summary>
/// Periodically closes out attendance sessions still open past their work day's end time,
/// so a forgotten clock-out doesn't permanently block that employee's next clock-in.
/// </summary>
public class MissedClockOutCheckService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<MissedClockOutCheckService> _logger;
    private readonly IConfiguration _config;
    private static readonly TimeSpan CheckInterval = TimeSpan.FromMinutes(15);

    public MissedClockOutCheckService(IServiceProvider serviceProvider, ILogger<MissedClockOutCheckService> logger, IConfiguration config)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
        _config = config;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(CheckInterval);

        do
        {
            try
            {
                await AutoCloseOverdueSessionsAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Missed clock-out auto-close check failed.");
            }
        }
        while (await timer.WaitForNextTickAsync(stoppingToken));
    }

    private async Task AutoCloseOverdueSessionsAsync(CancellationToken stoppingToken)
    {
        using var scope = _serviceProvider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var notificationService = scope.ServiceProvider.GetRequiredService<INotificationService>();

        var workEndTime = TimeSpan.Parse(_config["Attendance:WorkEndTime"] ?? "16:00:00");
        DateTime nowSast = SouthAfricaTime.Now;
        DateTime today = SouthAfricaTime.TodayAsUtcTaggedDate();

        // Overdue = any earlier day still open, or today once SAST local time has passed WorkEndTime.
        var overdueRecords = await db.Attendance
            .Include(a => a.Employee)
            .Where(a => a.ClockOut == null &&
                (a.AttendanceDate < today || (a.AttendanceDate == today && nowSast.TimeOfDay >= workEndTime)))
            .ToListAsync(stoppingToken);

        if (overdueRecords.Count == 0)
        {
            return;
        }

        DateTime nowUtc = DateTime.UtcNow;
        foreach (var record in overdueRecords)
        {
            DateTime sastCloseInstant = record.AttendanceDate.Add(workEndTime);
            DateTime workEndUtc = SouthAfricaTime.ToUtc(sastCloseInstant);

            // A late/evening clock-in can occur after that day's WorkEndTime has already
            // passed; backdating ClockOut to WorkEndTime would then put it before ClockIn.
            // In that case, close the session at the moment it's detected instead.
            record.ClockOut = workEndUtc > record.ClockIn ? workEndUtc : nowUtc;

            await notificationService.NotifyAsync(record.EmployeeId, "AutoClockOut",
                $"You were automatically clocked out at {workEndTime:hh\\:mm} on {record.AttendanceDate:yyyy-MM-dd} because no clock-out was recorded. Contact your supervisor if this is incorrect.");

            if (record.Employee.SupervisorId.HasValue)
            {
                await notificationService.NotifyAsync(record.Employee.SupervisorId.Value, "AutoClockOut",
                    $"{record.Employee.FirstName} {record.Employee.LastName} was automatically clocked out at {workEndTime:hh\\:mm} on {record.AttendanceDate:yyyy-MM-dd} (missed clock-out).");
            }
        }

        await db.SaveChangesAsync(stoppingToken);
        _logger.LogInformation("Auto-closed {Count} overdue attendance session(s).", overdueRecords.Count);
    }
}
