"use client";

import { motion } from "framer-motion";
import { TrainFront } from "lucide-react";
import { TrainCard } from "./TrainCard";
import { Skeleton } from "@/components/ui/skeleton";
import type { TrainSearchResult } from "@/types/trains";
import { useI18n } from "@/lib/i18n/i18n";

interface Props { trains: TrainSearchResult[]; date: string; loading?: boolean; emptyMessage?: string; }

function uid(t: TrainSearchResult) {
  return `${t.train_no}:${t.from_station}`;
}

function annotateTrains(trains: TrainSearchResult[], tr: (key: string) => string) {
  if (trains.length === 0) return [];
  const cheapest = trains.reduce((a, b) => (a.price_second_seat ?? Infinity) < (b.price_second_seat ?? Infinity) ? a : b);
  const fastest = trains.reduce((a, b) => a.duration_minutes < b.duration_minutes ? a : b);
  const earliest = trains.reduce((a, b) => a.departure_time < b.departure_time ? a : b);
  const earliestId = uid(earliest), fastestId = uid(fastest), cheapestId = uid(cheapest);
  return trains.map((train) => {
    const id = uid(train);
    const tags: string[] = [];
    if (id === earliestId) tags.push(tr("tickets.tag.earliest"));
    if (id === fastestId && fastestId !== earliestId) tags.push(tr("tickets.tag.fastest"));
    if (id === cheapestId && cheapestId !== earliestId && cheapestId !== fastestId) tags.push(tr("tickets.tag.cheapest"));
    return { train, tags };
  });
}

export function TrainCardList({ trains, date, loading, emptyMessage }: Props) {
  const { t } = useI18n();
  if (loading) return (<div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => (<Skeleton key={i} className="h-36 rounded-xl" />))}</div>);
  if (trains.length === 0) return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-16 text-muted-foreground">
      <TrainFront className="h-12 w-12 mb-3 opacity-30" /><p className="text-sm">{emptyMessage || t("tickets.empty")}</p>
    </motion.div>
  );
  const annotated = annotateTrains(trains, t);
  return (<div className="space-y-3">{annotated.map(({ train, tags }, i) => (<TrainCard key={`${train.train_no}:${train.from_station}`} train={train} date={date} index={i} tags={tags} />))}</div>);
}
