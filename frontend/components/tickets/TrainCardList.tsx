"use client";

import { motion } from "framer-motion";
import { TrainFront } from "lucide-react";
import { TrainCard } from "./TrainCard";
import { Skeleton } from "@/components/ui/skeleton";
import type { TrainSearchResult } from "@/types/trains";
import { useI18n } from "@/lib/i18n/i18n";

interface Props { trains: TrainSearchResult[]; date: string; loading?: boolean; emptyMessage?: string; }

function annotateTrains(trains: TrainSearchResult[], tr: (key: string) => string) {
  if (trains.length === 0) return [];
  const cheapest = trains.reduce((a, b) => (a.price_second_seat ?? Infinity) < (b.price_second_seat ?? Infinity) ? a : b);
  const fastest = trains.reduce((a, b) => a.duration_minutes < b.duration_minutes ? a : b);
  const earliest = trains.reduce((a, b) => a.departure_time < b.departure_time ? a : b);
  return trains.map((train) => {
    const tags: string[] = [];
    if (train.train_no === earliest.train_no) tags.push(tr("tickets.tag.earliest"));
    if (train.train_no === fastest.train_no && fastest.train_no !== earliest.train_no) tags.push(tr("tickets.tag.fastest"));
    if (train.train_no === cheapest.train_no && cheapest.train_no !== earliest.train_no && cheapest.train_no !== fastest.train_no) tags.push(tr("tickets.tag.cheapest"));
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
  return (<div className="space-y-3">{annotated.map(({ train, tags }, i) => (<TrainCard key={train.train_no} train={train} date={date} index={i} tags={tags} />))}</div>);
}
