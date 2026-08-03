using BiometricCore.Data;
using BiometricCore.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace BiometricCore.Middleware;

public class AuditLogMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<AuditLogMiddleware> _logger;

    public AuditLogMiddleware(RequestDelegate next, ILogger<AuditLogMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context, AppDbContext db)
    {
        var request = context.Request;

        if (request.Path.StartsWithSegments("/api/v1/attendance") ||
            request.Path.StartsWithSegments("/api/v1/faces") ||
            request.Path.StartsWithSegments("/api/v1/fingerprints") ||
            request.Path.StartsWithSegments("/api/v1/auth") ||
            request.Path.StartsWithSegments("/api/v1/notifications"))
        {
            var user = context.User.Identity?.Name ?? "Anonymous";
            var ipAddress = context.Connection.RemoteIpAddress?.ToString() ?? "Unknown";

            var log = new AuditLog
            {
                AuditLogId = Guid.NewGuid(),
                Action = $"{request.Method} {request.Path}",
                PerformedBy = user,
                IpAddress = ipAddress,
                Timestamp = DateTime.UtcNow,
                Details = $"QueryString: {request.QueryString}"
            };

            try
            {
                db.AuditLogs.Add(log);
                await db.SaveChangesAsync();
            }
            catch (DbUpdateException ex)
            {
                _logger.LogWarning(ex, "Audit logging failed for {Path}", request.Path);
            }
        }

        await _next(context);
    }
}
