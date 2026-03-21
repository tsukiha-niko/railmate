import type { TrainSearchResult } from "@/types/trains";

/** 前端按车次类型字母筛选（与后端 train_type 一致，如 G/D/Z） */
export function filterTrainsByType(trains: TrainSearchResult[], trainTypeFilter: string): TrainSearchResult[] {
  const f = trainTypeFilter.trim().toUpperCase();
  if (!f) return trains;
  return trains.filter((row) => (row.train_type || "").toUpperCase() === f);
}
