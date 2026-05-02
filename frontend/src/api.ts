import { DashboardResponse, JobStatus, LogEntry } from "./types";

const API_URL = import.meta.env.VITE_API_URL ?? "/api";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {})
    },
    ...options
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(payload.error ?? "Request failed");
  }

  return response.json() as Promise<T>;
}

export const api = {
  dashboard: () => request<DashboardResponse>("/dashboard"),
  jobs: () => request<JobStatus[]>("/jobs"),
  logs: () => request<LogEntry[]>("/logs"),
  generate: (accountId?: string) =>
    request("/content/generate", {
      method: "POST",
      body: JSON.stringify(accountId ? { accountId } : {})
    }),
  approve: (contentId: string) =>
    request(`/approvals/${contentId}/approve`, {
      method: "POST",
      body: JSON.stringify({ actor: "dashboard" })
    }),
  reject: (contentId: string, regenerate = true) =>
    request(`/approvals/${contentId}/reject`, {
      method: "POST",
      body: JSON.stringify({ actor: "dashboard", regenerate })
    }),
  edit: (contentId: string, feedback: string) =>
    request(`/approvals/${contentId}/edit`, {
      method: "POST",
      body: JSON.stringify({ actor: "dashboard", feedback })
    }),
  collectAnalytics: () =>
    request("/analytics/collect", {
      method: "POST"
    })
};
