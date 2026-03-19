"use client";

import { useState, useCallback } from "react";
import { Search, ArrowLeftRight, MapPin, CalendarDays } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useUserContextStore } from "@/store/userContextStore";
import { useSearchStore } from "@/store/searchStore";
import { getToday, getTomorrow, formatDateLocalized } from "@/utils/date";
import type { TrainSearchParams } from "@/types/trains";
import { useI18n } from "@/lib/i18n/i18n";

interface Props { onSearch: (params: TrainSearchParams) => void; loading?: boolean; }

export function SearchForm({ onSearch, loading }: Props) {
  const location = useUserContextStore((s) => s.location);
  // 优先用上次搜索的站点回填表单（从 store 读取）
  const prevFrom = useSearchStore((s) => s.fromStation);
  const prevTo = useSearchStore((s) => s.toStation);
  const prevDate = useSearchStore((s) => s.searchDate);
  const [from, setFrom] = useState(prevFrom || location?.station || "");
  const [to, setTo] = useState(prevTo || "");
  const [date, setDate] = useState(prevDate || getToday());
  const [trainType, setTrainType] = useState("");
  const { t, locale } = useI18n();

  const TRAIN_TYPES = [
    { value: "", label: t("search.type.all") },
    { value: "G", label: t("search.type.G") },
    { value: "D", label: t("search.type.D") },
    { value: "Z", label: t("search.type.Z") },
    { value: "T", label: t("search.type.T") },
    { value: "K", label: t("search.type.K") },
  ];

  const handleSwap = useCallback(() => { setFrom(to); setTo(from); }, [from, to]);
  const handleSearch = useCallback(() => {
    if (!from.trim() || !to.trim()) return;
    onSearch({
      from_station: from.trim(),
      to_station: to.trim(),
      travel_date: date,
      ...(trainType ? { train_type: trainType } : {}),
    });
  }, [from, to, date, trainType, onSearch]);
  const useMyLocation = useCallback(() => {
    if (location?.station) setFrom(location.station);
    else if (location?.city) setFrom(location.city);
  }, [location]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card p-5 shadow-sm"
    >
      {/* Station inputs */}
      <div className="mb-4 grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-end">
        <div className="flex-1 space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">{t("search.from")}</label>
          <div className="relative">
            <Input
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              placeholder={t("search.stationPlaceholder")}
              className="pr-8"
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            {location && (
              <button
                onClick={useMyLocation}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-primary hover:text-primary/80 transition-colors"
                title={t("search.useMyLocation")}
              >
                <MapPin className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleSwap}
          className="shrink-0 justify-self-center md:mb-0.5 hover:bg-primary/10"
        >
          <ArrowLeftRight className="h-4 w-4" />
        </Button>
        <div className="flex-1 space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">{t("search.to")}</label>
          <Input
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder={t("search.stationPlaceholder")}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
        </div>
      </div>

      {/* Date row */}
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="flex-1 space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5" />{t("search.departDate")}
          </label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} min={getToday()} />
        </div>
        <div className="flex flex-wrap gap-1.5 lg:mb-0.5">
          <Button
            variant={date === getToday() ? "default" : "outline"}
            size="sm"
            onClick={() => setDate(getToday())}
          >
            {t("search.today")}
          </Button>
          <Button
            variant={date === getTomorrow() ? "default" : "outline"}
            size="sm"
            onClick={() => setDate(getTomorrow())}
          >
            {t("search.tomorrow")}
          </Button>
        </div>
      </div>

      {/* Train type filter */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">{t("search.trainType")}</span>
        {TRAIN_TYPES.map((tt) => (
          <Badge
            key={tt.value}
            variant={trainType === tt.value ? "default" : "outline"}
            className="cursor-pointer transition-colors hover:bg-primary/10"
            onClick={() => setTrainType(tt.value)}
          >
            {tt.label}
          </Badge>
        ))}
      </div>

      {/* Search button */}
      <Button
        onClick={handleSearch}
        disabled={!from.trim() || !to.trim() || loading}
        className="w-full gap-2"
        size="lg"
      >
        <Search className="h-4 w-4" />
        {loading ? t("search.searching") : t("search.btn.search")}
      </Button>

      {date && (
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          {formatDateLocalized(date, locale === "en" ? "en" : "zh-CN")}
        </p>
      )}
    </motion.div>
  );
}
