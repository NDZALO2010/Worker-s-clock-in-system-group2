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

        // CORS preflight requests carry no meaningful action to audit, and letting them reach
        // the DB adds a write (and a failure point) to every cross-origin request.
        bool isPreflight = HttpMethods.IsOptions(request.Method);

        if (!isPreflight &&
            (request.Path.StartsWithSegments("/api/v1/attendance") ||
            request.Path.StartsWithSegments("/api/v1/faces") ||
            request.Path.StartsWithSegments("/api/v1/fingerprints") ||
            request.Path.StartsWithSegments("/api/v1/auth")))
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
            catch (Exception ex)
            {
                // Audit logging must never block the actual request it's logging, and this
                // middleware runs upstream of UseCors, so an exception left to propagate here
                // would reach the client with no CORS headers at all (browser reports the
                // underlying failure as an opaque CORS error).
                _logger.LogWarning(ex, "Audit logging failed for {Path}", request.Path);
            }
        }

        await _next(context);
    }
}
