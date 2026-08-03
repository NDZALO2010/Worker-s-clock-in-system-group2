using System.Security.Claims;
using BiometricCore.Data;
using BiometricCore.DTOs;
using BiometricCore.Entities;
using BiometricCore.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BiometricCore.Controllers;

[ApiController]
[Route("api/v1/auth")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IJwtService _jwtService;
    private readonly ILogger<AuthController> _logger;
    private readonly IConfiguration _configuration;
    private readonly IWebHostEnvironment _env;

    public AuthController(AppDbContext db, IJwtService jwtService, ILogger<AuthController> logger, IConfiguration configuration, IWebHostEnvironment env)
    {
        _db = db;
        _jwtService = jwtService;
        _logger = logger;
        _configuration = configuration;
        _env = env;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequestDto dto)
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "Unknown";
        var approvedIps = (_configuration["Security:ApprovedIpAddresses"] ?? "127.0.0.1,::1")
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        string NormalizeIp(string input) => input.StartsWith("::ffff:", StringComparison.OrdinalIgnoreCase) ? input[7..] : input;
        var normalizedIp = NormalizeIp(ipAddress);
        var isApprovedIp = approvedIps.Any(approved => NormalizeIp(approved).Equals(normalizedIp, StringComparison.OrdinalIgnoreCase));

        if (!isApprovedIp)
        {
            var deniedLog = new AuditLog
            {
                Action = "Login Denied",
                PerformedBy = dto.Email,
                IpAddress = ipAddress,
                Timestamp = DateTime.UtcNow,
                Details = "Access denied because the IP address is not approved."
            };

            _db.AuditLogs.Add(deniedLog);
            await _db.SaveChangesAsync();

            _logger.LogWarning("Denied login attempt for {Email} from unapproved IP {IpAddress}", dto.Email, ipAddress);
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Access denied from this IP address." });
        }

        var employee = await _db.Employees.FirstOrDefaultAsync(e => e.Email == dto.Email);

        if (employee == null || !employee.IsActive || !BCrypt.Net.BCrypt.Verify(dto.Password, employee.PasswordHash))
        {
            var failedLog = new AuditLog
            {
                Action = "Login Failed",
                PerformedBy = dto.Email,
                IpAddress = ipAddress,
                Timestamp = DateTime.UtcNow,
                Details = "Invalid credentials supplied."
            };

            _db.AuditLogs.Add(failedLog);
            await _db.SaveChangesAsync();

            _logger.LogWarning("Failed login attempt for {Email} from {IpAddress}", dto.Email, ipAddress);
            return Unauthorized(new { message = "Invalid credentials." });
        }

        var token = _jwtService.GenerateToken(employee);
        _logger.LogInformation("User {Email} authenticated successfully from {IpAddress}", dto.Email, ipAddress);

        return Ok(new { token, employee = new { employee.EmployeeId, employee.EmployeeNumber, employee.FirstName, employee.LastName, employee.Email, employee.Role } });
    }

    private async Task<Guid?> ResolveSupervisorIdAsync(string? supervisorReference)
    {
        if (string.IsNullOrWhiteSpace(supervisorReference))
        {
            return null;
        }

        if (Guid.TryParse(supervisorReference, out var parsedSupervisorId))
        {
            var employeeExists = await _db.Employees.AnyAsync(e => e.EmployeeId == parsedSupervisorId);
            if (!employeeExists)
            {
                throw new InvalidOperationException("The specified supervisor does not exist.");
            }

            return parsedSupervisorId;
        }

        var employee = await _db.Employees.FirstOrDefaultAsync(e => e.EmployeeNumber == supervisorReference);
        if (employee == null)
        {
            throw new InvalidOperationException("The specified supervisor does not exist.");
        }

        return employee.EmployeeId;
    }

    [AllowAnonymous]
    [HttpPost("users")]
    public async Task<IActionResult> CreateUser([FromBody] CreateUserRequestDto dto)
    {
        var isAuthenticated = User.Identity?.IsAuthenticated == true;
        var isAdmin = User.IsInRole("Admin");

        if (isAuthenticated && !isAdmin)
        {
            return Forbid();
        }

        if (await _db.Employees.AnyAsync(e => e.Email == dto.Email))
        {
            return Conflict(new { message = "A user with that email already exists." });
        }

        if (await _db.Employees.AnyAsync(e => e.EmployeeNumber == dto.EmployeeNumber))
        {
            return Conflict(new { message = "A user with that employee number already exists." });
        }

        Guid? supervisorId = null;
        if (!string.IsNullOrWhiteSpace(dto.SupervisorId))
        {
            try
            {
                supervisorId = await ResolveSupervisorIdAsync(dto.SupervisorId);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        try
        {
            var employee = new Employee
            {
                EmployeeNumber = dto.EmployeeNumber,
                FirstName = dto.FirstName,
                LastName = dto.LastName,
                Email = dto.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                Role = dto.Role,
                SupervisorId = supervisorId,
                IsActive = dto.IsActive,
                PopiaConsentGranted = dto.PopiaConsentGranted,
                CreatedAt = DateTime.UtcNow
            };

            _db.Employees.Add(employee);
            await _db.SaveChangesAsync();

            return Ok(new { message = "User created successfully.", employeeId = employee.EmployeeId });
        }
        catch (DbUpdateException ex)
        {
            _logger.LogError(ex, "Failed to create user {Email}", dto.Email);
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                message = "User creation failed due to a database error.",
                details = ex.InnerException?.Message ?? ex.Message
            });
        }
    }

    [HttpPut("users/{employeeId:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateUser(Guid employeeId, [FromBody] UpdateUserRequestDto dto)
    {
        var employee = await _db.Employees.FindAsync(employeeId);
        if (employee == null)
        {
            return NotFound(new { message = "User not found." });
        }

        employee.EmployeeNumber = dto.EmployeeNumber;
        employee.FirstName = dto.FirstName;
        employee.LastName = dto.LastName;
        employee.Email = dto.Email;
        employee.Role = dto.Role;

        if (!string.IsNullOrWhiteSpace(dto.SupervisorId))
        {
            try
            {
                employee.SupervisorId = await ResolveSupervisorIdAsync(dto.SupervisorId);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
        else
        {
            employee.SupervisorId = null;
        }

        employee.IsActive = dto.IsActive;

        if (!string.IsNullOrWhiteSpace(dto.Password))
        {
            employee.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password);
        }

        await _db.SaveChangesAsync();
        return Ok(new { message = "User updated successfully." });
    }

    [HttpDelete("users/{employeeId:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeactivateUser(Guid employeeId)
    {
        var employee = await _db.Employees.FindAsync(employeeId);
        if (employee == null)
        {
            return NotFound(new { message = "User not found." });
        }

        employee.IsActive = false;
        await _db.SaveChangesAsync();
        return Ok(new { message = "User deactivated successfully." });
    }

    [HttpPost("users/{employeeId:guid}/activate")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> ActivateUser(Guid employeeId)
    {
        var employee = await _db.Employees.FindAsync(employeeId);
        if (employee == null)
        {
            return NotFound(new { message = "User not found." });
        }

        employee.IsActive = true;
        await _db.SaveChangesAsync();
        return Ok(new { message = "User activated successfully." });
    }

    [HttpDelete("users/{employeeId:guid}/permanent")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteUser(Guid employeeId)
    {
        if (Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var callerId) && callerId == employeeId)
        {
            return BadRequest(new { message = "You cannot delete your own account." });
        }

        var employee = await _db.Employees.FindAsync(employeeId);
        if (employee == null)
        {
            return NotFound(new { message = "User not found." });
        }

        _db.Employees.Remove(employee);

        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (ex.InnerException is Npgsql.PostgresException pgEx &&
            (pgEx.SqlState == Npgsql.PostgresErrorCodes.ForeignKeyViolation || pgEx.SqlState == Npgsql.PostgresErrorCodes.RestrictViolation))
        {
            return Conflict(new { message = "Cannot delete this employee because they are set as supervisor for other employees. Reassign those employees to a different supervisor first." });
        }

        _db.AuditLogs.Add(new AuditLog
        {
            Action = "Employee Deleted",
            PerformedBy = User.FindFirstValue(ClaimTypes.Email) ?? "Unknown",
            IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "Unknown",
            Timestamp = DateTime.UtcNow,
            Details = $"Permanently deleted employee {employeeId} ({employee.EmployeeNumber})."
        });
        await _db.SaveChangesAsync();

        return Ok(new { message = "User deleted successfully." });
    }

    [HttpGet("users")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> ListUsers()
    {
        var users = await _db.Employees
            .Select(e => new { e.EmployeeId, e.EmployeeNumber, e.FirstName, e.LastName, e.Email, e.Role, e.IsActive, e.SupervisorId })
            .ToListAsync();

        return Ok(users);
    }

    [HttpPost("consent")]
    [Authorize]
    public async Task<IActionResult> GrantPopiaConsent()
    {
        if (!Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var employeeId))
        {
            return Unauthorized(new { message = "Authenticated employee context is required." });
        }

        var employee = await _db.Employees.FindAsync(employeeId);
        if (employee == null)
        {
            return NotFound(new { message = "Employee not found." });
        }

        employee.PopiaConsentGranted = true;
        _db.AuditLogs.Add(new AuditLog
        {
            Action = "POPIA Consent Granted",
            PerformedBy = employee.Email,
            IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "Unknown",
            Timestamp = DateTime.UtcNow,
            Details = $"Employee {employeeId} granted consent to biometric data capture."
        });

        await _db.SaveChangesAsync();
        return Ok(new { message = "POPIA consent granted. You may now register biometric data." });
    }

    [HttpDelete("users/{employeeId:guid}/biometric-data")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> EraseBiometricData(Guid employeeId)
    {
        var employee = await _db.Employees.FindAsync(employeeId);
        if (employee == null)
        {
            return NotFound(new { message = "User not found." });
        }

        var faceProfiles = await _db.FaceProfiles.Where(fp => fp.EmployeeId == employeeId).ToListAsync();
        var fingerprintProfiles = await _db.FingerprintProfiles.Where(fp => fp.EmployeeId == employeeId).ToListAsync();

        _db.FaceProfiles.RemoveRange(faceProfiles);
        _db.FingerprintProfiles.RemoveRange(fingerprintProfiles);

        _db.AuditLogs.Add(new AuditLog
        {
            Action = "Biometric Data Erased",
            PerformedBy = User.FindFirstValue(ClaimTypes.Email) ?? "Unknown",
            IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "Unknown",
            Timestamp = DateTime.UtcNow,
            Details = $"Erased {faceProfiles.Count} face profile(s) and {fingerprintProfiles.Count} fingerprint profile(s) for employee {employeeId} (POPIA right to erasure)."
        });

        await _db.SaveChangesAsync();
        return Ok(new { message = "Biometric data erased successfully." });
    }
}
