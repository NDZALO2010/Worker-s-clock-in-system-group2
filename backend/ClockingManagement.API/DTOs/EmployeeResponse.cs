namespace ClockingManagement.API.DTOs;

public class EmployeeResponse
{
    public int EmployeeId { get; set; }

    public string EmployeeNumber { get; set; } = string.Empty;

    public string FirstName { get; set; } = string.Empty;

    public string LastName { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string Role { get; set; } = string.Empty;

    public int DepartmentId { get; set; }

    public int? SupervisorId { get; set; }

    public bool IsActive { get; set; }

    public bool PopiaConsentGranted { get; set; }
}