using ClockingManagement.API.DTOs;
using ClockingManagement.API.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ClockingManagement.API.Controllers;


[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly IAuditService _auditService;
   public AuthController(
    IAuthService authService,
    IAuditService auditService)
    {
        _authService = authService;
        _auditService = auditService;
    }

    /// <summary>
    /// Register a new employee
    /// </summary>
    
    [AllowAnonymous]
    [HttpPost("register")]
    //[Authorize(Roles = "HR,Admin")]
    public async Task<IActionResult> Register(RegisterRequest request)
    {
        var success = await _authService.RegisterAsync(request);

        if (!success)
        {
            await _auditService.LogAsync(
                "Registration Failed",
                request.Email,
                HttpContext.Connection.RemoteIpAddress?.ToString() ?? "Unknown",
                "Duplicate employee or email.");

            return BadRequest(new
            {
                message = "Employee already exists."
            });
        }

        await _auditService.LogAsync(
            "Employee Registered",
            request.Email,
            HttpContext.Connection.RemoteIpAddress?.ToString() ?? "Unknown",
            $"Employee {request.EmployeeNumber} was registered.");

        return Ok(new
        {
            message = "Employee registered successfully."
        });
    }

    /// <summary>
    /// Login employee
    /// </summary>
    [AllowAnonymous]
[HttpPost("login")]
public async Task<IActionResult> Login(LoginRequest request)
{
    var response = await _authService.LoginAsync(request);

    if (response == null)
    {
        await _auditService.LogAsync(
            "Failed Login",
            request.Email,
            HttpContext.Connection.RemoteIpAddress?.ToString() ?? "Unknown",
            "Invalid credentials.");

        return Unauthorized(new
        {
            message = "Only Admin, HR and Supervisor can log in to the management portal."
        });
    }

    await _auditService.LogAsync(
        "Login Successful",
        request.Email,
        HttpContext.Connection.RemoteIpAddress?.ToString() ?? "Unknown",
        "User authenticated successfully.");

    return Ok(response);
}


   
   // public AuthController(
     //   IAuthService authService,
     //   IAuditService auditService)
   /* {
        _authService = authService;
        _auditService = auditService;
    }*/
}