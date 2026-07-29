using System.ComponentModel.DataAnnotations;

namespace ClockingManagement.API.DTOs;

public class CreateEmployeeRequest
{
    [Required]
    [MaxLength(20)]
    public string EmployeeNumber { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string FirstName { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string LastName { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    // Optional - only required for Admin, HR and Supervisor
    [MinLength(8)]
    public string? Password { get; set; }

    [Required]
    public string Role { get; set; } = "Employee";

    public int DepartmentId { get; set; }

    public int? SupervisorId { get; set; }

    public bool IsActive { get; set; } = true;

    public bool PopiaConsentGranted { get; set; }
}