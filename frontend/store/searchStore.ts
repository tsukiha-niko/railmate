import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { TrainSearchResult } from "@/types/trains";

interface SearchState {
  results: TrainSearchResult[];
  loading: boolean;
  error: string | null;
  searched: boolean;
  searchDate: string;
  fromStation: string;
  toStation: string;

  setResults: (results: TrainSearchResult[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSearched: (searched: boolean) => void;
  setSearchDate: (date: string) => void;
  setFromStation: (station: string) => void;
  setToStation: (station: string) => void;
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

      setResults: (results) => set({ results }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      setSearched: (searched) => set({ searched }),
      setSearchDate: (searchDate) => set({ searchDate }),
      setFromStation: (fromStation) => set({ fromStation }),
      setToStation: (toStation) => set({ toStation }),
      clear: () =>
        set({ results: [], searched: false, error: null, fromStation: "", toStation: "" }),
    }),
    {
      name: "railmate-search",
      // sessionStorage：刷新后清空，同一会话内跨页面导航保留
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
        searched: state.searched,
        searchDate: state.searchDate,
        fromStation: state.fromStation,
        toStation: state.toStation,
        // loading/error 不持久化：刷新后应重置
      }),
    },
  ),
);
