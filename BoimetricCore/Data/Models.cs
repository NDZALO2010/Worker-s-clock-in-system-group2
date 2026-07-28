using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BiometricCore.Data;

public class AttendanceRecord
{
    [Key]
    public Guid AttendanceId { get; set; }
    public Guid EmployeeId { get; set; }
    public DateTime AttendanceDate { get; set; }
    public DateTime ClockIn { get; set; }
    public DateTime? ClockOut { get; set; }
    public double Lat { get; set; }
    public double Long { get; set; }
    public string DeviceName { get; set; } = string.Empty;
    public float Confidence { get; set; }
    public Employee Employee { get; set; } = null!;
}

public class FaceProfile
{
    [Key]
    public Guid FaceProfileId { get; set; }
    public Guid EmployeeId { get; set; }
    public byte[] FaceEmbedding { get; set; } = Array.Empty<byte>();
    public Employee Employee { get; set; } = null!;
}

public class Employee
{
    [Key]
    public Guid EmployeeId { get; set; }
    public string EmployeeNumber { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public Guid? SupervisorId { get; set; }
    public ICollection<FaceProfile> FaceProfiles { get; set; } = new List<FaceProfile>();
    public ICollection<AttendanceRecord> Attendance { get; set; } = new List<AttendanceRecord>();
}
