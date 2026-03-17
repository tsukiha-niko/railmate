"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Clock, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { TrainSearchResult } from "@/types/trains";
import { formatDuration } from "@/utils/date";
import { formatPrice, formatRemaining, getTrainTypeLabel, getTrainTypeColor } from "@/utils/format";
import { cn } from "@/utils/cn";
import { useI18n } from "@/lib/i18n/i18n";

interface Props { train: TrainSearchResult; date: string; index?: number; tags?: string[]; }

export function TrainCard({ train, date, index = 0, tags = [] }: Props) {
  const { locale, t } = useI18n();
  const fmtLocale = locale === "en" ? "en" : "zh-CN";
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: Math.min(index * 0.04, 0.4) }}>
      <Link href={`/trains/${train.train_no}?date=${date}&from=${train.from_station}&to=${train.to_station}`} className="block group">
        <div className="rounded-xl border border-border bg-card p-4 hover:border-primary/30 hover:shadow-md transition-all duration-200 group-hover:scale-[1.005]">
          <div className="flex items-center gap-2 mb-3">
            <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold text-white", getTrainTypeColor(train.train_type))}>{train.train_no}</span>
            <span className="text-xs text-muted-foreground">{getTrainTypeLabel(train.train_type, fmtLocale)}</span>
            {tags.map((tag) => (<Badge key={tag} variant="warning" className="text-xs">{tag}</Badge>))}
          </div>
          <div className="flex items-center gap-4">
            <div className="flex-1"><p className="text-2xl font-bold tabular-nums">{train.departure_time}</p><p className="text-sm text-muted-foreground mt-0.5">{train.from_station}</p></div>
            <div className="flex flex-col items-center gap-0.5 px-2">
              <div className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3 w-3" />{formatDuration(train.duration_minutes, fmtLocale)}</div>
              <div className="flex items-center"><div className="w-12 h-px bg-border" /><ArrowRight className="h-3.5 w-3.5 text-muted-foreground" /></div>
            </div>
            <div className="flex-1 text-right"><p className="text-2xl font-bold tabular-nums">{train.arrival_time}</p><p className="text-sm text-muted-foreground mt-0.5">{train.to_station}</p></div>
          </div>
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border">
            {train.price_second_seat != null && (<div className="flex items-center gap-1"><span className="text-xs text-muted-foreground">{t("tickets.seat.second")}</span><span className="text-sm font-semibold text-primary">{formatPrice(train.price_second_seat)}</span></div>)}
            {train.price_first_seat != null && (<div className="flex items-center gap-1"><span className="text-xs text-muted-foreground">{t("tickets.seat.first")}</span><span className="text-sm font-medium">{formatPrice(train.price_first_seat)}</span></div>)}
            {train.price_business_seat != null && (<div className="flex items-center gap-1"><span className="text-xs text-muted-foreground">{t("tickets.seat.business")}</span><span className="text-sm font-medium">{formatPrice(train.price_business_seat)}</span></div>)}
            <div className="ml-auto">
              <span className={cn("text-xs font-medium", train.remaining_tickets === 0 ? "text-destructive" : train.remaining_tickets != null && train.remaining_tickets < 10 ? "text-warning" : "text-success")}>{formatRemaining(train.remaining_tickets, fmtLocale)}</span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
