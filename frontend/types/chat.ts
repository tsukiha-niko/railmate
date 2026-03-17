export interface UserLocationInput {
  city: string;
  station?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface ChatRequest {
  message: string;
  conversation_id?: string | null;
  user_id?: string;
  location?: UserLocationInput | null;
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
  timestamp?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  tool_calls?: ToolCall[];
  timestamp: number;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}
