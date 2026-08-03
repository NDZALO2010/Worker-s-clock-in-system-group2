using System.Security.Claims;
using BiometricCore.Data;
using BiometricCore.DTOs;
using BiometricCore.Entities;
using BiometricCore.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BiometricCore.Controllers;

[ApiController]
[Route("api/v1/fingerprints")]
[Authorize]
public class FingerprintsController : ControllerBase
{
    private readonly IFingerprintService _fingerprintService;
    private readonly AppDbContext _db;
    private readonly ILogger<FingerprintsController> _logger;

    public FingerprintsController(IFingerprintService fingerprintService, AppDbContext db, ILogger<FingerprintsController> logger)
    {
        _fingerprintService = fingerprintService;
        _db = db;
        _logger = logger;
    }

    [HttpPost("register")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> RegisterFingerprint([FromForm] FingerprintRegisterRequestDto request)
    {
        if (request.FingerprintImage == null || request.FingerprintImage.Length == 0)
            return BadRequest(new { message = "Valid fingerprint scan file is required." });

        var isSelf = Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var callerId) && callerId == request.EmployeeId;
        if (!User.IsInRole("Admin") && !isSelf)
            return Forbid();

        var employee = await _db.Employees.FindAsync(request.EmployeeId);
        if (employee == null)
            return NotFound(new { message = "Employee not found." });

        if (!employee.PopiaConsentGranted)
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Employee has not granted POPIA consent for biometric data capture. Ask them to grant consent via /api/v1/auth/consent first." });

        using var memoryStream = new MemoryStream();
        await request.FingerprintImage.CopyToAsync(memoryStream);
        byte[] scanBytes = memoryStream.ToArray();

        try
        {
            float[] templateVector = await _fingerprintService.ExtractTemplateAsync(scanBytes);
            byte[] templateBytes = MathUtility.ToByteArray(templateVector);

            var existingProfile = await _db.FingerprintProfiles.FirstOrDefaultAsync(fp => fp.EmployeeId == request.EmployeeId);
            if (existingProfile == null)
            {
                _db.FingerprintProfiles.Add(new FingerprintProfile
                {
                    EmployeeId = request.EmployeeId,
                    FingerprintTemplate = templateBytes,
                    CreatedAt = DateTime.UtcNow
                });
            }
            else
            {
                existingProfile.FingerprintTemplate = templateBytes;
                existingProfile.CreatedAt = DateTime.UtcNow;
            }

            await _db.SaveChangesAsync();
            _logger.LogInformation("Fingerprint template successfully generated and stored for Employee: {EmployeeId}", request.EmployeeId);

            return Ok(new
            {
                EmployeeId = request.EmployeeId,
                VectorDimension = templateVector.Length,
                EncryptedVectorPayload = Convert.ToBase64String(templateBytes),
                Message = "Fingerprint registered successfully. Raw scan discarded per POPIA guidelines."
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing fingerprint scan for Employee {EmployeeId}", request.EmployeeId);
            return StatusCode(500, new { message = "Failed to process fingerprint scan.", details = ex.Message });
        }
    }
}
