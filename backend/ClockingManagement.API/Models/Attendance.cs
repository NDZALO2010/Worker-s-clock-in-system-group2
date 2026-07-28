using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ClockingManagement.API.Models;

public class Attendance
{
    [Key]
    public int AttendanceId { get; set; }

    public int EmployeeId { get; set; }

    [ForeignKey(nameof(EmployeeId))]
    public Employee Employee { get; set; } = null!;

    public DateOnly AttendanceDate { get; set; }

    public DateTime? ClockIn { get; set; }

    public DateTime? ClockOut { get; set; }

    [MaxLength(20)]
    public string ClockType { get; set; } = string.Empty;

    public double? Lat { get; set; }

    public double? Long { get; set; }

    [MaxLength(100)]
    public string DeviceName { get; set; } = string.Empty;

    public double Confidence { get; set; }
}