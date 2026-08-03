import apiClient from "./client";

export function getRegistrationOptions() {
    return apiClient.post("/webauthn/register/options").then((res) => res.data);
}

export function verifyRegistration({ attestationResponse, deviceLabel }) {
    return apiClient
        .post("/webauthn/register/verify", { attestationResponse, deviceLabel })
        .then((res) => res.data);
}

export function getAssertionOptions({ employeeNumber } = {}) {
    return apiClient.post("/webauthn/assert/options", { employeeNumber }).then((res) => res.data);
}

export function verifyAssertion({ stateToken, assertionResponse, latitude, longitude, deviceName, mode }) {
    return apiClient
        .post("/webauthn/assert/verify", {
            stateToken,
            assertionResponse,
            latitude,
            longitude,
            deviceName,
            mode,
        })
        .then((res) => res.data);
}

export function listCredentials() {
    return apiClient.get("/webauthn/credentials").then((res) => res.data);
}

export function deleteCredential(id) {
    return apiClient.delete(`/webauthn/credentials/${id}`).then((res) => res.data);
}
