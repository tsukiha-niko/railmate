import type { ToolCall } from "@/types/chat";

export interface TrainCardData {
  train_no: string;
  train_type: string;
  from_station: string;
  to_station: string;
  start_station?: string | null;
  end_station?: string | null;
  departure_time: string;
  arrival_time: string;
  duration_minutes: number;
  price_second_seat?: number | null;
  price_first_seat?: number | null;
  price_business_seat?: number | null;
  price_soft_sleeper?: number | null;
  price_hard_sleeper?: number | null;
  price_hard_seat?: number | null;
  price_no_seat?: number | null;
  remaining_tickets?: number | null;
  date?: string;
}

export interface TransferLegData {
  train_no: string;
  from_station: string;
  to_station: string;
  departure_time: string;
  arrival_time: string;
  duration_minutes: number;
  date?: string;
  price_second_seat?: number | null;
  price_first_seat?: number | null;
  price_business_seat?: number | null;
  price_soft_sleeper?: number | null;
  price_hard_sleeper?: number | null;
  price_hard_seat?: number | null;
  price_no_seat?: number | null;
}

export interface TransferPlanData {
  legs: TransferLegData[];
  via: string[];
  total_minutes: number;
  total_price?: number | null;
  waits: number[];
  score: number;
}

export interface TrainListCard {
  type: "train_list";
  from: string;
  to: string;
  date: string;
  trains: TrainCardData[];
}

export interface FastestTrainCard {
  type: "fastest_train";
  trains: TrainCardData[];
  hint?: string;
}

export interface TransferCard {
  type: "transfer";
  from: string;
  to: string;
  date: string;
  plans: TransferPlanData[];
  directCount: number;
}

export type ChatCard = TrainListCard | FastestTrainCard | TransferCard;

function toOptionalNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeCompactTrain(
  raw: Record<string, unknown>,
  fallbackFrom: string,
  fallbackTo: string,
  fallbackDate: string,
): TrainCardData | null {
  const no = (raw.t ?? raw.train_no) as string | undefined;
  if (!no) return null;
  return {
    train_no: no,
    train_type: (raw.y ?? raw.train_type ?? no.charAt(0)) as string,
    from_station: (raw.f ?? raw.from_station ?? fallbackFrom) as string,
    to_station: (raw.o ?? raw.to_station ?? fallbackTo) as string,
    start_station: (raw.s ?? raw.start_station ?? raw.f ?? raw.from_station ?? fallbackFrom) as string,
    end_station: (raw.e ?? raw.end_station ?? raw.o ?? raw.to_station ?? fallbackTo) as string,
    departure_time: (raw.d ?? raw.departure_time ?? "") as string,
    arrival_time: (raw.a ?? raw.arrival_time ?? "") as string,
    duration_minutes: Number(raw.m ?? raw.duration_minutes ?? 0),
    price_second_seat: raw.p != null ? Number(raw.p) : raw.price_second_seat != null ? Number(raw.price_second_seat) : null,
    price_first_seat: raw.price_first_seat != null ? Number(raw.price_first_seat) : null,
    price_business_seat: raw.price_business_seat != null ? Number(raw.price_business_seat) : null,
    price_soft_sleeper: raw.price_soft_sleeper != null ? Number(raw.price_soft_sleeper) : null,
    price_hard_sleeper: raw.price_hard_sleeper != null ? Number(raw.price_hard_sleeper) : null,
    price_hard_seat: raw.price_hard_seat != null ? Number(raw.price_hard_seat) : null,
    price_no_seat: raw.price_no_seat != null ? Number(raw.price_no_seat) : null,
    remaining_tickets: raw.r != null ? Number(raw.r) : raw.remaining_tickets != null ? Number(raw.remaining_tickets) : null,
    date: ((raw.date ?? fallbackDate) || undefined) as string | undefined,
  };
}

function normalizeTransferLeg(raw: Record<string, unknown>): TransferLegData {
  return {
    train_no: (raw.t ?? raw.train_no ?? "") as string,
    from_station: (raw.f ?? raw.from_station ?? "") as string,
    to_station: (raw.o ?? raw.to_station ?? "") as string,
    departure_time: (raw.d ?? raw.departure_time ?? "") as string,
    arrival_time: (raw.a ?? raw.arrival_time ?? "") as string,
    duration_minutes: Number(raw.m ?? raw.duration_minutes ?? 0),
    date: (raw.dt ?? raw.date ?? undefined) as string | undefined,
    price_second_seat: toOptionalNumber(raw.p ?? raw.price_second_seat),
    price_first_seat: toOptionalNumber(raw.price_first_seat),
    price_business_seat: toOptionalNumber(raw.price_business_seat),
    price_soft_sleeper: toOptionalNumber(raw.price_soft_sleeper),
    price_hard_sleeper: toOptionalNumber(raw.price_hard_sleeper),
    price_hard_seat: toOptionalNumber(raw.price_hard_seat),
    price_no_seat: toOptionalNumber(raw.price_no_seat),
  };
}

function getLowestLegFare(leg: TransferLegData): number | null {
  const candidates = [
    leg.price_no_seat,
    leg.price_hard_seat,
    leg.price_hard_sleeper,
    leg.price_soft_sleeper,
    leg.price_second_seat,
    leg.price_first_seat,
    leg.price_business_seat,
  ].filter((price): price is number => typeof price === "number" && Number.isFinite(price) && price > 0);

  if (!candidates.length) return null;
  return Math.min(...candidates);
}

function resolveTransferTotalPrice(rawTotal: unknown, legs: TransferLegData[]): number | null {
  const parsedTotal = toOptionalNumber(rawTotal);
  if (parsedTotal != null) return parsedTotal;
  if (!legs.length) return null;

  let sum = 0;
  for (const leg of legs) {
    const legFare = getLowestLegFare(leg);
    if (legFare == null) return null;
    sum += legFare;
  }

  return Math.round(sum * 10) / 10;
}

function tryParse(val: unknown): Record<string, unknown> | null {
  if (!val) return null;
  if (typeof val === "object") return val as Record<string, unknown>;
  if (typeof val === "string") {
    try { return JSON.parse(val); } catch { return null; }
  }
  return null;
}

export function extractCards(toolCalls?: ToolCall[]): ChatCard[] {
  if (!toolCalls?.length) return [];
  const cards: ChatCard[] = [];

  for (const tc of toolCalls) {
    const parsed = tryParse(tc.result);
    if (!parsed) continue;

    const ok = parsed.success ?? parsed.ok;
    if (ok === false) continue;

    const from = (parsed.from ?? "") as string;
    const to = (parsed.to ?? "") as string;
    const date = (parsed.date ?? "") as string;

    if (tc.tool_name === "search_tickets" && Array.isArray(parsed.trains)) {
      const trains = parsed.trains
        .map((r: Record<string, unknown>) => normalizeCompactTrain(r, from, to, date))
        .filter(Boolean) as TrainCardData[];
      if (trains.length > 0) {
        cards.push({ type: "train_list", from, to, date, trains });
      }
    }

    if (tc.tool_name === "find_fastest_train") {
      const allTrains: TrainCardData[] = [];
      for (const key of ["today_trains", "tomorrow_trains"]) {
        const arr = parsed[key];
        if (Array.isArray(arr)) {
          for (const r of arr) {
            const raw = r as Record<string, unknown>;
            const trainDate = (raw.date ?? date) as string;
            const t = normalizeCompactTrain(raw, from, to, trainDate);
            if (t) allTrains.push(t);
          }
        }
      }
      if (allTrains.length > 0) {
        cards.push({ type: "fastest_train", trains: allTrains, hint: parsed.message as string | undefined });
      }
    }

    if (
      (tc.tool_name === "search_transfer_tickets" || tc.tool_name === "search_stopover_itineraries")
      && Array.isArray(parsed.plans)
    ) {
      const plans: TransferPlanData[] = (parsed.plans as Record<string, unknown>[]).map((p) => {
        const legs = Array.isArray(p.legs)
          ? (p.legs as Record<string, unknown>[]).map(normalizeTransferLeg)
          : [];
        return {
          legs,
          via: Array.isArray(p.via) ? (p.via as string[]) : [],
          total_minutes: Number(p.total_min ?? p.total_duration_minutes ?? 0),
          total_price: resolveTransferTotalPrice(p.total_price, legs),
          waits: Array.isArray(p.waits) ? (p.waits as number[]) : [],
          score: Number(p.score ?? 0),
        };
      });
      if (plans.length > 0) {
        cards.push({
          type: "transfer",
          from, to, date,
          plans: plans.sort((a, b) => b.score - a.score).slice(0, 3),
          directCount: Number(parsed.direct ?? 0),
        });
      }
    }
  }

  return cards;
}
