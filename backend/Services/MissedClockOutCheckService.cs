using BiometricCore.Data;
using BiometricCore.Utilities;
using Microsoft.EntityFrameworkCore;

namespace BiometricCore.Services;

public class MissedClockOutCheckService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<MissedClockOutCheckService> _logger;
    private static readonly TimeSpan CheckInterval = TimeSpan.FromHours(24);

    public MissedClockOutCheckService(IServiceProvider serviceProvider, ILogger<MissedClockOutCheckService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(CheckInterval);

        do
        {
            try
            {
                await CheckForMissedClockOutsAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Missed clock-out check failed.");
            }
        }
        while (await timer.WaitForNextTickAsync(stoppingToken));
    }

    private async Task CheckForMissedClockOutsAsync(CancellationToken stoppingToken)
    {
        using var scope = _serviceProvider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var notificationService = scope.ServiceProvider.GetRequiredService<INotificationService>();

        DateTime yesterday = SouthAfricaTime.TodayAsUtcTaggedDate().AddDays(-1);

        var missedRecords = await db.Attendance
            .Include(a => a.Employee)
            .Where(a => a.AttendanceDate == yesterday && a.ClockOut == null)
            .ToListAsync(stoppingToken);

        foreach (var record in missedRecords)
        {
            await notificationService.NotifyAsync(record.EmployeeId, "MissedClockOut", $"You did not clock out on {yesterday:yyyy-MM-dd}. Please contact your supervisor if this is an error.");

            if (record.Employee.SupervisorId.HasValue)
            {
                await notificationService.NotifyAsync(record.Employee.SupervisorId.Value, "MissedClockOut", $"{record.Employee.FirstName} {record.Employee.LastName} did not clock out on {yesterday:yyyy-MM-dd}.");
            }
        }

        if (missedRecords.Count > 0)
        {
            _logger.LogInformation("Missed clock-out check found {Count} record(s) for {Date}.", missedRecords.Count, yesterday);
        }
    }
}
