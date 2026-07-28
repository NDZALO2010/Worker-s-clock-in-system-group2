using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ClockingManagement.API.Models;

public class Employee
{
    [Key]
    public int EmployeeId { get; set; }

    [Required]
    [MaxLength(20)]
    public string EmployeeNumber { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string FirstName { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string LastName { get; set; } = string.Empty;

    public int DepartmentId { get; set; }

    public int? SupervisorId { get; set; }

    public bool IsActive { get; set; } = true;

    public bool PopiaConsentGranted { get; set; }

    public ICollection<Attendance> Attendances { get; set; } = new List<Attendance>();

    public ICollection<FaceProfile> FaceProfiles { get; set; } = new List<FaceProfile>();

    public ICollection<FingerprintProfile> FingerprintProfiles { get; set; } = new List<FingerprintProfile>();
}