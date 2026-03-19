"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Clock, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { TrainSearchResult } from "@/types/trains";
import { formatDuration } from "@/utils/date";
import { formatPrice, formatRemaining, getAvailableFares, getFareLabel, getLowestFare, getTrainTypeLabel, getTrainTypeColor } from "@/utils/format";
import { cn } from "@/utils/cn";
import { useI18n } from "@/lib/i18n/i18n";

interface Props { train: TrainSearchResult; date: string; index?: number; tags?: string[]; }

export function TrainCard({ train, date, index = 0, tags = [] }: Props) {
  const { locale, t } = useI18n();
  const fmtLocale = locale === "en" ? "en" : "zh-CN";
  const lowestFare = getLowestFare(train);
  const additionalFares = getAvailableFares(train).filter((fare) => fare.key !== lowestFare?.key).slice(0, 2);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.04, 0.4) }}
    >
      <Link
        href={`/trains/${train.train_no}?date=${date}&from=${encodeURIComponent(train.from_station)}&to=${encodeURIComponent(train.to_station)}`}
        className="block group"
      >
        <div className="rounded-xl border border-border bg-card p-4 hover:border-primary/30 hover:shadow-md transition-all duration-200 group-hover:scale-[1.003]">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className={cn(
                "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold text-white",
                getTrainTypeColor(train.train_type),
              )}>
                {train.train_no}
              </span>
              <span className="text-xs text-muted-foreground">
                {getTrainTypeLabel(train.train_type, fmtLocale)}
              </span>
              {tags.map((tag) => (
                <Badge key={tag} variant="warning" className="text-[10px]">{tag}</Badge>
              ))}
            </div>

            <div className="ml-auto flex max-w-full flex-wrap items-center justify-end gap-2">
              {lowestFare && (
                <div className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/8 px-2.5 py-1">
                  <span className="text-[11px] text-muted-foreground">{t("tickets.fare.from")}</span>
                  <span className="text-sm font-semibold text-primary">{formatPrice(lowestFare.price)}</span>
                </div>
              )}
              {additionalFares.map((fare) => (
                <div key={fare.key} className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1">
                  <span className="text-[11px] text-muted-foreground">{getFareLabel(fare.key, fmtLocale)}</span>
                  <span className="text-sm font-medium text-foreground/80">{formatPrice(fare.price)}</span>
                </div>
              ))}
              <span className={cn(
                "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
                train.remaining_tickets === 0 ? "bg-destructive/10 text-destructive" :
                train.remaining_tickets != null && train.remaining_tickets < 10 ? "bg-amber-500/10 text-warning" : "bg-emerald-500/10 text-success",
              )}>
                {formatRemaining(train.remaining_tickets, fmtLocale)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1">
              <p className="text-2xl font-bold tabular-nums">{train.departure_time}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{train.from_station}</p>
            </div>
            <div className="flex flex-col items-center gap-0.5 px-2">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {formatDuration(train.duration_minutes, fmtLocale)}
              </div>
              <div className="flex items-center">
                <div className="w-14 h-px bg-gradient-to-r from-border to-primary/30" />
                <ArrowRight className="h-3.5 w-3.5 text-primary/50" />
              </div>
            </div>
            <div className="flex-1 text-right">
              <p className="text-2xl font-bold tabular-nums">{train.arrival_time}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{train.to_station}</p>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
