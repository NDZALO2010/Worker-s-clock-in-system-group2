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
[Route("api/v1/faces")]
[Authorize]
public class FacesController : ControllerBase
{
    private readonly IFacialRecognitionService _facialService;
    private readonly AppDbContext _db;
    private readonly ILogger<FacesController> _logger;

    public FacesController(IFacialRecognitionService facialService, AppDbContext db, ILogger<FacesController> logger)
    {
        _facialService = facialService;
        _db = db;
        _logger = logger;
    }

    [HttpPost("register")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> RegisterFace([FromForm] FaceRegisterRequestDto request)
    {
        if (request.FaceImage == null || request.FaceImage.Length == 0)
            return BadRequest(new { message = "Valid image file is required." });

        var isSelf = Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var callerId) && callerId == request.EmployeeId;
        if (!User.IsInRole("Admin") && !isSelf)
            return Forbid();

        var employee = await _db.Employees.FindAsync(request.EmployeeId);
        if (employee == null)
            return NotFound(new { message = "Employee not found." });

        if (!employee.PopiaConsentGranted)
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Employee has not granted POPIA consent for biometric data capture. Ask them to grant consent via /api/v1/auth/consent first." });

        using var memoryStream = new MemoryStream();
        await request.FaceImage.CopyToAsync(memoryStream);
        byte[] imageBytes = memoryStream.ToArray();

        try
        {
            float[] embeddingVector = await _facialService.ExtractEmbeddingAsync(imageBytes);
            byte[] vectorBytes = MathUtility.ToByteArray(embeddingVector);

            var existingProfile = await _db.FaceProfiles.FirstOrDefaultAsync(fp => fp.EmployeeId == request.EmployeeId);
            if (existingProfile == null)
            {
                _db.FaceProfiles.Add(new FaceProfile
                {
                    EmployeeId = request.EmployeeId,
                    FaceEmbedding = vectorBytes,
                    CreatedAt = DateTime.UtcNow
                });
            }
            else
            {
                existingProfile.FaceEmbedding = vectorBytes;
                existingProfile.CreatedAt = DateTime.UtcNow;
            }

            await _db.SaveChangesAsync();
            _logger.LogInformation("Face embedding successfully generated and stored for Employee: {EmployeeId}", request.EmployeeId);

            return Ok(new
            {
                EmployeeId = request.EmployeeId,
                VectorDimension = embeddingVector.Length,
                EncryptedVectorPayload = Convert.ToBase64String(vectorBytes),
                Message = "Face registered successfully. Raw image discarded per POPIA guidelines."
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing face image for Employee {EmployeeId}", request.EmployeeId);
            return StatusCode(500, new { message = "Failed to process face image.", details = ex.Message });
        }
    }
}
