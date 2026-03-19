"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, TrainFront } from "lucide-react";
import { SearchForm } from "@/components/search/SearchForm";
import { TrainCardList } from "@/components/tickets/TrainCardList";
import { useTicketSearch } from "@/hooks/useTicketSearch";
import type { TrainSearchParams } from "@/types/trains";
import { useI18n } from "@/lib/i18n/i18n";
import { formatDuration } from "@/utils/date";
import { formatPrice, getLowestFare } from "@/utils/format";
import { cn } from "@/utils/cn";

type SortKey = "departure" | "duration" | "price";
type SortDirection = "asc" | "desc";

function toMinutesOfDay(time: string): number {
  const [h, m] = time.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return Number.MAX_SAFE_INTEGER;
  return h * 60 + m;
}

function compareBySortKey(
  a: ReturnType<typeof useTicketSearch>["results"][number],
  b: ReturnType<typeof useTicketSearch>["results"][number],
  sortKey: SortKey,
): number {
  const aPrice = getLowestFare(a)?.price ?? Infinity;
  const bPrice = getLowestFare(b)?.price ?? Infinity;
  const aDeparture = toMinutesOfDay(a.departure_time);
  const bDeparture = toMinutesOfDay(b.departure_time);

  if (sortKey === "departure") {
    return aDeparture - bDeparture || a.duration_minutes - b.duration_minutes || aPrice - bPrice;
  }
  if (sortKey === "duration") {
    return a.duration_minutes - b.duration_minutes || aDeparture - bDeparture || aPrice - bPrice;
  }
  return aPrice - bPrice || aDeparture - bDeparture || a.duration_minutes - b.duration_minutes;
}

export default function SearchPage() {
  const { results, loading, error, searched, searchDate, search } = useTicketSearch();
  const { t, locale } = useI18n();
  const [sortKey, setSortKey] = useState<SortKey>("departure");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const handleSearch = (params: TrainSearchParams) => {
    search(params);
  };

  const statsLocale = locale === "en" ? "en" : "zh-CN";
  const sortedResults = useMemo(() => {
    const list = [...results];
    list.sort((a, b) => {
      const value = compareBySortKey(a, b, sortKey);
      return sortDirection === "asc" ? value : -value;
    });
    return list;
  }, [results, sortDirection, sortKey]);

  const getTopBySort = useMemo(() => {
    return (key: SortKey, direction: SortDirection) => {
      if (results.length === 0) return null;
      const list = [...results];
      list.sort((a, b) => {
        const value = compareBySortKey(a, b, key);
        return direction === "asc" ? value : -value;
      });
      return list[0] ?? null;
    };
  }, [results]);

  const departureTop = getTopBySort("departure", sortKey === "departure" ? sortDirection : "asc");
  const durationTop = getTopBySort("duration", sortKey === "duration" ? sortDirection : "asc");
  const priceTop = getTopBySort("price", sortKey === "price" ? sortDirection : "asc");
  const priceTopFare = priceTop ? getLowestFare(priceTop) : null;

  const sortLabel = (key: SortKey, direction: SortDirection) => {
    if (key === "departure") {
      if (locale === "en") return direction === "asc" ? "Departure (Early → Late)" : "Departure (Late → Early)";
      return direction === "asc" ? "出发时间（早→晚）" : "出发时间（晚→早）";
    }
    if (key === "duration") {
      if (locale === "en") return direction === "asc" ? "Duration (Short → Long)" : "Duration (Long → Short)";
      return direction === "asc" ? "耗时（短→长）" : "耗时（长→短）";
    }
    if (locale === "en") return direction === "asc" ? "Price (Low → High)" : "Price (High → Low)";
    return direction === "asc" ? "价格（低→高）" : "价格（高→低）";
  };

  const sortIcon = sortDirection === "asc" ? "↑" : "↓";

  const handleSortClick = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDirection("asc");
  };

  return (
    <div className="mx-auto flex w-full max-w-[1680px] flex-1 flex-col overflow-y-auto px-3 py-3 sm:px-5 sm:py-4 lg:px-6">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-2.5 flex items-center gap-2.5 sm:mb-3 sm:gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <TrainFront className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">{t("search.title")}</h1>
            <p className="text-xs text-muted-foreground">{t("search.subtitle")}</p>
          </div>
        </div>
      </motion.div>

      <div className="grid flex-1 gap-4 lg:grid-cols-[380px_minmax(0,1fr)] lg:gap-5">
        <div className="lg:sticky lg:top-3 lg:h-fit">
          <SearchForm onSearch={handleSearch} loading={loading} />
        </div>

        <div className="space-y-3">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3"
            >
              <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
            </motion.div>
          )}

          {searched && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              {!loading && results.length > 0 && (
                <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-muted-foreground">
                    {t("search.found", { count: results.length })}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    {departureTop ? (
                      <button
                        type="button"
                        onClick={() => handleSortClick("departure")}
                        className={cn(
                          "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
                          sortKey === "departure"
                            ? "border-primary/25 bg-primary/12 text-primary"
                            : "border-secondary bg-secondary/70 text-secondary-foreground hover:border-primary/20 hover:text-foreground",
                        )}
                        title={sortLabel("departure", sortKey === "departure" ? sortDirection : "asc")}
                        aria-label={sortLabel("departure", sortKey === "departure" ? sortDirection : "asc")}
                      >
                        {departureTop.departure_time}{sortKey === "departure" ? ` ${sortIcon}` : ""}
                      </button>
                    ) : null}
                    {durationTop ? (
                      <button
                        type="button"
                        onClick={() => handleSortClick("duration")}
                        className={cn(
                          "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
                          sortKey === "duration"
                            ? "border-primary/25 bg-primary/12 text-primary"
                            : "border-secondary bg-secondary/70 text-secondary-foreground hover:border-primary/20 hover:text-foreground",
                        )}
                        title={sortLabel("duration", sortKey === "duration" ? sortDirection : "asc")}
                        aria-label={sortLabel("duration", sortKey === "duration" ? sortDirection : "asc")}
                      >
                        {formatDuration(durationTop.duration_minutes, statsLocale)}{sortKey === "duration" ? ` ${sortIcon}` : ""}
                      </button>
                    ) : null}
                    {priceTopFare ? (
                      <button
                        type="button"
                        onClick={() => handleSortClick("price")}
                        className={cn(
                          "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
                          sortKey === "price"
                            ? "border-primary/25 bg-primary/12 text-primary"
                            : "border-secondary bg-secondary/70 text-secondary-foreground hover:border-primary/20 hover:text-foreground",
                        )}
                        title={sortLabel("price", sortKey === "price" ? sortDirection : "asc")}
                        aria-label={sortLabel("price", sortKey === "price" ? sortDirection : "asc")}
                      >
                        {formatPrice(priceTopFare.price)}{sortKey === "price" ? ` ${sortIcon}` : ""}
                      </button>
                    ) : null}
                  </div>
                </div>
              )}
              <TrainCardList
                trains={sortedResults}
                date={searchDate}
                loading={loading}
                emptyMessage={t("search.empty")}
              />
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
