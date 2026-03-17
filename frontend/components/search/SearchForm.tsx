"use client";

import { useState, useCallback } from "react";
import { Search, ArrowLeftRight, MapPin, CalendarDays } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useUserContextStore } from "@/store/userContextStore";
import { getToday, getTomorrow, formatDateLocalized } from "@/utils/date";
import type { TrainSearchParams } from "@/types/trains";
import { useI18n } from "@/lib/i18n/i18n";

interface Props { onSearch: (params: TrainSearchParams) => void; loading?: boolean; }

export function SearchForm({ onSearch, loading }: Props) {
  const location = useUserContextStore((s) => s.location);
  const [from, setFrom] = useState(location?.station || "");
  const [to, setTo] = useState("");
  const [date, setDate] = useState(getToday());
  const [trainType, setTrainType] = useState("");
  const { t, locale } = useI18n();

  const TRAIN_TYPES = [
    { value: "", label: t("search.type.all") }, { value: "G", label: t("search.type.G") },
    { value: "D", label: t("search.type.D") }, { value: "Z", label: t("search.type.Z") },
    { value: "T", label: t("search.type.T") }, { value: "K", label: t("search.type.K") },
  ];

  const handleSwap = useCallback(() => { setFrom(to); setTo(from); }, [from, to]);
  const handleSearch = useCallback(() => {
    if (!from.trim() || !to.trim()) return;
    onSearch({ from_station: from.trim(), to_station: to.trim(), travel_date: date, ...(trainType ? { train_type: trainType } : {}) });
  }, [from, to, date, trainType, onSearch]);
  const useMyLocation = useCallback(() => {
    if (location?.station) setFrom(location.station); else if (location?.city) setFrom(location.city);
  }, [location]);

  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">{t("search.from")}</label>
          <div className="relative">
            <Input value={from} onChange={(e) => setFrom(e.target.value)} placeholder={t("search.stationPlaceholder")} className="pr-8" />
            {location && (<button onClick={useMyLocation} className="absolute right-2 top-1/2 -translate-y-1/2 text-primary hover:text-primary/80 transition-colors" title={t("search.useMyLocation")}><MapPin className="h-4 w-4" /></button>)}
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={handleSwap} className="mt-5 shrink-0"><ArrowLeftRight className="h-4 w-4" /></Button>
        <div className="flex-1 space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">{t("search.to")}</label>
          <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder={t("search.stationPlaceholder")} />
        </div>
      </div>
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{t("search.departDate")}</label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} min={getToday()} />
        </div>
        <div className="flex gap-1.5 mt-5">
          <Button variant={date === getToday() ? "default" : "outline"} size="sm" onClick={() => setDate(getToday())}>{t("search.today")}</Button>
          <Button variant={date === getTomorrow() ? "default" : "outline"} size="sm" onClick={() => setDate(getTomorrow())}>{t("search.tomorrow")}</Button>
        </div>
      </div>
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span className="text-xs text-muted-foreground">{t("search.trainType")}</span>
        {TRAIN_TYPES.map((tt) => (<Badge key={tt.value} variant={trainType === tt.value ? "default" : "outline"} className="cursor-pointer transition-colors" onClick={() => setTrainType(tt.value)}>{tt.label}</Badge>))}
      </div>
      <Button onClick={handleSearch} disabled={!from.trim() || !to.trim() || loading} className="w-full gap-2">
        <Search className="h-4 w-4" />{loading ? t("search.searching") : t("search.btn.search")}
      </Button>
      {date && <p className="text-xs text-muted-foreground text-center mt-2">{formatDateLocalized(date, locale === "en" ? "en" : "zh-CN")}</p>}
    </motion.div>
  );
}
