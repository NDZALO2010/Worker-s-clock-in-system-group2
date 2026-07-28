using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ClockingManagement.API.Models;

public class FingerprintProfile
{
    [Key]
    public int FingerprintProfileId { get; set; }

    public int EmployeeId { get; set; }

    [ForeignKey(nameof(EmployeeId))]
    public Employee Employee { get; set; } = null!;

    public int FingerIndex { get; set; }

    public byte[] MinutiaeTemplate { get; set; } = Array.Empty<byte>();

    public double QualityScore { get; set; }
}