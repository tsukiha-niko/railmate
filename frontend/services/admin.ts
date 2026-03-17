import type { AdminStats, JobInfo, AdminConfig, AIConfigResponse } from "@/types/admin";
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

export async function updateAIConfig(params: {
  api_key?: string;
  base_url?: string;
  model?: string;
}): Promise<AIConfigResponse> {
  const query = new URLSearchParams();
  if (params.api_key != null) query.set("api_key", params.api_key);
  if (params.base_url != null) query.set("base_url", params.base_url);
  if (params.model != null) query.set("model", params.model);
  return post<AIConfigResponse>(`/api/v1/admin/ai-config?${query.toString()}`);
}
