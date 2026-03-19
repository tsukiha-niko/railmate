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
        <div className="rounded-2xl border border-border/70 bg-card/84 p-2.5 transition-all duration-200 hover:border-primary/30 hover:shadow-[0_14px_28px_-22px_rgba(15,23,42,0.6)] sm:p-4">
          <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
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

            <div className="ml-auto flex items-center gap-1.5">
              {lowestFare ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-2 py-1 text-xs">
                  <span className="text-muted-foreground">{t("tickets.fare.from")}</span>
                  <span className="font-semibold tabular-nums text-primary">{formatPrice(lowestFare.price)}</span>
                </span>
              ) : null}
              <span className={cn(
                "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
                train.remaining_tickets === 0 ? "bg-destructive/10 text-destructive" :
                train.remaining_tickets != null && train.remaining_tickets < 10 ? "bg-amber-500/10 text-warning" : "bg-emerald-500/10 text-success",
              )}>
                {formatRemaining(train.remaining_tickets, fmtLocale)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="flex-1">
              <p className="text-lg font-bold tabular-nums sm:text-2xl">{train.departure_time}</p>
              <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">{train.from_station}</p>
            </div>
            <div className="flex flex-col items-center gap-0.5 px-2">
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground sm:text-xs">
                <Clock className="h-3 w-3" />
                {formatDuration(train.duration_minutes, fmtLocale)}
              </div>
              <div className="flex items-center">
                <div className="h-px w-8 bg-gradient-to-r from-border to-primary/30 sm:w-14" />
                <ArrowRight className="h-3.5 w-3.5 text-primary/50" />
              </div>
            </div>
            <div className="flex-1 text-right">
              <p className="text-lg font-bold tabular-nums sm:text-2xl">{train.arrival_time}</p>
              <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">{train.to_station}</p>
            </div>
          </div>

          {additionalFares.length > 0 && (
            <div className="mt-2 hidden flex-wrap items-center gap-1.5 sm:flex">
              {additionalFares.map((fare) => (
                <span
                  key={fare.key}
                  className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-background/65 px-2 py-1 text-xs text-foreground/90"
                >
                  <span className="text-muted-foreground">{getFareLabel(fare.key, fmtLocale)}</span>
                  <span className="font-semibold tabular-nums">{formatPrice(fare.price)}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  );
}
