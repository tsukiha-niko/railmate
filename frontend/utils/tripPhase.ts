import type { TicketOrder, TravelPhase } from "@/types/ticketing";

/** 与后端 ticketing_service._compute_travel_phase 对齐；在缺少 travel_phase 字段时用于回退。 */
export function resolveTravelPhase(order: TicketOrder): TravelPhase {
  if (order.travel_phase) return order.travel_phase;
  if (order.status === "refunded") return "refunded";
  if (order.checked_in_at) return "checked_in";
  const raw = (order.departure_time || "").trim().replace("：", ":");
  if (raw.includes(":")) {
    const parts = raw.split(":");
    const h = Number(parts[0]);
    const m = Number(parts[1]);
    if (Number.isFinite(h) && Number.isFinite(m)) {
      const [y, mo, d] = order.run_date.split("-").map(Number);
      const dep = new Date(y, mo - 1, d, h, m, 0, 0);
      if (Date.now() >= dep.getTime()) return "expired";
      return "booked";
    }
  }
  const [y, mo, d] = order.run_date.split("-").map(Number);
  const endOfDay = new Date(y, mo - 1, d, 23, 59, 59, 999);
  if (Date.now() > endOfDay.getTime()) return "expired";
  return "booked";
}
