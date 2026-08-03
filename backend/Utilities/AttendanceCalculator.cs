namespace BiometricCore.Utilities;

public static class AttendanceCalculator
{
    public static bool IsLate(DateTime clockInUtc, TimeSpan lateThreshold) =>
        SouthAfricaTime.ToSast(clockInUtc).TimeOfDay > lateThreshold;

    public static double CalculateOvertimeHours(double hoursWorked, double standardHours) =>
        Math.Max(0, Math.Round(hoursWorked - standardHours, 2));
}
