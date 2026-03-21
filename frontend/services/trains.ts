import type { TrainSearchResult, TrainSchedule, Station, TrainSearchParams, QuickSearchParams } from "@/types/trains";
import { get } from "./http";

export async function searchTickets(params: TrainSearchParams): Promise<TrainSearchResult[]> {
  return get<TrainSearchResult[]>("/api/v1/trains/search", {
    from_station: params.from_station,
    to_station: params.to_station,
    travel_date: params.travel_date,
  });
}

export async function getTrainSchedule(
  trainNo: string,
  date: string,
  fromStation?: string,
  toStation?: string,
): Promise<TrainSchedule> {
  return get<TrainSchedule>(`/api/v1/trains/${trainNo}/schedule`, {
    run_date: date,
    ...(fromStation ? { from_station: fromStation } : {}),
    ...(toStation ? { to_station: toStation } : {}),
  });
}

export interface TrainPrices {
  business_seat?: number | null;
  first_seat?: number | null;
  second_seat?: number | null;
  soft_sleeper?: number | null;
  hard_sleeper?: number | null;
  hard_seat?: number | null;
  no_seat?: number | null;
}

export async function getTrainPrices(
  trainNo: string,
  runDate: string,
  fromStation: string,
  toStation: string,
): Promise<{
  train_no: string;
  date: string;
  prices: TrainPrices;
  logged_in?: boolean;
  requires_login?: boolean;
  source?: string;
}> {
  return get(`/api/v1/trains/${trainNo}/prices`, {
    run_date: runDate,
    from_station: fromStation,
    to_station: toStation,
  });
}

export async function listStations(city?: string): Promise<Station[]> {
  return get<Station[]>("/api/v1/trains/stations", city ? { city } : {});
}

export async function getQuickestTrain(params: QuickSearchParams): Promise<TrainSearchResult> {
  return get<TrainSearchResult>("/api/v1/trains/quickest", { ...params });
}

export async function getCheapestTrain(params: QuickSearchParams): Promise<TrainSearchResult> {
  return get<TrainSearchResult>("/api/v1/trains/cheapest", { ...params });
}
