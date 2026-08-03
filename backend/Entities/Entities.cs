using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BiometricCore.Entities;

[Table("Employees")]
public class Employee
{
    [Key]
    public Guid EmployeeId { get; set; } = Guid.NewGuid();

    [Required, MaxLength(50)]
    public string EmployeeNumber { get; set; } = string.Empty;

    [Required, MaxLength(100)]
    public string FirstName { get; set; } = string.Empty;

    [Required, MaxLength(100)]
    public string LastName { get; set; } = string.Empty;

    [Required, EmailAddress, MaxLength(150)]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string PasswordHash { get; set; } = string.Empty;

    [Required, MaxLength(50)]
    public string Role { get; set; } = "Employee"; // Admin, HR, Supervisor, Employee

    public Guid? SupervisorId { get; set; }

    [ForeignKey("SupervisorId")]
    public Employee? Supervisor { get; set; }

    public bool IsActive { get; set; } = true;

    public bool PopiaConsentGranted { get; set; } = false;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<FaceProfile> FaceProfiles { get; set; } = new List<FaceProfile>();
    public ICollection<FingerprintProfile> FingerprintProfiles { get; set; } = new List<FingerprintProfile>();
    public ICollection<AttendanceRecord> AttendanceRecords { get; set; } = new List<AttendanceRecord>();
}

[Table("FaceProfiles")]
public class FaceProfile
{
    [Key]
    public Guid FaceProfileId { get; set; } = Guid.NewGuid();

    [Required]
    public Guid EmployeeId { get; set; }

    [ForeignKey("EmployeeId")]
    public Employee Employee { get; set; } = null!;

    [Required]
    public byte[] FaceEmbedding { get; set; } = Array.Empty<byte>();

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

[Table("FingerprintProfiles")]
public class FingerprintProfile
{
    [Key]
    public Guid FingerprintProfileId { get; set; } = Guid.NewGuid();

    [Required]
    public Guid EmployeeId { get; set; }

    [ForeignKey("EmployeeId")]
    public Employee Employee { get; set; } = null!;

    [Required]
    public byte[] FingerprintTemplate { get; set; } = Array.Empty<byte>();

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

[Table("Attendance")]
public class AttendanceRecord
{
    [Key]
    public Guid AttendanceId { get; set; } = Guid.NewGuid();

    [Required]
    public Guid EmployeeId { get; set; }

    [ForeignKey("EmployeeId")]
    public Employee Employee { get; set; } = null!;

    [Required]
    public DateTime AttendanceDate { get; set; }

    [Required]
    public DateTime ClockIn { get; set; }

    public DateTime? ClockOut { get; set; }

    public double Lat { get; set; }
    public double Long { get; set; }

    [MaxLength(100)]
    public string DeviceName { get; set; } = string.Empty;

    public double Confidence { get; set; }

    [MaxLength(20)]
    public string AuthMethod { get; set; } = "Face";
}

[Table("Notifications")]
public class Notification
{
    [Key]
    public Guid NotificationId { get; set; } = Guid.NewGuid();

    [Required]
    public Guid EmployeeId { get; set; }

    [ForeignKey("EmployeeId")]
    public Employee Employee { get; set; } = null!;

    [Required, MaxLength(50)]
    public string Type { get; set; } = string.Empty;

    [Required]
    public string Message { get; set; } = string.Empty;

    public bool IsRead { get; set; } = false;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

[Table("AuditLogs")]
public class AuditLog
{
    [Key]
    public Guid AuditLogId { get; set; } = Guid.NewGuid();

    [Required, MaxLength(100)]
    public string Action { get; set; } = string.Empty;

    [MaxLength(150)]
    public string PerformedBy { get; set; } = "System";

    [MaxLength(50)]
    public string IpAddress { get; set; } = string.Empty;

    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    public string Details { get; set; } = string.Empty;
}
