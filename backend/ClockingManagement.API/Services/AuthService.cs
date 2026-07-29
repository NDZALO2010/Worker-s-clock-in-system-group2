using BCrypt.Net;
using ClockingManagement.API.Data;
using ClockingManagement.API.DTOs;
using ClockingManagement.API.Helpers;
using ClockingManagement.API.Interfaces;
using ClockingManagement.API.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace ClockingManagement.API.Services;

public class AuthService : IAuthService
{
    private readonly ApplicationDbContext _context;
    private readonly JwtSettings _jwtSettings;

    public AuthService(
        ApplicationDbContext context,
        IOptions<JwtSettings> jwtOptions)
    {
        _context = context;
        _jwtSettings = jwtOptions.Value;
    }

    public async Task<bool> RegisterAsync(RegisterRequest request)
    {
        // Check if email already exists
        if (await _context.Employees.AnyAsync(e => e.Email == request.Email))
            return false;

        // Check if employee number already exists
        if (await _context.Employees.AnyAsync(e => e.EmployeeNumber == request.EmployeeNumber))
            return false;

        var employee = new Employee
        {
            EmployeeNumber = request.EmployeeNumber,
            FirstName = request.FirstName,
            LastName = request.LastName,
            Email = request.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            Role = string.IsNullOrWhiteSpace(request.Role)
                ? "Employee"
                : request.Role,
            DepartmentId = request.DepartmentId,
            SupervisorId = request.SupervisorId,
            PopiaConsentGranted = request.PopiaConsentGranted,
            IsActive = true
        };

        _context.Employees.Add(employee);

        await _context.SaveChangesAsync();

        return true;
    }

    public async Task<LoginResponse?> LoginAsync(LoginRequest request)
    {
        var employee = await _context.Employees
            .FirstOrDefaultAsync(e => e.Email == request.Email);

        if (employee == null)
        {
            Console.WriteLine("Employee not found.");
            return null;
        }

        Console.WriteLine($"Role: {employee.Role}");
        Console.WriteLine($"Stored Hash: {employee.PasswordHash}");

        var validPassword = BCrypt.Net.BCrypt.Verify(
            request.Password,
            employee.PasswordHash);

        Console.WriteLine($"Password Valid: {validPassword}");

        if (!validPassword)
            return null;

        if (employee.Role == "Employee")
        {
            Console.WriteLine("Employee role cannot access management portal.");
            return null;
        }

        var claims = new List<Claim>
        {
            new Claim(JwtRegisteredClaimNames.Sub, employee.EmployeeId.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, employee.Email),
            new Claim(ClaimTypes.Name, employee.FirstName + " " + employee.LastName),
            new Claim(ClaimTypes.Role, employee.Role),
            new Claim("EmployeeNumber", employee.EmployeeNumber)
        };

        var key = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(_jwtSettings.Key));

        var credentials = new SigningCredentials(
            key,
            SecurityAlgorithms.HmacSha256);

        var expires = DateTime.UtcNow.AddMinutes(_jwtSettings.ExpiryMinutes);

        var token = new JwtSecurityToken(
            issuer: _jwtSettings.Issuer,
            audience: _jwtSettings.Audience,
            claims: claims,
            expires: expires,
            signingCredentials: credentials);

        return new LoginResponse
        {
            Token = new JwtSecurityTokenHandler().WriteToken(token),
            ExpiresAt = expires,
            EmployeeNumber = employee.EmployeeNumber,
            FullName = employee.FirstName + " " + employee.LastName,
            Role = employee.Role
        };
    }
}