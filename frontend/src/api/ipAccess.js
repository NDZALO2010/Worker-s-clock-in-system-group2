import apiClient from "./client";

export function list() {
    return apiClient.get("/ip-access").then((res) => res.data);
}
