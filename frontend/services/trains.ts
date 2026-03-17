import type { TrainSearchResult, TrainSchedule, Station, TrainSearchParams, QuickSearchParams } from "@/types/trains";
import { get } from "./http";

export async function searchTickets(params: TrainSearchParams): Promise<TrainSearchResult[]> {
  return get<TrainSearchResult[]>("/api/v1/trains/search", {
    from_station: params.from_station,
    to_station: params.to_station,
    travel_date: params.travel_date,
    ...(params.train_type ? { train_type: params.train_type } : {}),
  });
}

export async function getTrainSchedule(trainNo: string, date: string): Promise<TrainSchedule> {
  return get<TrainSchedule>(`/api/v1/trains/${trainNo}/schedule`, { run_date: date });
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
