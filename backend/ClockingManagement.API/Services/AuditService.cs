using ClockingManagement.API.Data;
using ClockingManagement.API.Interfaces;
using ClockingManagement.API.Models;

namespace ClockingManagement.API.Services;

public class AuditService : IAuditService
{
    private readonly ApplicationDbContext _context;

    public AuditService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task LogAsync(
        string userAction,
        string performedBy,
        string ipAddress,
        string details)
    {
        var log = new AuditLog
        {
            UserAction = userAction,
            PerformedBy = performedBy,
            IPAddress = ipAddress,
            Timestamp = DateTime.UtcNow,
            Details = details
        };

        _context.AuditLogs.Add(log);

        await _context.SaveChangesAsync();
    }
}