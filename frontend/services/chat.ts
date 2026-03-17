import type { ChatRequest, ChatResponse, UserLocationInput } from "@/types/chat";
import type { GeoLocationResponse, GPSLocationInput, UserContextResponse, UserLocationResponse } from "@/types/geo";
import { get, post, del } from "./http";

export async function postChat(req: ChatRequest): Promise<ChatResponse> {
  return post<ChatResponse>("/api/v1/chat/", req);
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
