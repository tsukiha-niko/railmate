"use client";

import { motion } from "framer-motion";
import { AlertCircle, TrainFront } from "lucide-react";
import { SearchForm } from "@/components/search/SearchForm";
import { TrainCardList } from "@/components/tickets/TrainCardList";
import { useTicketSearch } from "@/hooks/useTicketSearch";
import type { TrainSearchParams } from "@/types/trains";
import { useI18n } from "@/lib/i18n/i18n";
import { Badge } from "@/components/ui/badge";
import { formatDuration } from "@/utils/date";
import { formatPrice, getLowestFare } from "@/utils/format";

export default function SearchPage() {
  const { results, loading, error, searched, searchDate, search } = useTicketSearch();
  const { t, locale } = useI18n();

  const handleSearch = (params: TrainSearchParams) => {
    search(params);
  };

  const earliest = results.length > 0 ? results.reduce((a, b) => (a.departure_time < b.departure_time ? a : b)) : null;
  const fastest = results.length > 0 ? results.reduce((a, b) => (a.duration_minutes < b.duration_minutes ? a : b)) : null;
  const cheapest = results.length > 0 ? results.reduce((a, b) =>
    (getLowestFare(a)?.price ?? Infinity) < (getLowestFare(b)?.price ?? Infinity) ? a : b,
  ) : null;
  const cheapestFare = cheapest ? getLowestFare(cheapest) : null;
  const statsLocale = locale === "en" ? "en" : "zh-CN";

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
                    {earliest ? <Badge variant="secondary" className="px-2 py-0.5">{earliest.departure_time}</Badge> : null}
                    {fastest ? (
                      <Badge variant="secondary" className="px-2 py-0.5">
                        {formatDuration(fastest.duration_minutes, statsLocale)}
                      </Badge>
                    ) : null}
                    {cheapestFare ? <Badge variant="default" className="px-2 py-0.5">{formatPrice(cheapestFare.price)}</Badge> : null}
                  </div>
                </div>
              )}
              <TrainCardList
                trains={results}
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
