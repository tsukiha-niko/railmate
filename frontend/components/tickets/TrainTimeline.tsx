"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Circle, MapPin } from "lucide-react";
import type { TrainScheduleStop } from "@/types/trains";
import { cn } from "@/utils/cn";
import { useI18n } from "@/lib/i18n/i18n";

interface Props {
  stops: TrainScheduleStop[];
  highlightFrom?: string | null;
  highlightTo?: string | null;
}

export function TrainTimeline({ stops, highlightFrom, highlightTo }: Props) {
  const { t } = useI18n();

  const { fromIdx, toIdx } = useMemo(() => {
    let fi = -1, ti = -1;
    if (highlightFrom) fi = stops.findIndex((s) => s.station_name === highlightFrom);
    if (highlightTo) ti = stops.findIndex((s) => s.station_name === highlightTo);
    return { fromIdx: fi, toIdx: ti };
  }, [stops, highlightFrom, highlightTo]);

  const hasHighlight = fromIdx >= 0 && toIdx >= 0 && toIdx > fromIdx;

  return (
    <div className="relative pl-10">
      {/* Track line */}
      <div className="absolute left-[18px] top-2 bottom-2 w-0.5 bg-border" />
      {/* Highlighted segment overlay */}
      {hasHighlight && stops.length > 1 && (
        <div
          className="absolute left-[18px] w-0.5 bg-primary"
          style={{
            top: `calc(${(fromIdx / (stops.length - 1)) * 100}% + 8px)`,
            height: `calc(${((toIdx - fromIdx) / (stops.length - 1)) * 100}%)`,
          }}
        />
      )}

      {stops.map((stop, i) => {
        const isFirst = i === 0;
        const isLast = i === stops.length - 1;
        const isTerminal = isFirst || isLast;
        const isUserFrom = hasHighlight && i === fromIdx;
        const isUserTo = hasHighlight && i === toIdx;
        const isInSegment = hasHighlight && i >= fromIdx && i <= toIdx;
        const isUserEndpoint = isUserFrom || isUserTo;

        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2, delay: Math.min(i * 0.03, 0.6) }}
            className={cn("relative pb-5 last:pb-0")}
          >
            {/* Dot */}
            <div className="absolute left-[-22px] top-0.5 flex h-7 w-7 items-center justify-center">
              {isUserEndpoint ? (
                <MapPin className="h-4 w-4 text-primary fill-primary" />
              ) : (
                <Circle
                  className={cn(
                    "h-2.5 w-2.5",
                    isTerminal
                      ? "fill-primary text-primary"
                      : isInSegment
                        ? "fill-primary/50 text-primary/50"
                        : "fill-muted-foreground/20 text-muted-foreground/30",
                  )}
                  strokeWidth={2.5}
                />
              )}
            </div>

            {/* Content */}
            <div className={cn(
              "flex items-baseline gap-4",
              isUserEndpoint ? "font-semibold" : isTerminal ? "font-medium" : "text-sm",
              !isInSegment && hasHighlight && "opacity-50",
            )}>
              <div className="flex items-center gap-1.5 min-w-[90px]">
                <span className={cn(
                  "text-foreground",
                  isUserEndpoint && "text-primary",
                )}>
                  {stop.station_name}
                </span>
                {isUserFrom && <span className="text-[10px] text-primary font-normal">{t("timeline.board")}</span>}
                {isUserTo && <span className="text-[10px] text-primary font-normal">{t("timeline.alight")}</span>}
                {!isUserEndpoint && isFirst && <span className="text-[10px] text-muted-foreground font-normal">{t("timeline.origin")}</span>}
                {!isUserEndpoint && isLast && <span className="text-[10px] text-muted-foreground font-normal">{t("timeline.terminal")}</span>}
              </div>

              <div className="flex items-center gap-3 text-xs tabular-nums">
                {stop.arrival_time && stop.arrival_time !== "--" && (
                  <span className="text-muted-foreground">
                    {t("timeline.arrive")}{" "}
                    <span className={cn("font-medium", isInSegment ? "text-foreground" : "text-muted-foreground")}>{stop.arrival_time}</span>
                  </span>
                )}
                {stop.departure_time && stop.departure_time !== "--" && (
                  <span className="text-muted-foreground">
                    {t("timeline.depart")}{" "}
                    <span className={cn("font-medium", isInSegment ? "text-foreground" : "text-muted-foreground")}>{stop.departure_time}</span>
                  </span>
                )}
                {!isFirst && !isLast && stop.stop_duration != null && stop.stop_duration > 0 && (
                  <span className="text-muted-foreground/60">{t("timeline.stopFor", { min: stop.stop_duration })}</span>
                )}
              </div>

              {/* Station index */}
              <span className="ml-auto text-[10px] text-muted-foreground/40 tabular-nums shrink-0">
                {stop.stop_index}
              </span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
