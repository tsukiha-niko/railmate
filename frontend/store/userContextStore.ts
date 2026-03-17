import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { GeoLocation } from "@/types/geo";

interface UserContextState {
  location: GeoLocation | null;
  preference: "fast" | "cheap" | "balanced";
  favoriteStations: string[];
  _hasHydrated: boolean;

  setLocation: (loc: GeoLocation) => void;
  clearLocation: () => void;
  setPreference: (pref: "fast" | "cheap" | "balanced") => void;
  addFavoriteStation: (station: string) => void;
  removeFavoriteStation: (station: string) => void;
}

export const useUserContextStore = create<UserContextState>()(
  persist(
    (set) => ({
      location: null,
      preference: "balanced",
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
