"use client";

import { useState, useCallback } from "react";
import { searchTickets } from "@/services/trains";
import type { TrainSearchResult, TrainSearchParams } from "@/types/trains";
import { useI18n } from "@/lib/i18n/i18n";

export function useTicketSearch() {
  const [results, setResults] = useState<TrainSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const { t } = useI18n();

  const search = useCallback(
    async (params: TrainSearchParams) => {
      setLoading(true);
      setError(null);
      setSearched(true);
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
    [t],
  );

  const clear = useCallback(() => {
    setResults([]);
    setSearched(false);
    setError(null);
  }, []);

  return { results, loading, error, searched, search, clear };
}
