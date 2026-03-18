"use client";

import { motion } from "framer-motion";
import { AlertCircle, TrainFront } from "lucide-react";
import { SearchForm } from "@/components/search/SearchForm";
import { TrainCardList } from "@/components/tickets/TrainCardList";
import { useTicketSearch } from "@/hooks/useTicketSearch";
import { getToday } from "@/utils/date";
import type { TrainSearchParams } from "@/types/trains";
import { useI18n } from "@/lib/i18n/i18n";

export default function SearchPage() {
  const { results, loading, error, searched, searchDate, search } = useTicketSearch();
  const { t } = useI18n();

  const handleSearch = (params: TrainSearchParams) => {
    search(params);
  };

  return (
    <div className="max-w-3xl mx-auto w-full p-4 space-y-5 overflow-y-auto flex-1">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
            <TrainFront className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">{t("search.title")}</h1>
            <p className="text-xs text-muted-foreground">{t("search.subtitle")}</p>
          </div>
        </div>
      </motion.div>

      <SearchForm onSearch={handleSearch} loading={loading} />

      {error && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3"
        >
          <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
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
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-muted-foreground">
                {t("search.found", { count: results.length })}
              </p>
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
  );
}
