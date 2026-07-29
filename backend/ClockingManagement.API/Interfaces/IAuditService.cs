using ClockingManagement.API.Models;

namespace ClockingManagement.API.Interfaces;

public interface IAuditService
{
    Task LogAsync(
        string userAction,
        string performedBy,
        string ipAddress,
        string details);
}