"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type ThemeMode = "system" | "light" | "dark";

type ThemeContextValue = {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "railmate.theme";

function getSystemPrefersDark() {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? false;
}

function applyThemeClass(mode: ThemeMode) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const isDark = mode === "dark" || (mode === "system" && getSystemPrefersDark());
  root.classList.toggle("dark", isDark);
  root.dataset.theme = mode;
}

function readStoredTheme(): ThemeMode | null {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === "system" || v === "light" || v === "dark" ? v : null;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Always start with "system" so SSR and first client render match
  const [theme, setThemeState] = useState<ThemeMode>("system");

  // After mount, sync from localStorage if different
  useEffect(() => {
    const stored = readStoredTheme();
    if (stored && stored !== "system") setThemeState(stored);
    // Apply theme class immediately on mount (even for "system")
    applyThemeClass(stored ?? "system");
  }, []);

  useEffect(() => {
    applyThemeClass(theme);
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    const mql = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!mql) return;
    const handler = () => {
      if (theme === "system") applyThemeClass("system");
    };
    mql.addEventListener?.("change", handler);
    return () => mql.removeEventListener?.("change", handler);
  }, [theme]);

  const setTheme = useCallback((t: ThemeMode) => setThemeState(t), []);

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
