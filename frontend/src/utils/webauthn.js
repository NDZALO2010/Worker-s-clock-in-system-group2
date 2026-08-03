import * as webauthnApi from "../api/webauthn";

export function isWebAuthnSupported() {
    return typeof window !== "undefined" && !!window.PublicKeyCredential;
}

function base64urlToBuffer(base64url) {
    const padding = "=".repeat((4 - (base64url.length % 4)) % 4);
    const base64 = (base64url + padding).replace(/-/g, "+").replace(/_/g, "/");
    const raw = atob(base64);
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    return bytes.buffer;
}

function bufferToBase64url(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (const b of bytes) binary += String.fromCharCode(b);
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function toCreationOptions(options) {
    return {
        ...options,
        challenge: base64urlToBuffer(options.challenge),
        user: { ...options.user, id: base64urlToBuffer(options.user.id) },
        excludeCredentials: (options.excludeCredentials || []).map((c) => ({
            ...c,
            id: base64urlToBuffer(c.id),
        })),
    };
}

function toRequestOptions(options) {
    return {
        ...options,
        challenge: base64urlToBuffer(options.challenge),
        allowCredentials: (options.allowCredentials || []).map((c) => ({
            ...c,
            id: base64urlToBuffer(c.id),
        })),
    };
}

function serializeAttestationCredential(credential) {
    const response = credential.response;
    return {
        id: credential.id,
        rawId: bufferToBase64url(credential.rawId),
        type: credential.type,
        response: {
            attestationObject: bufferToBase64url(response.attestationObject),
            clientDataJSON: bufferToBase64url(response.clientDataJSON),
            transports: response.getTransports ? response.getTransports() : [],
        },
        clientExtensionResults: credential.getClientExtensionResults ? credential.getClientExtensionResults() : {},
    };
}

function serializeAssertionCredential(credential) {
    const response = credential.response;
    return {
        id: credential.id,
        rawId: bufferToBase64url(credential.rawId),
        type: credential.type,
        response: {
            authenticatorData: bufferToBase64url(response.authenticatorData),
            signature: bufferToBase64url(response.signature),
            clientDataJSON: bufferToBase64url(response.clientDataJSON),
            userHandle: response.userHandle ? bufferToBase64url(response.userHandle) : null,
        },
        clientExtensionResults: credential.getClientExtensionResults ? credential.getClientExtensionResults() : {},
    };
}

// DOMException.message alone (e.g. "An unknown error occurred while talking to the credential
// manager") hides the actual error type, which is the useful part for diagnosing platform
// authenticator failures — so surface both, and log the full exception for remote debugging.
function describeCredentialError(err, fallback) {
    console.error("WebAuthn ceremony failed:", err);
    if (err instanceof DOMException) {
        return new Error(`${err.name}: ${err.message || fallback}`);
    }
    return err instanceof Error ? err : new Error(fallback);
}

/**
 * Runs the WebAuthn creation ceremony on this device (triggers its fingerprint/platform
 * authenticator prompt) and registers the resulting credential against the logged-in employee.
 */
export async function registerFingerprint({ deviceLabel } = {}) {
    if (!isWebAuthnSupported()) {
        throw new Error("This device or browser doesn't support fingerprint sign-in.");
    }

    const options = await webauthnApi.getRegistrationOptions();
    let credential;
    try {
        credential = await navigator.credentials.create({ publicKey: toCreationOptions(options) });
    } catch (err) {
        throw describeCredentialError(err, "Fingerprint registration failed.");
    }
    if (!credential) {
        throw new Error("Fingerprint registration was cancelled.");
    }

    return webauthnApi.verifyRegistration({
        attestationResponse: serializeAttestationCredential(credential),
        deviceLabel,
    });
}

/**
 * Runs the WebAuthn assertion ceremony (fingerprint prompt) for the given identity — the
 * logged-in employee if no employeeNumber is passed, or the claimed kiosk employee otherwise —
 * then completes the clock-in/out in one round trip once the assertion verifies.
 */
export async function authenticateAndClock({ employeeNumber, mode, latitude, longitude, deviceName } = {}) {
    if (!isWebAuthnSupported()) {
        throw new Error("This device or browser doesn't support fingerprint sign-in.");
    }

    const { stateToken, options } = await webauthnApi.getAssertionOptions({ employeeNumber });
    let credential;
    try {
        credential = await navigator.credentials.get({ publicKey: toRequestOptions(options) });
    } catch (err) {
        throw describeCredentialError(err, "Fingerprint verification failed.");
    }
    if (!credential) {
        throw new Error("Fingerprint verification was cancelled.");
    }

    return webauthnApi.verifyAssertion({
        stateToken,
        assertionResponse: serializeAssertionCredential(credential),
        latitude,
        longitude,
        deviceName,
        mode,
    });
}
