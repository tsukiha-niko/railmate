import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { TrainSearchResult } from "@/types/trains";

export interface RecentSearch {
  from: string;
  to: string;
  date: string;
  timestamp: number;
}

const MAX_RECENT = 10;

interface SearchState {
  results: TrainSearchResult[];
  loading: boolean;
  error: string | null;
  searched: boolean;
  searchDate: string;
  fromStation: string;
  toStation: string;
  trainTypeFilter: string;
  recentSearches: RecentSearch[];

  setResults: (results: TrainSearchResult[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSearched: (searched: boolean) => void;
  setSearchDate: (date: string) => void;
  setFromStation: (station: string) => void;
  setToStation: (station: string) => void;
  setTrainTypeFilter: (filter: string) => void;
  addRecentSearch: (entry: Omit<RecentSearch, "timestamp">) => void;
  clearRecentSearches: () => void;
  clear: () => void;
}

export const useSearchStore = create<SearchState>()(
  persist(
    (set) => ({
      results: [],
      loading: false,
      error: null,
      searched: false,
      searchDate: "",
      fromStation: "",
      toStation: "",
      trainTypeFilter: "",
      recentSearches: [],

      setResults: (results) => set({ results }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      setSearched: (searched) => set({ searched }),
      setSearchDate: (searchDate) => set({ searchDate }),
      setFromStation: (fromStation) => set({ fromStation }),
      setToStation: (toStation) => set({ toStation }),
      setTrainTypeFilter: (trainTypeFilter) => set({ trainTypeFilter }),
      addRecentSearch: (entry) =>
        set((s) => {
          const deduped = s.recentSearches.filter(
            (r) => !(r.from === entry.from && r.to === entry.to),
          );
          return {
            recentSearches: [{ ...entry, timestamp: Date.now() }, ...deduped].slice(0, MAX_RECENT),
          };
        }),
      clearRecentSearches: () => set({ recentSearches: [] }),
      clear: () =>
        set({ results: [], searched: false, error: null, fromStation: "", toStation: "", trainTypeFilter: "" }),
    }),
    {
      name: "railmate-search",
      storage: createJSONStorage(() =>
        typeof window !== "undefined"
          ? sessionStorage
          : {
              getItem: () => null,
              setItem: () => {},
              removeItem: () => {},
            },
      ),
      partialize: (state) => ({
        results: state.results,
        trainTypeFilter: state.trainTypeFilter,
        searched: state.searched,
        searchDate: state.searchDate,
        fromStation: state.fromStation,
        toStation: state.toStation,
        recentSearches: state.recentSearches,
      }),
    },
  ),
);
