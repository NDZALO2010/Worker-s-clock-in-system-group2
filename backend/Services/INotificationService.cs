namespace BiometricCore.Services;

public interface INotificationService
{
    Task NotifyAsync(Guid employeeId, string type, string message);
}
