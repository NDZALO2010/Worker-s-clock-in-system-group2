import apiClient from "./client";

function buildScanForm({ latitude, longitude, deviceName, faceBlob, fingerprintBlob }) {
    const form = new FormData();
    form.append("Latitude", latitude ?? 0);
    form.append("Longitude", longitude ?? 0);
    if (deviceName) form.append("DeviceName", deviceName);
    if (faceBlob) form.append("FaceImage", faceBlob, "face.jpg");
    if (fingerprintBlob) form.append("FingerprintImage", fingerprintBlob, "fingerprint.jpg");
    return form;
}

export function clockIn(scanData) {
    return apiClient
        .post("/attendance/clockin", buildScanForm(scanData), {
            headers: { "Content-Type": "multipart/form-data" },
        })
        .then((res) => res.data);
}

export function clockOut(scanData) {
    return apiClient
        .post("/attendance/clockout", buildScanForm(scanData), {
            headers: { "Content-Type": "multipart/form-data" },
        })
        .then((res) => res.data);
}

export function getHistory() {
    return apiClient.get("/attendance/history").then((res) => res.data);
}

export function getTeamStatus(supervisorId) {
    return apiClient
        .get("/attendance/supervisor/team-status", { params: { supervisorId } })
        .then((res) => res.data);
}

export function exportPayrollCsv(startDate, endDate) {
    return apiClient
        .get("/attendance/payroll-export", {
            params: { startDate, endDate },
            responseType: "blob",
        })
        .then((res) => res.data);
}
