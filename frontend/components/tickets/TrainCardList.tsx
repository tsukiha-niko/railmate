"use client";

import { motion } from "framer-motion";
import { TrainFront, Loader2, Search } from "lucide-react";
import { TrainCard } from "./TrainCard";
import type { TrainSearchResult } from "@/types/trains";
import { useI18n } from "@/lib/i18n/i18n";
import { getLowestFare } from "@/utils/format";

interface Props {
  trains: TrainSearchResult[];
  date: string;
  loading?: boolean;
  emptyMessage?: string;
}

function uid(t: TrainSearchResult) {
  return `${t.train_no}:${t.from_station}:${t.departure_time}`;
}

function annotateTrains(trains: TrainSearchResult[], tr: (key: string) => string) {
  if (trains.length === 0) return [];
  const cheapest = trains.reduce((a, b) =>
    (getLowestFare(a)?.price ?? Infinity) < (getLowestFare(b)?.price ?? Infinity) ? a : b,
  );
  const fastest = trains.reduce((a, b) =>
    a.duration_minutes < b.duration_minutes ? a : b,
  );
  const earliest = trains.reduce((a, b) =>
    a.departure_time < b.departure_time ? a : b,
  );
  const earliestId = uid(earliest);
  const fastestId = uid(fastest);
  const cheapestId = uid(cheapest);
  return trains.map((train) => {
    const id = uid(train);
    const tags: string[] = [];
    if (id === earliestId) tags.push(tr("tickets.tag.earliest"));
    if (id === fastestId && fastestId !== earliestId) tags.push(tr("tickets.tag.fastest"));
    if (id === cheapestId && cheapestId !== earliestId && cheapestId !== fastestId)
      tags.push(tr("tickets.tag.cheapest"));
    return { train, tags };
  });
}

function LoadingSkeleton({ locale }: { locale: string }) {
  return (
    <div className="space-y-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center py-10 gap-4"
      >
        <div className="relative">
          <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
            <Loader2 className="h-7 w-7 text-primary animate-spin" />
          </div>
          <motion.div
            className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          >
            <Search className="h-3 w-3 text-primary" />
          </motion.div>
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <TrainFront className="h-3.5 w-3.5" />
            {locale === "en" ? "Querying real-time trains..." : "正在查询实时车次..."}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Search className="h-3.5 w-3.5" />
            {locale === "en" ? "Fares may load progressively." : "票价会在结果返回后逐步补齐。"}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export function TrainCardList({ trains, date, loading, emptyMessage }: Props) {
  const { t, locale } = useI18n();

  if (loading) {
    return <LoadingSkeleton locale={locale} />;
  }

  if (trains.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center py-16 text-muted-foreground"
      >
        <TrainFront className="h-12 w-12 mb-3 opacity-30" />
        <p className="text-sm">{emptyMessage || t("tickets.empty")}</p>
      </motion.div>
    );
  }

  const annotated = annotateTrains(trains, t);

  return (
    <div className="space-y-3">
      {annotated.map(({ train, tags }, i) => (
        <TrainCard
          key={`${train.train_no}:${train.from_station}:${train.departure_time}:${i}`}
          train={train}
          date={date}
          index={i}
          tags={tags}
        />
      ))}
    </div>
  );
}
