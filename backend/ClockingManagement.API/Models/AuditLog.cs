using System.ComponentModel.DataAnnotations;

namespace ClockingManagement.API.Models;

public class AuditLog
{
    [Key]
    public int AuditLogId { get; set; }

    public string UserAction { get; set; } = string.Empty;

    public string PerformedBy { get; set; } = string.Empty;

    public string IPAddress { get; set; } = string.Empty;

    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    public string Details { get; set; } = string.Empty;
}