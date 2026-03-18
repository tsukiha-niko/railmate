import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { GeoLocation } from "@/types/geo";
import type { PlanningMode } from "@/types/chat";

interface UserContextState {
  location: GeoLocation | null;
  preference: "fast" | "cheap" | "balanced";
  planningMode: PlanningMode;
  favoriteStations: string[];
  _hasHydrated: boolean;

  setLocation: (loc: GeoLocation) => void;
  clearLocation: () => void;
  setPreference: (pref: "fast" | "cheap" | "balanced") => void;
  setPlanningMode: (mode: PlanningMode) => void;
  addFavoriteStation: (station: string) => void;
  removeFavoriteStation: (station: string) => void;
}

export const useUserContextStore = create<UserContextState>()(
  persist(
    (set) => ({
      location: null,
      preference: "balanced",
      planningMode: "efficient",
      favoriteStations: [],
      _hasHydrated: false,

      setLocation(loc) {
        set({ location: loc });
      },

      clearLocation() {
        set({ location: null });
      },

      setPreference(pref) {
        set({ preference: pref });
      },

      setPlanningMode(mode) {
        set({ planningMode: mode });
      },

      addFavoriteStation(station) {
        set((s) => ({
          favoriteStations: s.favoriteStations.includes(station)
            ? s.favoriteStations
            : [...s.favoriteStations, station],
        }));
      },

      removeFavoriteStation(station) {
        set((s) => ({
          favoriteStations: s.favoriteStations.filter((st) => st !== station),
        }));
      },
    }),
    {
      name: "railmate-user-context",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? localStorage : {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        },
      ),
      onRehydrateStorage: () => () => {
        useUserContextStore.setState({ _hasHydrated: true });
      },
    },
  ),
);
