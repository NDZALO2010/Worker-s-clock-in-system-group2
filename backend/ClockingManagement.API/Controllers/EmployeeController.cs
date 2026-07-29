using ClockingManagement.API.Data;
using ClockingManagement.API.Interfaces;
using ClockingManagement.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using ClockingManagement.API.DTOs;
using BCrypt.Net;

namespace ClockingManagement.API.Controllers;

[ApiController]
[Route("api/[controller]")]
//[Authorize(Roles = "Admin")]
[AllowAnonymous]
[EnableRateLimiting("AdminLimiter")]
public class EmployeeController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IAuditService _auditService;

    public EmployeeController(
        ApplicationDbContext context,
        IAuditService auditService)
    {
        _context = context;
        _auditService = auditService;
    }

    // CREATE EMPLOYEE
    [HttpPost]
    public async Task<IActionResult> CreateEmployee([FromBody] CreateEmployeeRequest request)
    {
        if (request.Role != "Employee" &&
            string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest("Password is required for Admin, HR and Supervisor.");
        }

        var employee = new Employee
        {
            EmployeeNumber = request.EmployeeNumber,
            FirstName = request.FirstName,
            LastName = request.LastName,
            Email = request.Email,
            Role = request.Role,
            DepartmentId = request.DepartmentId,
            SupervisorId = request.SupervisorId,
            IsActive = request.IsActive,
            PopiaConsentGranted = request.PopiaConsentGranted,

            PasswordHash = request.Role == "Employee"
                ? string.Empty
                : BCrypt.Net.BCrypt.HashPassword(request.Password!)
        };

        _context.Employees.Add(employee);

        await _context.SaveChangesAsync();

        await _auditService.LogAsync(
            "Employee Created",
            User.Identity?.Name ?? "System",
            HttpContext.Connection.RemoteIpAddress?.ToString() ?? "Unknown",
            $"Employee {employee.EmployeeNumber} created.");

        var response = new EmployeeResponse
        {
            EmployeeId = employee.EmployeeId,
            EmployeeNumber = employee.EmployeeNumber,
            FirstName = employee.FirstName,
            LastName = employee.LastName,
            Email = employee.Email,
            Role = employee.Role,
            DepartmentId = employee.DepartmentId,
            SupervisorId = employee.SupervisorId,
            IsActive = employee.IsActive,
            PopiaConsentGranted = employee.PopiaConsentGranted
        };

        return CreatedAtAction(nameof(GetEmployeeById),
            new { id = employee.EmployeeId },
            response);
    }

    // GET ALL EMPLOYEES
    [HttpGet]
    public async Task<IActionResult> GetEmployees()
    {
        var employees = await _context.Employees.ToListAsync();

        return Ok(employees);
    }

    // GET EMPLOYEE BY ID
    [HttpGet("{id}")]
    public async Task<IActionResult> GetEmployeeById(int id)
    {
        var employee = await _context.Employees.FindAsync(id);

        if (employee == null)
            return NotFound();

        var response = new EmployeeResponse
        {
            EmployeeId = employee.EmployeeId,
            EmployeeNumber = employee.EmployeeNumber,
            FirstName = employee.FirstName,
            LastName = employee.LastName,
            Email = employee.Email,
            Role = employee.Role,
            DepartmentId = employee.DepartmentId,
            SupervisorId = employee.SupervisorId,
            IsActive = employee.IsActive,
            PopiaConsentGranted = employee.PopiaConsentGranted
        };

        return Ok(response);
    }

    // UPDATE EMPLOYEE
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateEmployee(
        int id,
        UpdateEmployeeRequest updatedEmployee)
    {
        var employee = await _context.Employees.FindAsync(id);

        if (employee == null)
            return NotFound();

        employee.EmployeeNumber = updatedEmployee.EmployeeNumber;
        employee.FirstName = updatedEmployee.FirstName;
        employee.LastName = updatedEmployee.LastName;
        employee.Email = updatedEmployee.Email;
        employee.Role = updatedEmployee.Role;
        employee.DepartmentId = updatedEmployee.DepartmentId;
        employee.SupervisorId = updatedEmployee.SupervisorId;
        employee.IsActive = updatedEmployee.IsActive;
        employee.PopiaConsentGranted = updatedEmployee.PopiaConsentGranted;

        await _context.SaveChangesAsync();

        await _auditService.LogAsync(
            "Employee Updated",
            User.Identity?.Name ?? "System",
            HttpContext.Connection.RemoteIpAddress?.ToString() ?? "Unknown",
            $"Employee {employee.EmployeeNumber} updated.");

        return Ok(employee);
    }

    // DELETE EMPLOYEE
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteEmployee(int id)
    {
        var employee = await _context.Employees.FindAsync(id);

        if (employee == null)
            return NotFound();

        _context.Employees.Remove(employee);

        await _context.SaveChangesAsync();

        await _auditService.LogAsync(
            "Employee Deleted",
            User.Identity?.Name ?? "System",
            HttpContext.Connection.RemoteIpAddress?.ToString() ?? "Unknown",
            $"Employee {employee.EmployeeNumber} deleted.");

        return NoContent();
    }
}