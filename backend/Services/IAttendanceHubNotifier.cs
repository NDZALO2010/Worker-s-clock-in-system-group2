namespace BiometricCore.Services;

public interface IAttendanceHubNotifier
{
    /// <summary>
    /// Pushes the employee's current attendance status live to their supervisor, Admins, HR, and themselves.
    /// </summary>
    Task BroadcastAttendanceUpdateAsync(Guid employeeId);

    /// <summary>
    /// Pushes a notification event live to a specific employee's connected clients.
    /// </summary>
    Task PushNotificationAsync(Guid employeeId, object payload);
}
