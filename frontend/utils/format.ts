export type FormatLocale = "zh-CN" | "en";

type FareCarrier = {
  price_second_seat?: number | null;
  price_first_seat?: number | null;
  price_business_seat?: number | null;
  price_soft_sleeper?: number | null;
  price_hard_sleeper?: number | null;
  price_hard_seat?: number | null;
  price_no_seat?: number | null;
};

export function getTrainTypeLabel(type: string, locale: FormatLocale = "zh-CN"): string {
  const zh: Record<string, string> = { G: "高铁", D: "动车", C: "城际", Z: "直达", T: "特快", K: "快速" };
  const en: Record<string, string> = { G: "High-speed", D: "D-train", C: "Intercity", Z: "Direct", T: "Express", K: "Fast" };
  return (locale === "en" ? en : zh)[type] || type;
}

// Coherent, stable palette (avoid confusing random hues across types)
// High-speed: cool (blue/cyan), Conventional: warm/neutral
const TRAIN_TYPE_COLORS: Record<string, string> = {
  G: "bg-blue-500",
  D: "bg-cyan-500",
  C: "bg-teal-500",
  Z: "bg-rose-500",
  T: "bg-orange-500",
  K: "bg-slate-500",
};

export function getTrainTypeColor(type: string): string { return TRAIN_TYPE_COLORS[type] || "bg-gray-500"; }

export function formatPrice(price: number | null | undefined): string { if (price == null) return "--"; return `¥${price.toFixed(0)}`; }

const FARE_ORDER = [
  "price_no_seat",
  "price_hard_seat",
  "price_hard_sleeper",
  "price_soft_sleeper",
  "price_second_seat",
  "price_first_seat",
  "price_business_seat",
] as const;

type FareKey = (typeof FARE_ORDER)[number];

export function getFareLabel(key: FareKey, locale: FormatLocale = "zh-CN"): string {
  const zh: Record<FareKey, string> = {
    price_no_seat: "无座",
    price_hard_seat: "硬座",
    price_hard_sleeper: "硬卧",
    price_soft_sleeper: "软卧",
    price_second_seat: "二等座",
    price_first_seat: "一等座",
    price_business_seat: "商务座",
  };
  const en: Record<FareKey, string> = {
    price_no_seat: "No seat",
    price_hard_seat: "Hard seat",
    price_hard_sleeper: "Hard sleeper",
    price_soft_sleeper: "Soft sleeper",
    price_second_seat: "2nd class",
    price_first_seat: "1st class",
    price_business_seat: "Business",
  };
  return (locale === "en" ? en : zh)[key];
}

export function getAvailableFares(train: FareCarrier) {
  return FARE_ORDER
    .map((key) => {
      const price = train[key];
      return price == null ? null : { key, price };
    })
    .filter((item): item is { key: FareKey; price: number } => item != null);
}

export function getLowestFare(train: FareCarrier) {
  const fares = getAvailableFares(train);
  if (fares.length === 0) return null;
  return fares.reduce((min, item) => (item.price < min.price ? item : min));
}

export function formatRemaining(count: number | null | undefined, locale: FormatLocale = "zh-CN"): string {
  if (count == null) return locale === "en" ? "Checking" : "查询中";
  if (count === 0) return locale === "en" ? "Sold out" : "无票";
  if (count > 99) return locale === "en" ? "Plenty" : "充足";
  return locale === "en" ? `${count} left` : `${count}张`;
}
