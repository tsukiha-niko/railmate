export interface UserLocationInput {
  city: string;
  station?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export type PlanningMode = "efficient" | "rail_experience" | "stopover_explore";

export interface ChatRequest {
  message: string;
  conversation_id?: string | null;
  user_id?: string;
  location?: UserLocationInput | null;
  planning_mode?: PlanningMode;
}

export interface ToolCall {
  tool_name: string;
  arguments: Record<string, unknown>;
  result?: unknown;
}

export interface ChatResponse {
  answer: string;
  conversation_id: string;
  tool_calls: ToolCall[];
  quick_replies?: string[];
  timestamp?: string;
}

export interface ProgressEvent {
  status: "queued" | "running" | "completed" | "failed";
  percent: number;
  message: string;
  detail?: string | null;
  timestamp?: string;
}

export interface ChatJobCreateResponse {
  job_id: string;
  conversation_id: string;
  status: "queued" | "running" | "completed" | "failed";
  progress_percent: number;
  current_message: string;
}

export interface ChatJobStatusResponse {
  job_id: string;
  conversation_id: string;
  status: "queued" | "running" | "completed" | "failed";
  progress_percent: number;
  current_message: string;
  events: ProgressEvent[];
  result?: ChatResponse | null;
  error?: string | null;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** 后端解析 ::actions:: 后的快捷按钮；旧数据可由正文解析 */
  quick_replies?: string[];
  tool_calls?: ToolCall[];
  timestamp: number;
  status?: "pending" | "complete" | "error";
  progress?: {
    percent: number;
    current_message: string;
    events: ProgressEvent[];
  } | null;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}
