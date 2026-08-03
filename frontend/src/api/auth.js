import apiClient from "./client";

export function login(email, password) {
    return apiClient.post("/auth/login", { email, password }).then((res) => res.data);
}

export function createUser(payload) {
    return apiClient.post("/auth/users", payload).then((res) => res.data);
}

export function updateUser(employeeId, payload) {
    return apiClient.put(`/auth/users/${employeeId}`, payload).then((res) => res.data);
}

export function deactivateUser(employeeId) {
    return apiClient.delete(`/auth/users/${employeeId}`).then((res) => res.data);
}

export function listUsers() {
    return apiClient.get("/auth/users").then((res) => res.data);
}

export function grantConsent() {
    return apiClient.post("/auth/consent").then((res) => res.data);
}

export function eraseBiometricData(employeeId) {
    return apiClient.delete(`/auth/users/${employeeId}/biometric-data`).then((res) => res.data);
}
