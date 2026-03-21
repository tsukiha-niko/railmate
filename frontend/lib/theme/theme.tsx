"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { ThemeProvider as MuiThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { lightTheme, darkTheme } from "./muiTheme";

export type ThemeMode = "system" | "light" | "dark";

type ThemeContextValue = {
  theme: ThemeMode;
  resolvedMode: "light" | "dark";
  setTheme: (theme: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "railmate.theme";
const themeListeners = new Set<() => void>();

function getSystemPrefersDark() {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? false;
}

function resolveMode(mode: ThemeMode): "light" | "dark" {
  if (mode === "system") return getSystemPrefersDark() ? "dark" : "light";
  return mode;
}

function applyThemeClass(mode: ThemeMode) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const isDark = resolveMode(mode) === "dark";
  root.classList.toggle("dark", isDark);
  root.dataset.theme = mode;
}

function readStoredTheme(): ThemeMode | null {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === "system" || v === "light" || v === "dark" ? v : null;
}

function subscribeTheme(callback: () => void) {
  themeListeners.add(callback);

  if (typeof window === "undefined") {
    return () => { themeListeners.delete(callback); };
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) callback();
  };
  window.addEventListener("storage", handleStorage);

  return () => {
    themeListeners.delete(callback);
    window.removeEventListener("storage", handleStorage);
  };
}

function emitThemeChange() {
  themeListeners.forEach((listener) => listener());
}

function getThemeSnapshot(): ThemeMode {
  return readStoredTheme() ?? "system";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const theme = useSyncExternalStore<ThemeMode>(subscribeTheme, getThemeSnapshot, () => "system");
  /** 首帧与服务端一致：避免 system 主题下 matchMedia 与 SSR 恒为浅色不一致导致 hydration 报错 */
  const resolved = mounted ? resolveMode(theme) : "light";
  const muiTheme = resolved === "dark" ? darkTheme : lightTheme;

  useEffect(() => {
    if (!mounted) return;
    applyThemeClass(theme);
  }, [mounted, theme]);

  useEffect(() => {
    if (!mounted) return;
    const mql = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!mql) return;
    const handler = () => {
      if (theme === "system") {
        applyThemeClass("system");
        emitThemeChange();
      }
    };
    mql.addEventListener?.("change", handler);
    return () => mql.removeEventListener?.("change", handler);
  }, [mounted, theme]);

  const setTheme = useCallback((nextTheme: ThemeMode) => {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(STORAGE_KEY) === nextTheme) return;
    window.localStorage.setItem(STORAGE_KEY, nextTheme);
    emitThemeChange();
  }, []);

  const value = useMemo(() => ({ theme, resolvedMode: resolved, setTheme }), [theme, resolved, setTheme]);

  return (
    <ThemeContext.Provider value={value}>
      <MuiThemeProvider theme={muiTheme}>
        <CssBaseline enableColorScheme />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
