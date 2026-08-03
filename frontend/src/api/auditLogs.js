import apiClient from "./client";

export function list() {
    return apiClient.get("/audit-logs").then((res) => res.data);
}
