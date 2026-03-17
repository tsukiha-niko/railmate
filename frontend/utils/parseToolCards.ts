import type { ToolCall } from "@/types/chat";

export interface TrainCardData {
  train_no: string;
  train_type: string;
  from_station: string;
  to_station: string;
  departure_time: string;
  arrival_time: string;
  duration_minutes: number;
  price_second_seat?: number | null;
  remaining_tickets?: number | null;
  date?: string;
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

export type ChatCard = TrainListCard | FastestTrainCard;

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
    from_station: (raw.from_station ?? fallbackFrom) as string,
    to_station: (raw.to_station ?? fallbackTo) as string,
    departure_time: (raw.d ?? raw.departure_time ?? "") as string,
    arrival_time: (raw.a ?? raw.arrival_time ?? "") as string,
    duration_minutes: Number(raw.m ?? raw.duration_minutes ?? 0),
    price_second_seat: raw.p != null ? Number(raw.p) : raw.price_second_seat != null ? Number(raw.price_second_seat) : null,
    remaining_tickets: raw.r != null ? Number(raw.r) : raw.remaining_tickets != null ? Number(raw.remaining_tickets) : null,
    date: (raw.date ?? fallbackDate) as string,
  };
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
    if (!parsed || !parsed.success) continue;

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
            const t = normalizeCompactTrain(r as Record<string, unknown>, from, to, date);
            if (t) allTrains.push(t);
          }
        }
      }
      if (allTrains.length > 0) {
        cards.push({ type: "fastest_train", trains: allTrains, hint: parsed.message as string | undefined });
      }
    }
  }

  return cards;
}
