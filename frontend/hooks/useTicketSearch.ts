"use client";

import { useCallback, useMemo } from "react";
import { searchTickets } from "@/services/trains";
import type { TrainSearchParams } from "@/types/trains";
import { useSearchStore } from "@/store/searchStore";
import { useI18n } from "@/lib/i18n/i18n";
import { filterTrainsByType } from "@/utils/trainSearchFilter";

export function useTicketSearch() {
  const { t } = useI18n();
  const results = useSearchStore((s) => s.results);
  const trainTypeFilter = useSearchStore((s) => s.trainTypeFilter);
  const loading = useSearchStore((s) => s.loading);
  const error = useSearchStore((s) => s.error);
  const searched = useSearchStore((s) => s.searched);
  const searchDate = useSearchStore((s) => s.searchDate);
  const { setResults, setLoading, setError, setSearched, setSearchDate, setFromStation, setToStation, clear } =
    useSearchStore();

  const addRecentSearch = useSearchStore((s) => s.addRecentSearch);

  const filteredResults = useMemo(
    () => filterTrainsByType(results, trainTypeFilter),
    [results, trainTypeFilter],
  );

  const search = useCallback(
    async (params: TrainSearchParams) => {
      setLoading(true);
      setError(null);
      setSearched(true);
      setSearchDate(params.travel_date);
      setFromStation(params.from_station);
      setToStation(params.to_station);
      addRecentSearch({ from: params.from_station, to: params.to_station, date: params.travel_date });
      try {
        const { from_station, to_station, travel_date } = params;
        const data = await searchTickets({ from_station, to_station, travel_date });
        setResults(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : t("errors.searchFailed"));
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [t, setLoading, setError, setSearched, setSearchDate, setFromStation, setToStation, setResults, addRecentSearch],
  );

  return { results, filteredResults, trainTypeFilter, loading, error, searched, searchDate, search, clear };
}
