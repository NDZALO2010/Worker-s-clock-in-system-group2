import apiClient from "./client";

export function list() {
    return apiClient.get("/notifications").then((res) => res.data);
}

export function markRead(notificationId) {
    return apiClient.put(`/notifications/${notificationId}/read`).then((res) => res.data);
}
