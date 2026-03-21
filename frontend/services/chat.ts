import type {
  ChatJobCreateResponse,
  ChatJobStatusResponse,
  ChatRequest,
  ChatResponse,
  UserLocationInput,
} from "@/types/chat";
import type { GeoLocationResponse, GPSLocationInput, UserContextResponse, UserLocationResponse } from "@/types/geo";
import { get, post, del } from "./http";

export async function postChat(req: ChatRequest): Promise<ChatResponse> {
  return post<ChatResponse>("/api/v1/chat/", req);
}

const SSE_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface SSEProgressEvent {
  status: string;
  percent: number;
  message: string;
  detail?: string | null;
}

export interface SSEDoneEvent {
  answer: string;
  conversation_id: string;
  tool_calls: Array<{ tool_name: string; arguments: Record<string, unknown>; result?: unknown }>;
  quick_replies?: string[];
}

export type SSEHandler = {
  onStart?: (data: { conversation_id: string }) => void;
  onProgress?: (data: SSEProgressEvent) => void;
  onDone?: (data: SSEDoneEvent) => void;
  onError?: (data: { message: string }) => void;
};

export async function streamChat(req: ChatRequest, handlers: SSEHandler): Promise<void> {
  const res = await fetch(`${SSE_BASE}/api/v1/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });

  if (!res.ok || !res.body) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    handlers.onError?.({ message: body.detail || res.statusText });
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    let currentEvent = "";
    for (const line of lines) {
      if (line.startsWith("event: ")) {
        currentEvent = line.slice(7).trim();
      } else if (line.startsWith("data: ")) {
        const raw = line.slice(6);
        try {
          const data = JSON.parse(raw);
          if (!currentEvent && data.event) {
            currentEvent = data.event;
          }
          switch (currentEvent) {
            case "start":
              handlers.onStart?.(data);
              break;
            case "progress":
              handlers.onProgress?.(data);
              break;
            case "done":
              handlers.onDone?.(data);
              return;
            case "error":
              handlers.onError?.(data);
              return;
          }
        } catch { /* skip malformed JSON */ }
        currentEvent = "";
      }
    }
  }
}

export async function createChatJob(req: ChatRequest): Promise<ChatJobCreateResponse> {
  return post<ChatJobCreateResponse>("/api/v1/chat/jobs", req);
}

export async function getChatJob(jobId: string): Promise<ChatJobStatusResponse> {
  return get<ChatJobStatusResponse>(`/api/v1/chat/jobs/${jobId}`);
}

export async function clearConversation(conversationId: string, userId = "default"): Promise<void> {
  await del<{ message: string }>(`/api/v1/chat/${conversationId}?user_id=${userId}`);
}

export async function setUserLocation(
  location: UserLocationInput,
  userId = "default",
): Promise<UserLocationResponse> {
  return post<UserLocationResponse>(`/api/v1/chat/location?user_id=${userId}`, location);
}

export async function getUserLocation(userId = "default"): Promise<UserLocationResponse> {
  return get<UserLocationResponse>(`/api/v1/chat/location`, { user_id: userId });
}

export async function getUserContext(userId = "default"): Promise<UserContextResponse> {
  return get<UserContextResponse>(`/api/v1/chat/context`, { user_id: userId });
}

export async function locateByIP(userId = "default"): Promise<GeoLocationResponse> {
  return get<GeoLocationResponse>(`/api/v1/chat/locate/ip`, { user_id: userId });
}

export async function locateByGPS(
  payload: GPSLocationInput,
  userId = "default",
): Promise<GeoLocationResponse> {
  return post<GeoLocationResponse>(`/api/v1/chat/locate/gps?user_id=${userId}`, payload);
}

export async function autoLocate(userId = "default"): Promise<GeoLocationResponse> {
  return get<GeoLocationResponse>(`/api/v1/chat/locate/auto`, { user_id: userId });
}
