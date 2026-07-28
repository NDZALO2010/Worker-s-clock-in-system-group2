using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ClockingManagement.API.Models;

public class FaceProfile
{
    [Key]
    public int FaceProfileId { get; set; }

    public int EmployeeId { get; set; }

    [ForeignKey(nameof(EmployeeId))]
    public Employee Employee { get; set; } = null!;

    public byte[] FaceEmbedding { get; set; } = Array.Empty<byte>();

    public string BoundingBox { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}