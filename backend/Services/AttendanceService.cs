using System.Text;
using BiometricCore.Data;
using BiometricCore.DTOs;
using BiometricCore.Entities;
using BiometricCore.Utilities;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace BiometricCore.Services;

public class AttendanceService : IAttendanceService
{
    private readonly AppDbContext _db;
    private readonly IFacialRecognitionService _facialService;
    private readonly INotificationService _notificationService;
    private readonly IAttendanceHubNotifier _hubNotifier;
    private readonly IConfiguration _config;
    private readonly ILogger<AttendanceService> _logger;

    private readonly List<GeofenceZone> _geofenceZones;
    private readonly double _standardDailyHours;
    private readonly TimeSpan _lateThreshold;
    private readonly HashSet<DayOfWeek> _workDays;

    public AttendanceService(
        AppDbContext db,
        IFacialRecognitionService facialService,
        INotificationService notificationService,
        IAttendanceHubNotifier hubNotifier,
        IConfiguration config,
        ILogger<AttendanceService> logger)
    {
        _db = db;
        _facialService = facialService;
        _notificationService = notificationService;
        _hubNotifier = hubNotifier;
        _config = config;
        _logger = logger;

        _geofenceZones = _config.GetSection("Geofence:Zones").Get<List<GeofenceZone>>() ?? new List<GeofenceZone>
        {
            new() { Name = "Default", Latitude = -25.7479, Longitude = 28.2293, RadiusMeters = 500 }
        };
        _standardDailyHours = double.Parse(_config["Attendance:StandardDailyHours"] ?? "8");
        _lateThreshold = TimeSpan.Parse(_config["Attendance:LateThresholdTime"] ?? "08:30:00");
        _workDays = (_config["Attendance:WorkDays"] ?? "Monday,Tuesday,Wednesday,Thursday,Friday")
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(Enum.Parse<DayOfWeek>)
            .ToHashSet();
    }

    public async Task<(bool Success, string Message, Guid? AttendanceId, string? EmployeeName)> ClockInAsync(ClockInRequestDto dto)
    {
        var geofence = CheckGeofence(dto.Latitude, dto.Longitude);
        if (!geofence.WithinZone)
        {
            return (false, geofence.Message!, null, null);
        }

        var identification = await IdentifyEmployeeByBiometricAsync(dto.FaceImage);
        if (!identification.EmployeeId.HasValue)
        {
            _logger.LogWarning("Unrecognized {Method} attempted clock-in. Max confidence: {Score}", identification.Method, identification.Confidence);
            return (false, identification.Error ?? "Biometric verification failed.", null, null);
        }

        return await ClockInCoreAsync(identification.EmployeeId.Value, dto.Latitude, dto.Longitude, dto.DeviceName, identification.Confidence, identification.Method);
    }

    /// <summary>
    /// Clock-in path for identities already proven out-of-band (a verified WebAuthn assertion) —
    /// no biometric image or matching involved, so it skips straight to the shared recording logic.
    /// </summary>
    public async Task<(bool Success, string Message, Guid? AttendanceId, string? EmployeeName)> ClockInVerifiedAsync(Guid employeeId, double latitude, double longitude, string deviceName)
    {
        var geofence = CheckGeofence(latitude, longitude);
        if (!geofence.WithinZone)
        {
            return (false, geofence.Message!, null, null);
        }

        return await ClockInCoreAsync(employeeId, latitude, longitude, deviceName, confidence: 1.0f, method: "Fingerprint");
    }

    public async Task<(bool Success, string Message, string? EmployeeName)> ClockOutAsync(ClockOutRequestDto dto)
    {
        var identification = await IdentifyEmployeeByBiometricAsync(dto.FaceImage);
        if (!identification.EmployeeId.HasValue)
        {
            _logger.LogWarning("Unrecognized {Method} attempted clock-out. Max confidence: {Score}", identification.Method, identification.Confidence);
            return (false, identification.Error ?? "Biometric verification failed.", null);
        }

        return await ClockOutCoreAsync(identification.EmployeeId.Value, identification.Method);
    }

    public async Task<(bool Success, string Message, string? EmployeeName)> ClockOutVerifiedAsync(Guid employeeId, double latitude, double longitude, string deviceName)
    {
        return await ClockOutCoreAsync(employeeId, "Fingerprint");
    }

    private (bool WithinZone, string? Message) CheckGeofence(double latitude, double longitude)
    {
        var nearestZone = _geofenceZones
            .Select(zone => (Zone: zone, Distance: GeoUtility.CalculateDistanceMeters(latitude, longitude, zone.Latitude, zone.Longitude)))
            .OrderBy(z => z.Distance)
            .First();

        bool withinAnyZone = nearestZone.Distance <= nearestZone.Zone.RadiusMeters;
        if (!withinAnyZone)
        {
            _logger.LogWarning("Clock-in rejected: Outside all geofence zones (nearest: {Zone}, {Distance}m away)", nearestZone.Zone.Name, nearestZone.Distance);
            return (false, $"Clock-in rejected: You are outside all permitted work zones. Nearest zone is \"{nearestZone.Zone.Name}\", {Math.Round(nearestZone.Distance)}m away.");
        }

        return (true, null);
    }

    private static string BuildActiveSessionMessage(AttendanceRecord activeSession, DateTime sastToday)
    {
        if (activeSession.AttendanceDate == sastToday)
        {
            return "You already have an active clock-in session for today. Please clock out first.";
        }

        return $"You have an unclosed clock-in session from {activeSession.AttendanceDate:yyyy-MM-dd} that was never clocked out. Please clock that session out (or contact an admin) before clocking in again.";
    }

    private async Task<(bool Success, string Message, Guid? AttendanceId, string? EmployeeName)> ClockInCoreAsync(
        Guid employeeId, double latitude, double longitude, string deviceName, float confidence, string method)
    {
        DateTime now = DateTime.UtcNow;
        DateTime sastToday = SouthAfricaTime.ToSast(now).Date;

        // Matches IX_Attendance_OneOpenSessionPerEmployee, which allows only one open session
        // per employee across all dates (not just today), so a session left open from a
        // previous day is caught here with an accurate message instead of being missed and
        // only surfacing later as a same-day duplicate via the unique-violation handler below.
        var activeSession = await _db.Attendance
            .FirstOrDefaultAsync(a => a.EmployeeId == employeeId && a.ClockOut == null);

        if (activeSession != null)
        {
            return (false, BuildActiveSessionMessage(activeSession, sastToday), null, null);
        }

        var attendanceRecord = new AttendanceRecord
        {
            AttendanceId = Guid.NewGuid(),
            EmployeeId = employeeId,
            AttendanceDate = sastToday,
            ClockIn = now,
            ClockOut = null,
            Lat = latitude,
            Long = longitude,
            DeviceName = deviceName,
            Confidence = confidence,
            AuthMethod = method
        };

        _db.Attendance.Add(attendanceRecord);

        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
        {
            _logger.LogWarning("Concurrent clock-in detected for Employee {EmployeeId}; rejecting duplicate.", employeeId);

            var existingSession = await _db.Attendance
                .AsNoTracking()
                .Where(a => a.EmployeeId == employeeId && a.ClockOut == null)
                .FirstOrDefaultAsync();

            var message = existingSession != null
                ? BuildActiveSessionMessage(existingSession, sastToday)
                : "You already have an active clock-in session. Please clock out first.";

            return (false, message, null, null);
        }

        _logger.LogInformation("Employee {EmployeeId} clocked in successfully via {Method}.", employeeId, method);

        var employee = await _db.Employees.FindAsync(employeeId);
        if (employee != null && AttendanceCalculator.IsLate(now, _lateThreshold))
        {
            await _notificationService.NotifyAsync(employeeId, "LateClockIn", $"You clocked in late at {now:HH:mm} on {now:yyyy-MM-dd}.");
            if (employee.SupervisorId.HasValue)
            {
                await _notificationService.NotifyAsync(employee.SupervisorId.Value, "LateClockIn", $"{employee.FirstName} {employee.LastName} clocked in late at {now:HH:mm} on {now:yyyy-MM-dd}.");
            }
        }

        await _hubNotifier.BroadcastAttendanceUpdateAsync(employeeId);

        string? employeeName = employee != null ? $"{employee.FirstName} {employee.LastName}" : null;

        return (true, "Clock-in recorded successfully. Welcome!", attendanceRecord.AttendanceId, employeeName);
    }

    private async Task<(bool Success, string Message, string? EmployeeName)> ClockOutCoreAsync(Guid employeeId, string method)
    {
        DateTime now = DateTime.UtcNow;

        var session = await _db.Attendance
            .FirstOrDefaultAsync(a => a.EmployeeId == employeeId && a.ClockOut == null);

        if (session == null)
        {
            return (false, "No active clock-in session found for this employee.", null);
        }

        session.ClockOut = now;
        _db.Attendance.Update(session);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Employee {EmployeeId} clocked out successfully via {Method}.", employeeId, method);

        double hoursWorked = Math.Round((now - session.ClockIn).TotalHours, 2);
        double overtimeHours = AttendanceCalculator.CalculateOvertimeHours(hoursWorked, _standardDailyHours);

        var employee = await _db.Employees.FindAsync(employeeId);

        if (overtimeHours > 0 && employee != null)
        {
            await _notificationService.NotifyAsync(employeeId, "Overtime", $"You worked {overtimeHours} overtime hour(s) on {session.AttendanceDate:yyyy-MM-dd}.");
            if (employee.SupervisorId.HasValue)
            {
                await _notificationService.NotifyAsync(employee.SupervisorId.Value, "Overtime", $"{employee.FirstName} {employee.LastName} worked {overtimeHours} overtime hour(s) on {session.AttendanceDate:yyyy-MM-dd}.");
            }
        }

        await _hubNotifier.BroadcastAttendanceUpdateAsync(employeeId);

        string? employeeName = employee != null ? $"{employee.FirstName} {employee.LastName}" : null;

        return (true, "Clock-out recorded successfully.", employeeName);
    }

    public async Task<IEnumerable<AttendanceHistoryDto>> GetEmployeeHistoryAsync(Guid employeeId)
    {
        var records = await _db.Attendance
            .Where(a => a.EmployeeId == employeeId)
            .OrderByDescending(a => a.AttendanceDate)
            .ThenByDescending(a => a.ClockIn)
            .ToListAsync();

        return records.Select(r => new AttendanceHistoryDto
        {
            AttendanceId = r.AttendanceId,
            AttendanceDate = r.AttendanceDate,
            ClockIn = r.ClockIn,
            ClockOut = r.ClockOut,
            Status = r.ClockOut.HasValue
                ? "Completed"
                : AttendanceCalculator.IsLate(r.ClockIn, _lateThreshold) ? "Checked in late" : "In Progress"
        });
    }

    public async Task<IEnumerable<TeamStatusDto>> GetTeamStatusAsync(Guid supervisorId)
    {
        DateTime today = SouthAfricaTime.TodayAsUtcTaggedDate();

        var teamMembers = await _db.Employees
            .Where(e => e.SupervisorId == supervisorId && e.IsActive)
            .ToListAsync();

        var teamIds = teamMembers.Select(t => t.EmployeeId).ToList();

        var todaysLogs = await _db.Attendance
            .Where(a => teamIds.Contains(a.EmployeeId) && a.AttendanceDate == today)
            .ToListAsync();

        var statusList = new List<TeamStatusDto>();

        foreach (var member in teamMembers)
        {
            var log = todaysLogs.FirstOrDefault(l => l.EmployeeId == member.EmployeeId);
            string status;

            if (log != null)
            {
                status = log.ClockOut != null
                    ? "Clocked Out"
                    : AttendanceCalculator.IsLate(log.ClockIn, _lateThreshold) ? "Checked in late" : "Clocked In";
            }
            else
            {
                status = _workDays.Contains(today.DayOfWeek) ? "Absent" : "Day Off";
            }

            statusList.Add(new TeamStatusDto
            {
                EmployeeId = member.EmployeeId,
                FullName = $"{member.FirstName} {member.LastName}",
                EmployeeNumber = member.EmployeeNumber,
                Status = status,
                ClockInTime = log?.ClockIn,
                SimilarityScore = log?.Confidence
            });
        }

        return statusList;
    }

    public async Task<byte[]> ExportPayrollCsvAsync(DateTime startDate, DateTime endDate)
    {
        var startUtc = DateTime.SpecifyKind(startDate.Date, DateTimeKind.Utc);
        var endUtc = DateTime.SpecifyKind(endDate.Date, DateTimeKind.Utc);

        var records = await _db.Attendance
            .Include(a => a.Employee)
            .Where(a => a.AttendanceDate >= startUtc && a.AttendanceDate <= endUtc)
            .OrderBy(a => a.AttendanceDate)
            .ToListAsync();

        var sb = new StringBuilder();
        sb.AppendLine("EmployeeNumber,EmployeeName,Date,ClockIn,ClockOut,HoursWorked,OvertimeHours,IsLate");

        foreach (var r in records)
        {
            double hours = 0;
            if (r.ClockOut.HasValue)
            {
                hours = Math.Round((r.ClockOut.Value - r.ClockIn).TotalHours, 2);
            }

            double overtime = AttendanceCalculator.CalculateOvertimeHours(hours, _standardDailyHours);
            bool isLate = AttendanceCalculator.IsLate(r.ClockIn, _lateThreshold);

            sb.AppendLine($"\"{r.Employee.EmployeeNumber}\",\"{r.Employee.FirstName} {r.Employee.LastName}\",\"{r.AttendanceDate:yyyy-MM-dd}\",\"{r.ClockIn:HH:mm:ss}\",\"{r.ClockOut?.ToString("HH:mm:ss") ?? "N/A"}\",{hours},{overtime},{isLate}");
        }

        return Encoding.UTF8.GetBytes(sb.ToString());
    }

    private async Task<(Guid? EmployeeId, float Confidence, string Method, string? Error)> IdentifyEmployeeByBiometricAsync(IFormFile? faceImage)
    {
        if (faceImage == null || faceImage.Length == 0)
        {
            return (null, 0f, string.Empty, "Biometric verification is required: provide a face image.");
        }

        byte[] imageBytes = await ReadAllBytesAsync(faceImage);
        float[] inputVector;

        try
        {
            inputVector = await _facialService.ExtractEmbeddingAsync(imageBytes);
        }
        catch (Exception ex) when (ex is ArgumentException or InvalidOperationException)
        {
            return (null, 0f, "Face", $"Facial recognition failed: {ex.Message}");
        }

        var profiles = await _db.FaceProfiles
            .Include(fp => fp.Employee)
            .Where(fp => fp.Employee.IsActive)
            .ToListAsync();

        var knownProfiles = profiles.ToDictionary(fp => fp.EmployeeId, fp => MathUtility.ToFloatArray(fp.FaceEmbedding));
        var match = _facialService.MatchFace(inputVector, knownProfiles, threshold: 0.75f);

        if (!match.EmployeeId.HasValue)
        {
            return (null, match.SimilarityScore, "Face", "Facial recognition failed: Face not recognized or low confidence score.");
        }

        return (match.EmployeeId, match.SimilarityScore, "Face", null);
    }

    private static async Task<byte[]> ReadAllBytesAsync(IFormFile file)
    {
        using var ms = new MemoryStream();
        await file.CopyToAsync(ms);
        return ms.ToArray();
    }
}
