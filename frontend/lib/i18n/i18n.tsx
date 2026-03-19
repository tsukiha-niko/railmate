"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from "react";

export type Locale = "zh-CN" | "en";

type Messages = Record<string, string>;

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

const STORAGE_KEY = "railmate.locale";
const localeListeners = new Set<() => void>();

function format(str: string, vars?: Record<string, string | number>) {
  if (!vars) return str;
  return str.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`));
}

function readStoredLocale(): Locale | null {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === "zh-CN" || v === "en" ? v : null;
}

function subscribeLocale(callback: () => void) {
  localeListeners.add(callback);

  if (typeof window === "undefined") {
    return () => {
      localeListeners.delete(callback);
    };
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) callback();
  };

  window.addEventListener("storage", handleStorage);

  return () => {
    localeListeners.delete(callback);
    window.removeEventListener("storage", handleStorage);
  };
}

function emitLocaleChange() {
  localeListeners.forEach((listener) => listener());
}

function getLocaleSnapshot(defaultLocale: Locale): Locale {
  return readStoredLocale() ?? defaultLocale;
}

export function I18nProvider({
  children,
  messages,
  defaultLocale = "zh-CN",
}: {
  children: React.ReactNode;
  messages: Record<Locale, Messages>;
  defaultLocale?: Locale;
}) {
  const locale = useSyncExternalStore<Locale>(
    subscribeLocale,
    () => getLocaleSnapshot(defaultLocale),
    () => defaultLocale,
  );

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dataset.locale = locale;
  }, [locale]);

  const setLocale = useCallback((nextLocale: Locale) => {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(STORAGE_KEY) === nextLocale) return;
    window.localStorage.setItem(STORAGE_KEY, nextLocale);
    emitLocaleChange();
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const table = messages[locale] ?? messages[defaultLocale];
      const fallbackTable = messages[defaultLocale];
      const raw = table?.[key] ?? fallbackTable?.[key] ?? key;
      return format(raw, vars);
    },
    [defaultLocale, locale, messages],
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
