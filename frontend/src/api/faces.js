import apiClient from "./client";

export function registerFace(employeeId, faceBlob) {
    const form = new FormData();
    form.append("EmployeeId", employeeId);
    form.append("FaceImage", faceBlob, "face.jpg");

    return apiClient
        .post("/faces/register", form, { headers: { "Content-Type": "multipart/form-data" } })
        .then((res) => res.data);
}
