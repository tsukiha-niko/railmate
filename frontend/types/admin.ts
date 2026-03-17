export interface AdminStats {
  stations: number;
  trains: number;
  stops: number;
  today_trains: number;
}

export interface JobInfo {
  id: string;
  name: string;
  next_run_time: string | null;
  trigger: string;
}

export interface AdminConfig {
  app_name: string;
  app_version: string;
  data_sync_mode: string;
  scheduler_enabled: boolean;
  sync_interval_hours: number;
  openai_model: string;
  openai_api_configured: boolean;
}
