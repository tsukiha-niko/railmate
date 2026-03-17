"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { SearchForm } from "@/components/search/SearchForm";
import { TrainCardList } from "@/components/tickets/TrainCardList";
import { useTicketSearch } from "@/hooks/useTicketSearch";
import { getToday } from "@/utils/date";
import type { TrainSearchParams } from "@/types/trains";
import { useI18n } from "@/lib/i18n/i18n";

export default function SearchPage() {
  const { results, loading, error, searched, search } = useTicketSearch();
  const [searchDate, setSearchDate] = useState(getToday());
  const { t } = useI18n();

  const handleSearch = (params: TrainSearchParams) => { setSearchDate(params.travel_date); search(params); };

  return (
    <div className="max-w-3xl mx-auto w-full p-4 space-y-5 pb-20 md:pb-4">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-xl font-bold mb-1">{t("search.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("search.subtitle")}</p>
      </motion.div>
      <SearchForm onSearch={handleSearch} loading={loading} />
      {error && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</motion.div>)}
      {searched && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-muted-foreground">{loading ? t("search.searching") : results.length > 0 ? t("search.found", { count: results.length }) : ""}</h2>
          </div>
          <TrainCardList trains={results} date={searchDate} loading={loading} emptyMessage={t("search.empty")} />
        </div>
      )}
    </div>
  );
}
