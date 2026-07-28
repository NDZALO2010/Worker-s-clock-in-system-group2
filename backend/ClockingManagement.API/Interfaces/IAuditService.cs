using System.Threading.Tasks;

namespace ClockingManagement.API.Interfaces;

public interface IAuditService
{
    Task LogAsync(
        string action,
        string performedBy,
        string ipAddress,
        string details);
}