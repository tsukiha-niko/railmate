"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type Locale = "zh-CN" | "en";

type Messages = Record<string, string>;

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

const STORAGE_KEY = "railmate.locale";

function format(str: string, vars?: Record<string, string | number>) {
  if (!vars) return str;
  return str.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`));
}

function readStoredLocale(): Locale | null {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === "zh-CN" || v === "en" ? v : null;
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
  // Always start with defaultLocale so SSR and first client render match
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);

  // After mount, sync from localStorage if different
  useEffect(() => {
    const stored = readStoredLocale();
    if (stored && stored !== defaultLocale) setLocaleState(stored);
  }, [defaultLocale]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, locale);
    document.documentElement.lang = locale;
    document.documentElement.dataset.locale = locale;
  }, [locale]);

  const setLocale = useCallback((l: Locale) => setLocaleState(l), []);

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
