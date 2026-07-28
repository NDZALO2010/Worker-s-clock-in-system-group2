namespace BiometricCore.DTOs;

public class ClockInRequestDto
{
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public string DeviceName { get; set; } = "Mobile/Kiosk";
    public IFormFile FaceImage { get; set; } = null!;
}

public class ClockOutRequestDto
{
    public Guid EmployeeId { get; set; }
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public string DeviceName { get; set; } = "Mobile/Kiosk";
}

public class TeamStatusDto
{
    public Guid EmployeeId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string EmployeeNumber { get; set; } = string.Empty;
    public string Status { get; set; } = "Absent"; // Present, Late, Absent
    public DateTime? ClockInTime { get; set; }
    public double? SimilarityScore { get; set; }
}

public class PayrollExportDto
{
    public string EmployeeNumber { get; set; } = string.Empty;
    public string EmployeeName { get; set; } = string.Empty;
    public string Date { get; set; } = string.Empty;
    public string ClockIn { get; set; } = string.Empty;
    public string ClockOut { get; set; } = string.Empty;
    public double TotalHoursWorked { get; set; }
    public bool IsLate { get; set; }
}