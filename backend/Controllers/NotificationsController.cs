using System.Security.Claims;
using BiometricCore.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BiometricCore.Controllers;

[ApiController]
[Route("api/v1/notifications")]
[Authorize]
public class NotificationsController : ControllerBase
{
    private readonly AppDbContext _db;

    public NotificationsController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetMyNotifications()
    {
        if (!Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var employeeId))
        {
            return Unauthorized(new { message = "Authenticated employee context is required." });
        }

        var notifications = await _db.Notifications
            .Where(n => n.EmployeeId == employeeId)
            .OrderByDescending(n => n.CreatedAt)
            .Take(100)
            .Select(n => new { n.NotificationId, n.Type, n.Message, n.IsRead, n.CreatedAt })
            .ToListAsync();

        return Ok(notifications);
    }

    [HttpPut("{notificationId:guid}/read")]
    public async Task<IActionResult> MarkAsRead(Guid notificationId)
    {
        if (!Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var employeeId))
        {
            return Unauthorized(new { message = "Authenticated employee context is required." });
        }

        var notification = await _db.Notifications
            .FirstOrDefaultAsync(n => n.NotificationId == notificationId && n.EmployeeId == employeeId);

        if (notification == null)
        {
            return NotFound(new { message = "Notification not found." });
        }

        notification.IsRead = true;
        await _db.SaveChangesAsync();

        return Ok(new { message = "Notification marked as read." });
    }
}
