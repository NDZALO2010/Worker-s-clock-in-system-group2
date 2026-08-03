using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace BiometricCore.Hubs;

[Authorize]
public class AttendanceHub : Hub
{
    public override async Task OnConnectedAsync()
    {
        var employeeId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
        var role = Context.User?.FindFirstValue(ClaimTypes.Role);

        if (!string.IsNullOrEmpty(employeeId))
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"Employee-{employeeId}");
            await Groups.AddToGroupAsync(Context.ConnectionId, $"Supervisor-{employeeId}");
        }

        if (role == "Admin")
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, "Admins");
        }
        else if (role == "HR")
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, "HR");
        }

        await base.OnConnectedAsync();
    }
}
