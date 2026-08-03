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
    private readonly IFingerprintService _fingerprintService;
    private readonly INotificationService _notificationService;
    private readonly IAttendanceHubNotifier _hubNotifier;
    private readonly IConfiguration _config;
    private readonly ILogger<AttendanceService> _logger;

    private readonly double _officeLat;
    private readonly double _officeLong;
    private readonly double _geofenceRadiusMeters;
    private readonly double _standardDailyHours;
    private readonly TimeSpan _lateThreshold;
    private readonly HashSet<DayOfWeek> _workDays;

    public AttendanceService(
        AppDbContext db,
        IFacialRecognitionService facialService,
        IFingerprintService fingerprintService,
        INotificationService notificationService,
        IAttendanceHubNotifier hubNotifier,
        IConfiguration config,
        ILogger<AttendanceService> logger)
    {
        _db = db;
        _facialService = facialService;
        _fingerprintService = fingerprintService;
        _notificationService = notificationService;
        _hubNotifier = hubNotifier;
        _config = config;
        _logger = logger;

        _officeLat = double.Parse(_config["Geofence:OfficeLatitude"] ?? "-25.7479");
        _officeLong = double.Parse(_config["Geofence:OfficeLongitude"] ?? "28.2293");
        _geofenceRadiusMeters = double.Parse(_config["Geofence:RadiusMeters"] ?? "500");
        _standardDailyHours = double.Parse(_config["Attendance:StandardDailyHours"] ?? "8");
        _lateThreshold = TimeSpan.Parse(_config["Attendance:LateThresholdTime"] ?? "08:30:00");
        _workDays = (_config["Attendance:WorkDays"] ?? "Monday,Tuesday,Wednesday,Thursday,Friday")
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(Enum.Parse<DayOfWeek>)
            .ToHashSet();
    }

    public async Task<(bool Success, string Message, Guid? AttendanceId, string? EmployeeName)> ClockInAsync(ClockInRequestDto dto)
    {
        double distance = GeoUtility.CalculateDistanceMeters(dto.Latitude, dto.Longitude, _officeLat, _officeLong);
        if (distance > _geofenceRadiusMeters)
        {
            _logger.LogWarning("Clock-in rejected: Outside geofence radius ({Distance}m away)", distance);
            return (false, $"Clock-in rejected: You are {Math.Round(distance)}m away from the permitted workplace location.", null, null);
        }

        var identification = await IdentifyEmployeeByBiometricAsync(dto.FaceImage, dto.FingerprintImage);
        if (!identification.EmployeeId.HasValue)
        {
            _logger.LogWarning("Unrecognized {Method} attempted clock-in. Max confidence: {Score}", identification.Method, identification.Confidence);
            return (false, identification.Error ?? "Biometric verification failed.", null, null);
        }

        Guid employeeId = identification.EmployeeId.Value;
        DateTime now = DateTime.UtcNow;
        DateTime sastToday = SouthAfricaTime.ToSast(now).Date;

        var activeSession = await _db.Attendance
            .FirstOrDefaultAsync(a => a.EmployeeId == employeeId && a.ClockOut == null && a.AttendanceDate == sastToday);

        if (activeSession != null)
        {
            return (false, "You already have an active clock-in session for today. Please clock out first.", null, null);
        }

        var attendanceRecord = new AttendanceRecord
        {
            AttendanceId = Guid.NewGuid(),
            EmployeeId = employeeId,
            AttendanceDate = sastToday,
            ClockIn = now,
            ClockOut = null,
            Lat = dto.Latitude,
            Long = dto.Longitude,
            DeviceName = dto.DeviceName,
            Confidence = identification.Confidence,
            AuthMethod = identification.Method
        };

        _db.Attendance.Add(attendanceRecord);

        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
        {
            _logger.LogWarning("Concurrent clock-in detected for Employee {EmployeeId}; rejecting duplicate.", employeeId);
            return (false, "You already have an active clock-in session for today. Please clock out first.", null, null);
        }

        _logger.LogInformation("Employee {EmployeeId} clocked in successfully via {Method}.", employeeId, identification.Method);

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

        var identifiedEmployee = await _db.Employees.FindAsync(employeeId);
        string? employeeName = identifiedEmployee != null ? $"{identifiedEmployee.FirstName} {identifiedEmployee.LastName}" : null;

        return (true, "Clock-in recorded successfully. Welcome!", attendanceRecord.AttendanceId, employeeName);
    }

    public async Task<(bool Success, string Message, string? EmployeeName)> ClockOutAsync(ClockOutRequestDto dto)
    {
        var identification = await IdentifyEmployeeByBiometricAsync(dto.FaceImage, dto.FingerprintImage);
        if (!identification.EmployeeId.HasValue)
        {
            _logger.LogWarning("Unrecognized {Method} attempted clock-out. Max confidence: {Score}", identification.Method, identification.Confidence);
            return (false, identification.Error ?? "Biometric verification failed.", null);
        }

        Guid employeeId = identification.EmployeeId.Value;
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

        _logger.LogInformation("Employee {EmployeeId} clocked out successfully via {Method}.", employeeId, identification.Method);

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

    private async Task<(Guid? EmployeeId, float Confidence, string Method, string? Error)> IdentifyEmployeeByBiometricAsync(IFormFile? faceImage, IFormFile? fingerprintImage)
    {
        if (faceImage != null && faceImage.Length > 0)
        {
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

        if (fingerprintImage != null && fingerprintImage.Length > 0)
        {
            byte[] scanBytes = await ReadAllBytesAsync(fingerprintImage);
            float[] inputVector;

            try
            {
                inputVector = await _fingerprintService.ExtractTemplateAsync(scanBytes);
            }
            catch (Exception ex) when (ex is ArgumentException or InvalidOperationException)
            {
                return (null, 0f, "Fingerprint", $"Fingerprint recognition failed: {ex.Message}");
            }

            var profiles = await _db.FingerprintProfiles
                .Include(fp => fp.Employee)
                .Where(fp => fp.Employee.IsActive)
                .ToListAsync();

            var knownProfiles = profiles.ToDictionary(fp => fp.EmployeeId, fp => MathUtility.ToFloatArray(fp.FingerprintTemplate));
            var match = _fingerprintService.MatchFingerprint(inputVector, knownProfiles, threshold: 0.75f);

            if (!match.EmployeeId.HasValue)
            {
                return (null, match.SimilarityScore, "Fingerprint", "Fingerprint recognition failed: Fingerprint not recognized or low confidence score.");
            }

            return (match.EmployeeId, match.SimilarityScore, "Fingerprint", null);
        }

        return (null, 0f, string.Empty, "Biometric verification is required: provide a face image or fingerprint scan.");
    }

    private static async Task<byte[]> ReadAllBytesAsync(IFormFile file)
    {
        using var ms = new MemoryStream();
        await file.CopyToAsync(ms);
        return ms.ToArray();
    }
}
