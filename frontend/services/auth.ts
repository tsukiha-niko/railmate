import { get, post } from "./http";

export interface Auth12306Status {
  logged_in: boolean;
  username: string;
  expires_at: number;
  remaining_days: number;
}

export interface QRCodeResult {
  success: boolean;
  uuid?: string;
  image?: string; // base64 PNG
  message?: string;
}

export interface QRPollResult {
  status: "waiting" | "scanned" | "confirmed" | "expired" | "error";
  username?: string;
  message?: string;
}

export function get12306Status(): Promise<Auth12306Status> {
  return get<Auth12306Status>("/api/v1/auth/12306/status");
}

export function create12306QRCode(): Promise<QRCodeResult> {
  return get<QRCodeResult>("/api/v1/auth/12306/qrcode");
}

export function poll12306QRCode(uuid: string): Promise<QRPollResult> {
  return get<QRPollResult>("/api/v1/auth/12306/qrcode/poll", { uuid });
}

export function logout12306(): Promise<{ success: boolean }> {
  return post<{ success: boolean }>("/api/v1/auth/12306/logout");
}
