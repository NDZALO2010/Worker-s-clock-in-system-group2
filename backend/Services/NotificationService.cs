using BiometricCore.Data;
using BiometricCore.Entities;
using Microsoft.EntityFrameworkCore;

namespace BiometricCore.Services;

public class NotificationService : INotificationService
{
    private readonly AppDbContext _db;
    private readonly IEmailService _emailService;
    private readonly IAttendanceHubNotifier _hubNotifier;
    private readonly ILogger<NotificationService> _logger;

    public NotificationService(AppDbContext db, IEmailService emailService, IAttendanceHubNotifier hubNotifier, ILogger<NotificationService> logger)
    {
        _db = db;
        _emailService = emailService;
        _hubNotifier = hubNotifier;
        _logger = logger;
    }

    public async Task NotifyAsync(Guid employeeId, string type, string message)
    {
        var employee = await _db.Employees.FindAsync(employeeId);
        if (employee == null)
        {
            _logger.LogWarning("Attempted to notify unknown employee {EmployeeId}", employeeId);
            return;
        }

        var notification = new Notification
        {
            EmployeeId = employeeId,
            Type = type,
            Message = message,
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        };

        _db.Notifications.Add(notification);
        await _db.SaveChangesAsync();

        await _hubNotifier.PushNotificationAsync(employeeId, new
        {
            notification.NotificationId,
            notification.Type,
            notification.Message,
            notification.CreatedAt
        });

        await _emailService.SendAsync(employee.Email, $"ClockIT - {type}", message);
    }
}
