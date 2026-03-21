import type { TrainScheduleStop } from "@/types/trains";

const TIME_RE = /^(\d{1,2}):(\d{2})$/;

export function parseTimeToMinutes(t: string | null | undefined): number | null {
  if (!t || t === "--") return null;
  const m = String(t).trim().match(TIME_RE);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min)) return null;
  return h * 60 + min;
}

/** 相邻两站之间行车时间（允许跨午夜，单段按 <24h 计） */
export function legMinutesBetween(dep: string | null, arr: string | null): number {
  const d = parseTimeToMinutes(dep ?? undefined);
  const a = parseTimeToMinutes(arr ?? undefined);
  if (d == null || a == null) return 0;
  if (a >= d) return a - d;
  return a + 1440 - d;
}

/** 从 from 站到 to 站累计行车分钟（沿停站顺序累加各段） */
export function segmentDurationByStops(stops: TrainScheduleStop[], fromName: string, toName: string): number | null {
  const fi = stops.findIndex((s) => s.station_name === fromName);
  const ti = stops.findIndex((s) => s.station_name === toName);
  if (fi < 0 || ti <= fi) return null;
  let total = 0;
  for (let i = fi; i < ti; i += 1) {
    const dep = stops[i].departure_time;
    const arrNext = stops[i + 1].arrival_time;
    total += legMinutesBetween(dep, arrNext);
  }
  return total > 0 ? total : null;
}

/** 停站下标 fromIndex→toIndex 累计行车分钟 */
export function segmentMinutesBetweenIndices(stops: TrainScheduleStop[], fromIndex: number, toIndex: number): number | null {
  if (fromIndex < 0 || toIndex <= fromIndex) return null;
  let total = 0;
  for (let i = fromIndex; i < toIndex; i += 1) {
    total += legMinutesBetween(stops[i].departure_time, stops[i + 1].arrival_time);
  }
  return total > 0 ? total : null;
}

/**
 * 到达站相对出发日期的「跨天」数：0 当日，1 次日，2 第三日…
 * 优先用累计行车时长 + 出发时刻推算；否则用到达钟点 < 出发钟点粗判次日。
 */
export function arrivalCalendarDayOffset(
  departureTime: string | null | undefined,
  arrivalTime: string | null | undefined,
  segmentDurationMinutes: number | null,
): number {
  const depMin = parseTimeToMinutes(departureTime ?? undefined);
  const arrMin = parseTimeToMinutes(arrivalTime ?? undefined);
  if (segmentDurationMinutes != null && segmentDurationMinutes > 0 && depMin != null) {
    return Math.floor((depMin + segmentDurationMinutes) / 1440);
  }
  if (depMin != null && arrMin != null && arrMin < depMin) return 1;
  return 0;
}
