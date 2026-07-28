using System.Text;
using BiometricCore.Data;
using BiometricCore.DTOs;
using BiometricCore.Utilities;
using Microsoft.EntityFrameworkCore;

namespace BiometricCore.Services;

public class AttendanceService : IAttendanceService
{
    private readonly AppDbContext _db;
    private readonly IFacialRecognitionService _facialService;
    private readonly IConfiguration _config;
    private readonly ILogger<AttendanceService> _logger;

    // Configured workplace geofence coordinates (e.g., Office Location)
    private readonly double _officeLat;
    private readonly double _officeLong;
    private readonly double _geofenceRadiusMeters;

    public AttendanceService(
        AppDbContext db,
        IFacialRecognitionService facialService,
        IConfiguration config,
        ILogger<AttendanceService> logger)
    {
        _db = db;
        _facialService = facialService;
        _config = config;
        _logger = logger;

        _officeLat = double.Parse(_config["Geofence:OfficeLatitude"] ?? "-25.7479");
        _officeLong = double.Parse(_config["Geofence:OfficeLongitude"] ?? "28.2293");
        _geofenceRadiusMeters = double.Parse(_config["Geofence:RadiusMeters"] ?? "500");
    }

    public async Task<(bool Success, string Message, Guid? AttendanceId)> ClockInAsync(ClockInRequestDto dto)
    {
        // 1. Geofence Verification
        double distance = GeoUtility.CalculateDistanceMeters(dto.Latitude, dto.Longitude, _officeLat, _officeLong);
        if (distance > _geofenceRadiusMeters)
        {
            _logger.LogWarning("Clock-in rejected: Outside geofence radius ({Distance}m away)", distance);
            return (false, $"Clock-in rejected: You are {Math.Round(distance)}m away from the permitted workplace location.", null);
        }

        // 2. Decode Image & Generate Input Face Embedding
        using var ms = new MemoryStream();
        await dto.FaceImage.CopyToAsync(ms);
        byte[] imageBytes = ms.ToArray();
        float[] inputVector = await _facialService.ExtractEmbeddingAsync(imageBytes);

        // 3. Load Registered Active Employee Face Profiles from DB
        var registeredProfiles = await _db.FaceProfiles
            .Include(fp => fp.Employee)
            .Where(fp => fp.Employee.IsActive)
            .ToListAsync();

        var knownProfiles = registeredProfiles.ToDictionary(
            fp => fp.EmployeeId,
            fp => MathUtility.ToFloatArray(fp.FaceEmbedding)
        );

        // 4. Perform 1:N Facial Match
        var matchResult = _facialService.MatchFace(inputVector, knownProfiles, threshold: 0.75f);
        if (!matchResult.EmployeeId.HasValue)
        {
            _logger.LogWarning("Unrecognized face attempted clock-in. Max confidence: {Score}", matchResult.SimilarityScore);
            return (false, "Facial recognition failed: Face not recognized or low confidence score.", null);
        }

        Guid employeeId = matchResult.EmployeeId.Value;
        DateTime now = DateTime.UtcNow;

        // 5. Check if Employee already has an active clock-in session without clock-out
        var activeSession = await _db.Attendance
            .FirstOrDefaultAsync(a => a.EmployeeId == employeeId && a.ClockOut == null && a.AttendanceDate == now.Date);

        if (activeSession != null)
        {
            return (false, "You already have an active clock-in session for today. Please clock out first.", null);
        }

        // 6. Record Clock-In Entry
        var attendanceRecord = new AttendanceRecord
        {
            AttendanceId = Guid.NewGuid(),
            EmployeeId = employeeId,
            AttendanceDate = now.Date,
            ClockIn = now,
            ClockOut = null,
            Lat = dto.Latitude,
            Long = dto.Longitude,
            DeviceName = dto.DeviceName,
            Confidence = matchResult.SimilarityScore
        };

        _db.Attendance.Add(attendanceRecord);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Employee {EmployeeId} clocked in successfully.", employeeId);
        return (true, $"Clock-in recorded successfully. Welcome!", attendanceRecord.AttendanceId);
    }

    public async Task<(bool Success, string Message)> ClockOutAsync(ClockOutRequestDto dto)
    {
        DateTime now = DateTime.UtcNow;

        // Retrieve active session
        var session = await _db.Attendance
            .FirstOrDefaultAsync(a => a.EmployeeId == dto.EmployeeId && a.ClockOut == null);

        if (session == null)
        {
            return (false, "No active clock-in session found for this employee.");
        }

        session.ClockOut = now;
        _db.Attendance.Update(session);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Employee {EmployeeId} clocked out successfully.", dto.EmployeeId);
        return (true, "Clock-out recorded successfully.");
    }

    public async Task<IEnumerable<TeamStatusDto>> GetTeamStatusAsync(Guid supervisorId)
    {
        DateTime today = DateTime.UtcNow.Date;

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
            string status = "Absent";

            if (log != null)
            {
                // Standard threshold: Clock-in after 08:30 AM considered LATE
                status = log.ClockIn.TimeOfDay > new TimeSpan(8, 30, 0) ? "Late" : "Present";
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
        var records = await _db.Attendance
            .Include(a => a.Employee)
            .Where(a => a.AttendanceDate >= startDate.Date && a.AttendanceDate <= endDate.Date)
            .OrderBy(a => a.AttendanceDate)
            .ToListAsync();

        var sb = new StringBuilder();
        sb.AppendLine("EmployeeNumber,EmployeeName,Date,ClockIn,ClockOut,HoursWorked,IsLate");

        foreach (var r in records)
        {
            double hours = 0;
            if (r.ClockOut.HasValue)
            {
                hours = Math.Round((r.ClockOut.Value - r.ClockIn).TotalHours, 2);
            }

            bool isLate = r.ClockIn.TimeOfDay > new TimeSpan(8, 30, 0);

            sb.AppendLine($"\"{r.Employee.EmployeeNumber}\",\"{r.Employee.FirstName} {r.Employee.LastName}\",\"{r.AttendanceDate:yyyy-MM-dd}\",\"{r.ClockIn:HH:mm:ss}\",\"{r.ClockOut?.ToString("HH:mm:ss") ?? "N/A"}\",{hours},{isLate}");
        }

        return Encoding.UTF8.GetBytes(sb.ToString());
    }
}