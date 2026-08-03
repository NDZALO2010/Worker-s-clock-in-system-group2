using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using BiometricCore.Entities;
using Microsoft.IdentityModel.Tokens;

namespace BiometricCore.Services;

public interface IJwtService
{
    string GenerateToken(Employee employee);
}

public class JwtService : IJwtService
{
    private readonly IConfiguration _config;

    public JwtService(IConfiguration config)
    {
        _config = config;
    }

    public string GenerateToken(Employee employee)
    {
        var secretKey = _config["Jwt:Secret"];
        if (string.IsNullOrWhiteSpace(secretKey))
        {
            throw new InvalidOperationException("Jwt:Secret is not configured. Set it via environment variable Jwt__Secret or dotnet user-secrets before starting the application.");
        }

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, employee.EmployeeId.ToString()),
            new Claim(ClaimTypes.Email, employee.Email),
            new Claim(ClaimTypes.Role, employee.Role),
            new Claim("EmployeeNumber", employee.EmployeeNumber)
        };

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"] ?? "BiometricCoreAPI",
            audience: _config["Jwt:Audience"] ?? "BiometricCoreApp",
            claims: claims,
            expires: DateTime.UtcNow.AddHours(8),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
