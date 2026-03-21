"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { listStations } from "@/services/trains";
import type { Station } from "@/types/trains";

export function useStations() {
  return useQuery({
    queryKey: ["stations"],
    queryFn: () => listStations(),
    staleTime: 30 * 60_000,
  });
}

/** 查票表单只应调用一次：避免两个 Autocomplete 各拉全量站并各做一遍 O(n) 排序阻塞首击搜索 */
export function useSortedStationsForSearch(favoriteNames: readonly string[]) {
  const query = useStations();
  const stations = query.data ?? [];
  const favSet = useMemo(() => new Set(favoriteNames), [favoriteNames]);
  const sortedStations = useMemo(() => {
    if (!stations.length) return [];
    const favs: Station[] = [];
    const hubs: Station[] = [];
    const rest: Station[] = [];
    for (const s of stations) {
      if (favSet.has(s.name)) favs.push(s);
      else if (s.is_hub) hubs.push(s);
      else rest.push(s);
    }
    return [...favs, ...hubs, ...rest];
  }, [stations, favSet]);
  return { sortedStations, isLoading: query.isLoading, isFetching: query.isFetching };
}
