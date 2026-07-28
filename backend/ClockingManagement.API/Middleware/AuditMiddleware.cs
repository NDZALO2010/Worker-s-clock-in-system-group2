using ClockingManagement.API.Interfaces;

namespace ClockingManagement.API.Middleware;

public class AuditMiddleware
{
    private readonly RequestDelegate _next;

    public AuditMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(
        HttpContext context,
        IAuditService auditService)
    {
        await _next(context);

        var user = context.User.Identity?.Name ?? "Anonymous";

        var ip = context.Connection.RemoteIpAddress?.ToString() ?? "Unknown";

        var action =
            $"{context.Request.Method} {context.Request.Path}";

        await auditService.LogAsync(
            action,
            user,
            ip,
            $"HTTP {context.Response.StatusCode}");
    }
}