export function getToday(): string { return formatDate(new Date()); }

export function getTomorrow(): string {
  const d = new Date(); d.setDate(d.getDate() + 1); return formatDate(d);
}

export function formatDate(date: Date): string {
  const y = date.getFullYear(); const m = String(date.getMonth() + 1).padStart(2, "0"); const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export type DateLocale = "zh-CN" | "en";

export function formatDateLocalized(dateStr: string, locale: DateLocale): string {
  const d = new Date(dateStr); const month = d.getMonth() + 1; const day = d.getDate(); const weekday = d.getDay();
  if (locale === "en") {
    const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return `${month}/${day} ${weekdays[weekday]}`;
  }
  const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  return `${month}月${day}日 ${weekdays[weekday]}`;
}

export function formatDateCN(dateStr: string): string { return formatDateLocalized(dateStr, "zh-CN"); }

export function formatDuration(minutes: number, locale: DateLocale = "zh-CN"): string {
  const h = Math.floor(minutes / 60); const m = minutes % 60;
  if (locale === "en") { if (h === 0) return `${m} min`; if (m === 0) return `${h} h`; return `${h} h ${m} min`; }
  if (h === 0) return `${m}分钟`; if (m === 0) return `${h}小时`; return `${h}小时${m}分钟`;
}

export function isToday(dateStr: string): boolean { return dateStr === getToday(); }
export function isTomorrow(dateStr: string): boolean { return dateStr === getTomorrow(); }

export function getDateLabel(dateStr: string): string {
  if (isToday(dateStr)) return "今天"; if (isTomorrow(dateStr)) return "明天"; return formatDateCN(dateStr);
}
