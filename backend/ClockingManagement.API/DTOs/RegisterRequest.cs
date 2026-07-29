using System.ComponentModel.DataAnnotations;

namespace ClockingManagement.API.DTOs;

public class RegisterRequest
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

    [Required]
    [MinLength(8)]
    public string Password { get; set; } = string.Empty;

    public int DepartmentId { get; set; }

    public int? SupervisorId { get; set; }

    public bool PopiaConsentGranted { get; set; }

    public string Role { get; set; } = "Employee";
}