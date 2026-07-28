using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace ClockingManagement.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[EnableRateLimiting("AdminLimiter")]
public class AuditController : ControllerBase
{
}