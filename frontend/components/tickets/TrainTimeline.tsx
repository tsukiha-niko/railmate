"use client";

import { useMemo, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { ChevronDown, ChevronUp, MapPin, MoreHorizontal, TrainFront } from "lucide-react";
import type { TrainScheduleStop } from "@/types/trains";
import { cn } from "@/utils/cn";
import { useI18n } from "@/lib/i18n/i18n";
import { segmentMinutesBetweenIndices } from "@/utils/trainCrossDay";

interface Props {
  stops: TrainScheduleStop[];
  highlightFrom?: string | null;
  highlightTo?: string | null;
}

function formatSegmentDuration(mins: number | null, locale: string): string {
  if (mins == null || mins <= 0) return "";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (locale === "en") {
    if (h <= 0) return `${m} min`;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  if (h <= 0) return `${m}分钟`;
  return m > 0 ? `${h}小时${m}分` : `${h}小时`;
}

function TimePill({ label, time, active }: { label: string; time: string; active: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-baseline gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] tabular-nums sm:px-2 sm:text-[11px]",
        active
          ? "bg-primary/12 text-foreground ring-1 ring-primary/20"
          : "bg-muted/40 text-muted-foreground ring-1 ring-border/40",
      )}
    >
      <span className="font-medium opacity-70">{label}</span>
      <span className="font-semibold tracking-tight">{time}</span>
    </span>
  );
}

export function TrainTimeline({ stops, highlightFrom, highlightTo }: Props) {
  const { t, locale } = useI18n();
  const [showAllStops, setShowAllStops] = useState(false);
  const dateLocale = locale === "en" ? "en" : "zh-CN";

  const { fromIdx, toIdx } = useMemo(() => {
    let fi = -1;
    let ti = -1;
    if (highlightFrom) fi = stops.findIndex((s) => s.station_name === highlightFrom);
    if (highlightTo) ti = stops.findIndex((s) => s.station_name === highlightTo);
    return { fromIdx: fi, toIdx: ti };
  }, [stops, highlightFrom, highlightTo]);

  const hasHighlight = fromIdx >= 0 && toIdx >= 0 && toIdx > fromIdx;
  const segmentLen = hasHighlight ? toIdx - fromIdx + 1 : stops.length;

  const visibleIndices = useMemo(() => {
    if (!hasHighlight || showAllStops) {
      return stops.map((_, i) => i);
    }
    return Array.from({ length: segmentLen }, (_, k) => fromIdx + k);
  }, [stops, hasHighlight, showAllStops, fromIdx, segmentLen]);

  const segmentDurMin = useMemo(() => {
    if (!hasHighlight) return null;
    return segmentMinutesBetweenIndices(stops, fromIdx, toIdx);
  }, [stops, hasHighlight, fromIdx, toIdx]);

  const beforeN = hasHighlight ? fromIdx : 0;
  const afterN = hasHighlight ? stops.length - 1 - toIdx : 0;
  const midN = hasHighlight ? toIdx - fromIdx - 1 : 0;
  const durLabel = formatSegmentDuration(segmentDurMin, dateLocale);

  const toolbar = hasHighlight && (
    <div className="mb-2 flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-2">
      <p className="m-0 text-[11px] leading-snug text-muted-foreground sm:text-xs">
        {showAllStops ? t("timeline.showingAllStops", { total: stops.length }) : t("timeline.segmentHint", { n: segmentLen })}
      </p>
      <button
        type="button"
        onClick={() => setShowAllStops((v) => !v)}
        className="inline-flex items-center gap-1 rounded-lg border border-border/70 bg-card/60 px-2.5 py-1 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/8 sm:text-xs"
      >
        {showAllStops ? (
          <>
            <ChevronUp className="h-3.5 w-3.5" strokeWidth={2.25} />
            {t("timeline.collapseSegment")}
          </>
        ) : (
          <>
            <ChevronDown className="h-3.5 w-3.5" strokeWidth={2.25} />
            {t("timeline.expandAll", { total: stops.length })}
          </>
        )}
      </button>
    </div>
  );

  /** 折叠：前段摘要 + 上车站 + 途中摘要 + 下车站 + 后段摘要 */
  if (hasHighlight && !showAllStops) {
    const firstBefore = beforeN > 0 ? stops[0].station_name : "";
    const lastBefore = beforeN > 0 ? stops[fromIdx - 1].station_name : "";
    const firstAfter = afterN > 0 ? stops[toIdx + 1].station_name : "";
    const lastAfter = afterN > 0 ? stops[stops.length - 1].station_name : "";

    const renderFoldCard = (body: string, key: string, listPos: number, hideTopRail: boolean) => (
      <motion.li
        key={key}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, delay: Math.min(listPos * 0.04, 0.3), ease: [0.22, 1, 0.36, 1] }}
        className="grid grid-cols-[32px_1fr] gap-x-1.5 sm:grid-cols-[36px_1fr] sm:gap-x-2"
      >
        <div className="flex flex-col items-center">
          {!hideTopRail && <div className="w-px flex-1 min-h-[6px] bg-border/60" aria-hidden />}
          <div className="relative z-[1] flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/35 bg-muted/30 text-muted-foreground">
            <MoreHorizontal className="h-3.5 w-3.5" strokeWidth={2.25} />
          </div>
          <div className="w-px flex-1 min-h-[6px] bg-border/60" aria-hidden />
        </div>
        <div className="mb-1.5 rounded-lg border border-dashed border-border/70 bg-muted/20 px-2 py-1.5 sm:mb-2 sm:rounded-xl sm:px-2.5 sm:py-2 last:mb-0">
          <p className="m-0 text-[11px] leading-snug text-muted-foreground sm:text-xs">{body}</p>
        </div>
      </motion.li>
    );

    const renderStopRow = (stop: TrainScheduleStop, i: number, listPos: number, opts: { board?: boolean; alight?: boolean }) => {
      const isFirst = i === 0;
      const isLast = i === stops.length - 1;
      const isTerminal = isFirst || isLast;
      const isUserFrom = opts.board === true;
      const isUserTo = opts.alight === true;
      const isInSegment = hasHighlight && i >= fromIdx && i <= toIdx;
      const isUserEndpoint = isUserFrom || isUserTo;
      const lineAboveActive = hasHighlight && i > fromIdx && i <= toIdx;
      const lineBelowActive = hasHighlight && i >= fromIdx && i < toIdx;

      return (
        <motion.li
          key={`${stop.station_name}-${i}`}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, delay: Math.min(listPos * 0.04, 0.3), ease: [0.22, 1, 0.36, 1] }}
          className="grid grid-cols-[32px_1fr] gap-x-1.5 sm:grid-cols-[36px_1fr] sm:gap-x-2"
        >
          <div className="flex flex-col items-center">
            {i > 0 && (
              <div
                className={cn(
                  "w-px flex-1 min-h-[6px] sm:min-h-[8px]",
                  lineAboveActive ? "bg-gradient-to-b from-primary/60 to-primary" : "bg-border/70",
                )}
                aria-hidden
              />
            )}
            <div
              className={cn(
                "relative z-[1] flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 bg-background shadow-sm sm:h-7 sm:w-7",
                isUserEndpoint
                  ? "border-primary bg-primary/10 text-primary"
                  : isInSegment
                    ? "border-primary/35 bg-primary/[0.07] text-primary/90"
                    : isTerminal
                      ? "border-primary/25 text-primary"
                      : "border-border/80 text-muted-foreground",
              )}
            >
              {isUserEndpoint ? (
                <MapPin className="h-3.5 w-3.5" strokeWidth={2.25} />
              ) : isTerminal ? (
                <TrainFront className="h-3 w-3" strokeWidth={2.25} />
              ) : (
                <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
              )}
            </div>
            {i < stops.length - 1 && (
              <div
                className={cn(
                  "w-px flex-1 min-h-[6px] sm:min-h-[10px]",
                  lineBelowActive ? "bg-gradient-to-b from-primary to-primary/50" : "bg-border/70",
                )}
                aria-hidden
              />
            )}
          </div>

          <div
            className={cn(
              "mb-1.5 rounded-lg border px-2 py-1.5 sm:mb-2 sm:rounded-xl sm:px-2.5 sm:py-2 last:mb-0",
              "shadow-[0_1px_0_rgba(0,0,0,0.03)] dark:shadow-[0_1px_0_rgba(255,255,255,0.03)]",
              isInSegment
                ? "border-primary/22 bg-gradient-to-br from-primary/[0.06] to-transparent"
                : "border-border/55 bg-card/35",
            )}
          >
            <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                  <span
                    className={cn(
                      "truncate text-sm font-semibold tracking-tight sm:text-[15px]",
                      isUserEndpoint ? "text-primary" : "text-foreground",
                    )}
                  >
                    {stop.station_name}
                  </span>
                  {isUserFrom && (
                    <span className="rounded bg-primary/15 px-1 py-0.5 text-[9px] font-semibold text-primary sm:text-[10px]">{t("timeline.board")}</span>
                  )}
                  {isUserTo && (
                    <span className="rounded bg-primary/15 px-1 py-0.5 text-[9px] font-semibold text-primary sm:text-[10px]">{t("timeline.alight")}</span>
                  )}
                  {!isUserFrom && isFirst && (
                    <span className="rounded bg-muted px-1 py-0.5 text-[9px] font-medium text-muted-foreground sm:text-[10px]">{t("timeline.origin")}</span>
                  )}
                  {!isUserTo && isLast && (
                    <span className="rounded bg-muted px-1 py-0.5 text-[9px] font-medium text-muted-foreground sm:text-[10px]">{t("timeline.terminal")}</span>
                  )}
                </div>
                {!isFirst && !isLast && stop.stop_duration != null && stop.stop_duration > 0 && (
                  <p className="mt-0.5 text-[10px] text-muted-foreground sm:text-[11px]">{t("timeline.stopFor", { min: stop.stop_duration })}</p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
                {stop.arrival_time && stop.arrival_time !== "--" && (
                  <TimePill label={t("timeline.arrive")} time={stop.arrival_time} active={isInSegment} />
                )}
                {stop.departure_time && stop.departure_time !== "--" && (
                  <TimePill label={t("timeline.depart")} time={stop.departure_time} active={isInSegment} />
                )}
                <span className="ml-auto inline-flex h-[22px] min-w-[1.25rem] items-center justify-center rounded bg-muted/50 px-1 text-[9px] font-semibold tabular-nums text-muted-foreground sm:ml-0 sm:text-[10px]">
                  {stop.stop_index}
                </span>
              </div>
            </div>
          </div>
        </motion.li>
      );
    };

    let pos = 0;
    const rows: ReactNode[] = [];
    if (beforeN > 0) {
      rows.push(
        renderFoldCard(t("timeline.foldBefore", { n: beforeN, first: firstBefore, last: lastBefore }), "fold-before", pos, true),
      );
      pos += 1;
    }
    rows.push(renderStopRow(stops[fromIdx], fromIdx, pos, { board: true }));
    pos += 1;
    if (midN > 0) {
      const midBody = durLabel
        ? t("timeline.foldMiddle", { n: midN, dur: durLabel })
        : t("timeline.foldMiddleNoDur", { n: midN });
      rows.push(renderFoldCard(midBody, "fold-middle", pos, false));
      pos += 1;
    }
    if (toIdx > fromIdx) {
      rows.push(renderStopRow(stops[toIdx], toIdx, pos, { alight: true }));
      pos += 1;
    }
    if (afterN > 0) {
      rows.push(renderFoldCard(t("timeline.foldAfter", { n: afterN, first: firstAfter, last: lastAfter }), "fold-after", pos, false));
    }

    return (
      <div className="w-full min-w-0">
        {toolbar}
        <ul className="m-0 list-none p-0">{rows}</ul>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0">
      {toolbar}
      <ul className="m-0 list-none p-0">
        {visibleIndices.map((i, listPos) => {
          const stop = stops[i];
          const isFirst = i === 0;
          const isLast = i === stops.length - 1;
          const isTerminal = isFirst || isLast;
          const isUserFrom = hasHighlight && i === fromIdx;
          const isUserTo = hasHighlight && i === toIdx;
          const isInSegment = hasHighlight && i >= fromIdx && i <= toIdx;
          const isUserEndpoint = isUserFrom || isUserTo;

          const lineAboveActive = hasHighlight && i > fromIdx && i <= toIdx;
          const lineBelowActive = hasHighlight && i >= fromIdx && i < toIdx;

          return (
            <motion.li
              key={`${stop.station_name}-${i}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, delay: Math.min(listPos * 0.02, 0.35), ease: [0.22, 1, 0.36, 1] }}
              className="grid grid-cols-[32px_1fr] gap-x-1.5 sm:grid-cols-[36px_1fr] sm:gap-x-2"
            >
              <div className="flex flex-col items-center">
                {i > 0 && (
                  <div
                    className={cn(
                      "w-px flex-1 min-h-[6px] sm:min-h-[8px]",
                      lineAboveActive ? "bg-gradient-to-b from-primary/60 to-primary" : "bg-border/70",
                    )}
                    aria-hidden
                  />
                )}
                <div
                  className={cn(
                    "relative z-[1] flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 bg-background shadow-sm sm:h-7 sm:w-7",
                    isUserEndpoint
                      ? "border-primary bg-primary/10 text-primary"
                      : isInSegment
                        ? "border-primary/35 bg-primary/[0.07] text-primary/90"
                        : isTerminal
                          ? "border-primary/25 text-primary"
                          : "border-border/80 text-muted-foreground",
                  )}
                >
                  {isUserEndpoint ? (
                    <MapPin className="h-3.5 w-3.5" strokeWidth={2.25} />
                  ) : isTerminal ? (
                    <TrainFront className="h-3 w-3" strokeWidth={2.25} />
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
                  )}
                </div>
                {i < stops.length - 1 && (
                  <div
                    className={cn(
                      "w-px flex-1 min-h-[6px] sm:min-h-[10px]",
                      lineBelowActive ? "bg-gradient-to-b from-primary to-primary/50" : "bg-border/70",
                    )}
                    aria-hidden
                  />
                )}
              </div>

              <div
                className={cn(
                  "mb-1.5 rounded-lg border px-2 py-1.5 sm:mb-2 sm:rounded-xl sm:px-2.5 sm:py-2 last:mb-0",
                  "shadow-[0_1px_0_rgba(0,0,0,0.03)] dark:shadow-[0_1px_0_rgba(255,255,255,0.03)]",
                  isInSegment
                    ? "border-primary/22 bg-gradient-to-br from-primary/[0.06] to-transparent"
                    : "border-border/55 bg-card/35",
                  hasHighlight && !isInSegment && "opacity-[0.42] saturate-[0.85]",
                )}
              >
                <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                      <span
                        className={cn(
                          "truncate text-sm font-semibold tracking-tight sm:text-[15px]",
                          isUserEndpoint ? "text-primary" : isInSegment ? "text-foreground" : "text-foreground/90",
                        )}
                      >
                        {stop.station_name}
                      </span>
                      {isUserFrom && (
                        <span className="rounded bg-primary/15 px-1 py-0.5 text-[9px] font-semibold tracking-wide text-primary sm:text-[10px]">
                          {t("timeline.board")}
                        </span>
                      )}
                      {isUserTo && (
                        <span className="rounded bg-primary/15 px-1 py-0.5 text-[9px] font-semibold tracking-wide text-primary sm:text-[10px]">
                          {t("timeline.alight")}
                        </span>
                      )}
                      {!isUserFrom && isFirst && (
                        <span className="rounded bg-muted px-1 py-0.5 text-[9px] font-medium text-muted-foreground sm:text-[10px]">{t("timeline.origin")}</span>
                      )}
                      {!isUserTo && isLast && (
                        <span className="rounded bg-muted px-1 py-0.5 text-[9px] font-medium text-muted-foreground sm:text-[10px]">{t("timeline.terminal")}</span>
                      )}
                    </div>
                    {!isFirst && !isLast && stop.stop_duration != null && stop.stop_duration > 0 && (
                      <p className="mt-0.5 text-[10px] text-muted-foreground sm:text-[11px]">{t("timeline.stopFor", { min: stop.stop_duration })}</p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
                    {stop.arrival_time && stop.arrival_time !== "--" && (
                      <TimePill label={t("timeline.arrive")} time={stop.arrival_time} active={isInSegment} />
                    )}
                    {stop.departure_time && stop.departure_time !== "--" && (
                      <TimePill label={t("timeline.depart")} time={stop.departure_time} active={isInSegment} />
                    )}
                    <span className="ml-auto inline-flex h-[22px] min-w-[1.25rem] items-center justify-center rounded bg-muted/50 px-1 text-[9px] font-semibold tabular-nums text-muted-foreground sm:ml-0 sm:text-[10px]">
                      {stop.stop_index}
                    </span>
                  </div>
                </div>
              </div>
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}
