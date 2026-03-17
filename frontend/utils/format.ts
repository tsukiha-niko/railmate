export type FormatLocale = "zh-CN" | "en";

export function getTrainTypeLabel(type: string, locale: FormatLocale = "zh-CN"): string {
  const zh: Record<string, string> = { G: "高铁", D: "动车", C: "城际", Z: "直达", T: "特快", K: "快速" };
  const en: Record<string, string> = { G: "High-speed", D: "D-train", C: "Intercity", Z: "Direct", T: "Express", K: "Fast" };
  return (locale === "en" ? en : zh)[type] || type;
}

const TRAIN_TYPE_COLORS: Record<string, string> = { G: "bg-blue-500", D: "bg-emerald-500", C: "bg-cyan-500", Z: "bg-purple-500", T: "bg-orange-500", K: "bg-amber-600" };

export function getTrainTypeColor(type: string): string { return TRAIN_TYPE_COLORS[type] || "bg-gray-500"; }

export function formatPrice(price: number | null | undefined): string { if (price == null) return "--"; return `¥${price.toFixed(0)}`; }

export function formatRemaining(count: number | null | undefined, locale: FormatLocale = "zh-CN"): string {
  if (count == null) return locale === "en" ? "Checking" : "查询中";
  if (count === 0) return locale === "en" ? "Sold out" : "无票";
  if (count > 99) return locale === "en" ? "Plenty" : "充足";
  return locale === "en" ? `${count} left` : `${count}张`;
}
