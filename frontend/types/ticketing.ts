export type TicketOrderStatus = "booked" | "refunded";

export interface TicketOrder {
  id: number;
  order_no: string;
  booking_reference: string;
  demo_mode: boolean;
  status: TicketOrderStatus;
  train_no: string;
  train_type?: string | null;
  run_date: string;
  from_station: string;
  to_station: string;
  departure_time?: string | null;
  arrival_time?: string | null;
  duration_minutes?: number | null;
  seat_type: string;
  seat_label: string;
  seat_code?: string | null;
  coach_no?: string | null;
  seat_no?: string | null;
  fare_amount: number;
  currency: string;
  passenger_name: string;
  account_username?: string | null;
  order_source: string;
  order_note?: string | null;
  refund_note?: string | null;
  created_at: string;
  updated_at: string;
  refunded_at?: string | null;
}

export interface TicketingSummary {
  total_orders: number;
  active_orders: number;
  refunded_orders: number;
  upcoming_orders: number;
  total_spent: number;
  total_refunded: number;
}

export interface TicketingListResponse {
  demo_mode: boolean;
  login_bound: boolean;
  account_username?: string | null;
  summary: TicketingSummary;
  trips: TicketOrder[];
}

export interface TicketingCapabilities {
  demo_mode: boolean;
  demo_mode_locked: boolean;
  live_booking_enabled: boolean;
  requires_login_for_binding: boolean;
  bound_account_username?: string | null;
  message: string;
}

export interface TicketPurchasePayload {
  user_id?: string;
  train_no: string;
  train_type?: string;
  run_date: string;
  from_station: string;
  to_station: string;
  departure_time?: string;
  arrival_time?: string;
  duration_minutes?: number;
  seat_type: string;
  seat_label: string;
  seat_code?: string;
  fare_amount: number;
  passenger_name?: string;
}
