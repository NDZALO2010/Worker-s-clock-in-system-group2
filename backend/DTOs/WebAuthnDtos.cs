using Fido2NetLib;

namespace BiometricCore.DTOs;

public class WebAuthnRegisterVerifyRequestDto
{
    public AuthenticatorAttestationRawResponse AttestationResponse { get; set; } = null!;
    public string? DeviceLabel { get; set; }
}

public class WebAuthnAssertOptionsRequestDto
{
    public string? EmployeeNumber { get; set; }
}

public class WebAuthnAssertVerifyRequestDto
{
    public string StateToken { get; set; } = string.Empty;
    public AuthenticatorAssertionRawResponse AssertionResponse { get; set; } = null!;
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public string DeviceName { get; set; } = "Web Browser";
    public string Mode { get; set; } = "checkin";
}

public class WebAuthnCredentialDto
{
    public Guid Id { get; set; }
    public string DeviceLabel { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}
