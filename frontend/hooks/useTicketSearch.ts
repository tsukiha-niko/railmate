"use client";

import { useCallback } from "react";
import { searchTickets } from "@/services/trains";
import type { TrainSearchParams } from "@/types/trains";
import { useSearchStore } from "@/store/searchStore";
import { useI18n } from "@/lib/i18n/i18n";

export function useTicketSearch() {
  const { t } = useI18n();
  const results = useSearchStore((s) => s.results);
  const loading = useSearchStore((s) => s.loading);
  const error = useSearchStore((s) => s.error);
  const searched = useSearchStore((s) => s.searched);
  const searchDate = useSearchStore((s) => s.searchDate);
  const { setResults, setLoading, setError, setSearched, setSearchDate, setFromStation, setToStation, clear } =
    useSearchStore();

  const search = useCallback(
    async (params: TrainSearchParams) => {
      setLoading(true);
      setError(null);
      setSearched(true);
      setSearchDate(params.travel_date);
      setFromStation(params.from_station);
      setToStation(params.to_station);
      try {
        const data = await searchTickets(params);
        setResults(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : t("errors.searchFailed"));
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [t, setLoading, setError, setSearched, setSearchDate, setFromStation, setToStation, setResults],
  );

  return { results, loading, error, searched, searchDate, search, clear };
}
