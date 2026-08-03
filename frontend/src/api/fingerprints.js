import apiClient from "./client";

export function registerFingerprint(employeeId, fingerprintBlob, fileName = "fingerprint.jpg") {
    const form = new FormData();
    form.append("EmployeeId", employeeId);
    form.append("FingerprintImage", fingerprintBlob, fileName);

    return apiClient
        .post("/fingerprints/register", form, { headers: { "Content-Type": "multipart/form-data" } })
        .then((res) => res.data);
}
