namespace BiometricCore.Utilities;

/// <summary>
/// South Africa Standard Time (SAST) is a fixed UTC+2 offset with no daylight saving,
/// so it can be applied as a constant shift rather than relying on the OS/ICU time
/// zone database (avoids TimeZoneNotFoundException on differently configured hosts).
/// </summary>
public static class SouthAfricaTime
{
    private static readonly TimeSpan Offset = TimeSpan.FromHours(2);

    public static DateTime Now => DateTime.UtcNow + Offset;

    public static DateTime ToSast(DateTime utcInstant) =>
        DateTime.SpecifyKind(utcInstant, DateTimeKind.Utc) + Offset;

    /// <summary>
    /// Today's SAST calendar date, tagged as Kind=Utc so it can be written to / compared
    /// against "timestamp with time zone" columns (matches the AttendanceDate convention).
    /// </summary>
    public static DateTime TodayAsUtcTaggedDate() => DateTime.SpecifyKind(Now.Date, DateTimeKind.Utc);
}
