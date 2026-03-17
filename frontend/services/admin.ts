import type { AdminStats, JobInfo, AdminConfig } from "@/types/admin";
import { get, post } from "./http";

export async function triggerSync(daysAhead = 7) {
  return post<{ success: boolean; message: string; stats: Record<string, number> }>(
    `/api/v1/admin/trigger-sync?days_ahead=${daysAhead}`,
  );
}

export async function getStats(): Promise<AdminStats> {
  return get<AdminStats>("/api/v1/admin/stats");
}

export async function getJobs(): Promise<{ enabled: boolean; jobs: JobInfo[] }> {
  return get<{ enabled: boolean; jobs: JobInfo[] }>("/api/v1/admin/jobs");
}

export async function getConfig(): Promise<AdminConfig> {
  return get<AdminConfig>("/api/v1/admin/config");
}
