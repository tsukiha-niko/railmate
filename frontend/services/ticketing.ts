import { get, post } from "./http";
import type {
  TicketOrder,
  TicketPurchasePayload,
  TicketingCapabilities,
  TicketingListResponse,
} from "@/types/ticketing";

export function getTicketingCapabilities(): Promise<TicketingCapabilities> {
  return get<TicketingCapabilities>("/api/v1/tickets/capabilities");
}

export function listTicketOrders(userId?: string): Promise<TicketingListResponse> {
  return get<TicketingListResponse>("/api/v1/tickets/orders", userId ? { user_id: userId } : {});
}

export function purchaseTicket(payload: TicketPurchasePayload): Promise<TicketOrder> {
  return post<TicketOrder>("/api/v1/tickets/purchase", payload);
}

export function refundTicket(orderId: number, reason?: string): Promise<TicketOrder> {
  return post<TicketOrder>(`/api/v1/tickets/${orderId}/refund`, reason ? { reason } : {});
}
