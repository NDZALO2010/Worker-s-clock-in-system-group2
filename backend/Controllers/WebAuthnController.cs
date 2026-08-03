using System.Security.Claims;
using BiometricCore.Data;
using BiometricCore.DTOs;
using BiometricCore.Entities;
using BiometricCore.Services;
using Fido2NetLib;
using Fido2NetLib.Objects;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace BiometricCore.Controllers;

/// <summary>
/// Real fingerprint/platform-authenticator support via WebAuthn. Unlike the face pipeline this
/// cannot anonymously identify an unknown scan among all employees — a credential only proves
/// possession for an identity already claimed (JWT login, or an employee number at the kiosk).
/// </summary>
[ApiController]
[Route("api/v1/webauthn")]
public class WebAuthnController : ControllerBase
{
    private readonly IFido2 _fido2;
    private readonly AppDbContext _db;
    private readonly IAttendanceService _attendanceService;
    private readonly IMemoryCache _cache;
    private readonly ILogger<WebAuthnController> _logger;

    private static readonly MemoryCacheEntryOptions RegistrationCacheOptions =
        new() { AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5) };
    private static readonly MemoryCacheEntryOptions AssertionCacheOptions =
        new() { AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(2) };

    public WebAuthnController(
        IFido2 fido2, AppDbContext db, IAttendanceService attendanceService, IMemoryCache cache, ILogger<WebAuthnController> logger)
    {
        _fido2 = fido2;
        _db = db;
        _attendanceService = attendanceService;
        _cache = cache;
        _logger = logger;
    }

    private bool TryGetCurrentEmployeeId(out Guid employeeId) =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out employeeId);

    [HttpPost("register/options")]
    [Authorize]
    public async Task<IActionResult> GetRegistrationOptions()
    {
        if (!TryGetCurrentEmployeeId(out var employeeId))
            return Unauthorized(new { message = "Authenticated employee context is required." });

        var employee = await _db.Employees.FindAsync(employeeId);
        if (employee == null)
            return NotFound(new { message = "Employee not found." });

        if (!employee.PopiaConsentGranted)
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "POPIA consent is required before registering biometric credentials." });

        var existingCredentials = await _db.WebAuthnCredentials
            .Where(c => c.EmployeeId == employeeId)
            .Select(c => new PublicKeyCredentialDescriptor(c.CredentialId))
            .ToListAsync();

        var fidoUser = new Fido2User
        {
            Id = employeeId.ToByteArray(),
            Name = employee.Email,
            DisplayName = $"{employee.FirstName} {employee.LastName}"
        };

        var options = _fido2.RequestNewCredential(new RequestNewCredentialParams
        {
            User = fidoUser,
            ExcludeCredentials = existingCredentials,
            AuthenticatorSelection = new AuthenticatorSelection
            {
                AuthenticatorAttachment = AuthenticatorAttachment.Platform,
                UserVerification = UserVerificationRequirement.Required,
                ResidentKey = ResidentKeyRequirement.Discouraged
            },
            AttestationPreference = AttestationConveyancePreference.None
        });

        _cache.Set(RegistrationCacheKey(employeeId), options, RegistrationCacheOptions);

        return Ok(options);
    }

    [HttpPost("register/verify")]
    [Authorize]
    public async Task<IActionResult> VerifyRegistration([FromBody] WebAuthnRegisterVerifyRequestDto request)
    {
        if (!TryGetCurrentEmployeeId(out var employeeId))
            return Unauthorized(new { message = "Authenticated employee context is required." });

        if (!_cache.TryGetValue(RegistrationCacheKey(employeeId), out CredentialCreateOptions? options) || options == null)
            return BadRequest(new { message = "Registration challenge expired or not found. Please try again." });

        _cache.Remove(RegistrationCacheKey(employeeId));

        try
        {
            var result = await _fido2.MakeNewCredentialAsync(new MakeNewCredentialParams
            {
                AttestationResponse = request.AttestationResponse,
                OriginalOptions = options,
                IsCredentialIdUniqueToUserCallback = async (args, _) =>
                    !await _db.WebAuthnCredentials.AnyAsync(c => c.CredentialId == args.CredentialId)
            });

            var credential = new WebAuthnCredential
            {
                EmployeeId = employeeId,
                CredentialId = result.Id,
                PublicKey = result.PublicKey,
                UserHandle = employeeId.ToByteArray(),
                SignCount = result.SignCount,
                CredType = result.Type.ToString(),
                AaGuid = result.AaGuid,
                DeviceLabel = string.IsNullOrWhiteSpace(request.DeviceLabel) ? "Registered device" : request.DeviceLabel!.Trim()
            };

            _db.WebAuthnCredentials.Add(credential);
            await _db.SaveChangesAsync();

            _logger.LogInformation("WebAuthn credential registered for Employee {EmployeeId}.", employeeId);

            return Ok(new WebAuthnCredentialDto { Id = credential.Id, DeviceLabel = credential.DeviceLabel, CreatedAt = credential.CreatedAt });
        }
        catch (Fido2VerificationException ex)
        {
            _logger.LogWarning(ex, "WebAuthn registration verification failed for Employee {EmployeeId}.", employeeId);
            return BadRequest(new { message = $"Fingerprint registration failed: {ex.Message}" });
        }
    }

    [HttpPost("assert/options")]
    [AllowAnonymous]
    public async Task<IActionResult> GetAssertionOptions([FromBody] WebAuthnAssertOptionsRequestDto request)
    {
        Employee? employee;

        if (TryGetCurrentEmployeeId(out var jwtEmployeeId))
        {
            employee = await _db.Employees.FindAsync(jwtEmployeeId);
        }
        else if (!string.IsNullOrWhiteSpace(request.EmployeeNumber))
        {
            employee = await _db.Employees.FirstOrDefaultAsync(e => e.EmployeeNumber == request.EmployeeNumber);
        }
        else
        {
            return BadRequest(new { message = "Log in, or provide an employee number, to continue." });
        }

        if (employee == null || !employee.IsActive)
            return NotFound(new { message = "Employee not found or inactive." });

        var credentials = await _db.WebAuthnCredentials
            .Where(c => c.EmployeeId == employee.EmployeeId)
            .ToListAsync();

        if (credentials.Count == 0)
            return BadRequest(new { message = "No fingerprint is registered for this employee yet. Register one from Settings first." });

        var allowedCredentials = credentials
            .Select(c => new PublicKeyCredentialDescriptor(c.CredentialId))
            .ToList();

        var options = _fido2.GetAssertionOptions(new GetAssertionOptionsParams
        {
            AllowedCredentials = allowedCredentials,
            UserVerification = UserVerificationRequirement.Required
        });

        string stateToken = Guid.NewGuid().ToString("N");
        _cache.Set(AssertionCacheKey(stateToken), (employee.EmployeeId, options), AssertionCacheOptions);

        return Ok(new { stateToken, options });
    }

    [HttpPost("assert/verify")]
    [AllowAnonymous]
    public async Task<IActionResult> VerifyAssertion([FromBody] WebAuthnAssertVerifyRequestDto request)
    {
        if (!_cache.TryGetValue(AssertionCacheKey(request.StateToken), out (Guid EmployeeId, AssertionOptions Options) cached))
            return BadRequest(new { message = "Verification session expired or not found. Please try again." });

        _cache.Remove(AssertionCacheKey(request.StateToken));

        var storedCredential = await _db.WebAuthnCredentials
            .FirstOrDefaultAsync(c => c.EmployeeId == cached.EmployeeId && c.CredentialId == request.AssertionResponse.RawId);

        if (storedCredential == null)
            return BadRequest(new { message = "Fingerprint not recognized." });

        try
        {
            var result = await _fido2.MakeAssertionAsync(new MakeAssertionParams
            {
                AssertionResponse = request.AssertionResponse,
                OriginalOptions = cached.Options,
                StoredPublicKey = storedCredential.PublicKey,
                StoredSignatureCounter = storedCredential.SignCount,
                IsUserHandleOwnerOfCredentialIdCallback = async (args, _) =>
                    await _db.WebAuthnCredentials.AnyAsync(c => c.CredentialId == args.CredentialId && c.UserHandle == args.UserHandle)
            });

            storedCredential.SignCount = result.SignCount;
            await _db.SaveChangesAsync();

            bool isCheckout = string.Equals(request.Mode, "checkout", StringComparison.OrdinalIgnoreCase);

            if (isCheckout)
            {
                var outcome = await _attendanceService.ClockOutVerifiedAsync(cached.EmployeeId, request.Latitude, request.Longitude, request.DeviceName);
                if (!outcome.Success) return BadRequest(new { message = outcome.Message });
                return Ok(new { message = outcome.Message, employeeName = outcome.EmployeeName });
            }
            else
            {
                var outcome = await _attendanceService.ClockInVerifiedAsync(cached.EmployeeId, request.Latitude, request.Longitude, request.DeviceName);
                if (!outcome.Success) return BadRequest(new { message = outcome.Message });
                return Ok(new { message = outcome.Message, attendanceId = outcome.AttendanceId, employeeName = outcome.EmployeeName });
            }
        }
        catch (Fido2VerificationException ex)
        {
            _logger.LogWarning(ex, "WebAuthn assertion verification failed for Employee {EmployeeId}.", cached.EmployeeId);
            return BadRequest(new { message = $"Fingerprint verification failed: {ex.Message}" });
        }
    }

    [HttpGet("credentials")]
    [Authorize]
    public async Task<IActionResult> ListCredentials()
    {
        if (!TryGetCurrentEmployeeId(out var employeeId))
            return Unauthorized(new { message = "Authenticated employee context is required." });

        var credentials = await _db.WebAuthnCredentials
            .Where(c => c.EmployeeId == employeeId)
            .OrderByDescending(c => c.CreatedAt)
            .Select(c => new WebAuthnCredentialDto { Id = c.Id, DeviceLabel = c.DeviceLabel, CreatedAt = c.CreatedAt })
            .ToListAsync();

        return Ok(credentials);
    }

    [HttpDelete("credentials/{id:guid}")]
    [Authorize]
    public async Task<IActionResult> DeleteCredential(Guid id)
    {
        if (!TryGetCurrentEmployeeId(out var employeeId))
            return Unauthorized(new { message = "Authenticated employee context is required." });

        var credential = await _db.WebAuthnCredentials.FirstOrDefaultAsync(c => c.Id == id && c.EmployeeId == employeeId);
        if (credential == null)
            return NotFound(new { message = "Credential not found." });

        _db.WebAuthnCredentials.Remove(credential);
        await _db.SaveChangesAsync();

        return Ok(new { message = "Fingerprint credential removed." });
    }

    private static string RegistrationCacheKey(Guid employeeId) => $"fido2:reg:{employeeId}";
    private static string AssertionCacheKey(string stateToken) => $"fido2:assert:{stateToken}";
}
