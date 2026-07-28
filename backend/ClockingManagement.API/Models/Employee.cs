using System.ComponentModel.DataAnnotations;

namespace ClockingManagement.API.Models;

public class Employee
{
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

    [Required]
    [MaxLength(150)]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string PasswordHash { get; set; } = string.Empty;

    [Required]
    [MaxLength(20)]
    public string Role { get; set; } = "Employee";

    public int DepartmentId { get; set; }

    public int? SupervisorId { get; set; }

    public bool IsActive { get; set; }

    public bool PopiaConsentGranted { get; set; }
}