"use client";

import { motion } from "framer-motion";
import { Circle } from "lucide-react";
import type { TrainScheduleStop } from "@/types/trains";
import { cn } from "@/utils/cn";
import { useI18n } from "@/lib/i18n/i18n";

interface Props { stops: TrainScheduleStop[]; }

export function TrainTimeline({ stops }: Props) {
  const { t } = useI18n();
  return (
    <div className="relative pl-8">
      <div className="absolute left-3.5 top-2 bottom-2 w-px bg-border" />
      {stops.map((stop, i) => {
        const isFirst = i === 0; const isLast = i === stops.length - 1; const isTerminal = isFirst || isLast;
        return (
          <motion.div key={i} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2, delay: i * 0.04 }} className="relative pb-5 last:pb-0">
            <div className={cn("absolute left-[-20px] top-1 flex h-7 w-7 items-center justify-center")}>
              <Circle className={cn("h-3 w-3", isTerminal ? "fill-primary text-primary" : "fill-card text-border")} strokeWidth={2.5} />
            </div>
            <div className={cn("flex items-baseline gap-4", isTerminal ? "font-semibold" : "text-sm")}>
              <span className="min-w-[80px] text-foreground">{stop.station_name}</span>
              <div className="flex items-center gap-2 text-xs text-muted-foreground tabular-nums">
                {stop.arrival_time && (<span>{t("timeline.arrive")} <span className="text-foreground font-medium">{stop.arrival_time}</span></span>)}
                {stop.departure_time && (<span>{t("timeline.depart")} <span className="text-foreground font-medium">{stop.departure_time}</span></span>)}
                {!isFirst && !isLast && stop.stop_duration != null && (<span className="text-muted-foreground/60">{t("timeline.stopFor", { min: stop.stop_duration })}</span>)}
              </div>
              {isFirst && <span className="text-xs text-primary">{t("timeline.origin")}</span>}
              {isLast && <span className="text-xs text-primary">{t("timeline.terminal")}</span>}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
