using BiometricCore.Data;
using BiometricCore.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BiometricCore.Controllers;

[ApiController]
[Route("api/v1/ip-access")]
public class IpAccessController : ControllerBase
{
    private readonly AppDbContext _db;

    public IpAccessController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetLogs()
    {
        var logs = await _db.AuditLogs
            .Where(l => l.Action.Contains("auth", StringComparison.OrdinalIgnoreCase) || l.Action.Contains("login", StringComparison.OrdinalIgnoreCase))
            .OrderByDescending(l => l.Timestamp)
            .Take(100)
            .ToListAsync();

        return Ok(logs);
    }
}
