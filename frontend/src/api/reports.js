import apiClient from "./client";

export function generateReport({ employeeId, startDate, endDate } = {}) {
    return apiClient
        .get("/reports", { params: { employeeId, startDate, endDate } })
        .then((res) => res.data);
}
