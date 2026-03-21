"use client";

import { useQuery } from "@tanstack/react-query";
import { listStations } from "@/services/trains";

export function useStations() {
  return useQuery({
    queryKey: ["stations"],
    queryFn: () => listStations(),
    staleTime: 30 * 60_000,
  });
}
