"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, ArrowRight, TrainFront, Zap, Ticket, ArrowRightLeft, ChevronDown } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/utils/cn";
import { formatDuration } from "@/utils/date";
import { formatPrice, formatRemaining, getLowestFare, getTrainTypeColor } from "@/utils/format";
import type { ChatCard, TrainCardData, TransferPlanData } from "@/utils/parseToolCards";
import { useI18n } from "@/lib/i18n/i18n";

function getDateLabel(trainDate: string | undefined, locale: string): string | null {
  if (!trainDate) return null;
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  if (trainDate === todayStr) return null;
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;
  if (trainDate === tomorrowStr) return locale === "en" ? "Tomorrow" : "明天";
  const m = trainDate.slice(5, 7).replace(/^0/, "");
  const d = trainDate.slice(8, 10).replace(/^0/, "");
  return `${m}/${d}`;
}

function MiniTrainCard({ train, index }: { train: TrainCardData; index: number }) {
  const { locale, t } = useI18n();
  const fmtLocale = locale === "en" ? "en" : "zh-CN";
  const href = `/trains/${train.train_no}?date=${train.date || ""}&from=${encodeURIComponent(train.from_station)}&to=${encodeURIComponent(train.to_station)}`;
  const dateLabel = getDateLabel(train.date, locale);
  const lowestFare = getLowestFare(train);

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, delay: index * 0.05 }}
    >
      <Link href={href} className="block group">
        <div className="rounded-lg border border-border/60 bg-card/60 backdrop-blur-sm p-2.5 hover:border-primary/30 hover:bg-card/80 transition-all duration-200">
          <div className="flex items-center justify-between gap-2">
            {/* Left: train badge + date label + times */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className={cn(
                "inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-bold text-white shrink-0",
                getTrainTypeColor(train.train_type),
              )}>
                {train.train_no}
              </span>
              {dateLabel && (
                <span className="inline-flex items-center rounded px-1 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 shrink-0">
                  {dateLabel}
                </span>
              )}
              <div className="flex items-center gap-1 text-sm tabular-nums font-semibold">
                <span>{train.departure_time}</span>
                <div className="flex items-center gap-0.5 text-muted-foreground">
                  <div className="w-4 h-px bg-border" />
                  <span className="text-[10px] font-normal">
                    {formatDuration(train.duration_minutes, fmtLocale)}
                  </span>
                  <div className="w-4 h-px bg-border" />
                  <ArrowRight className="h-2.5 w-2.5" />
                </div>
                <span>{train.arrival_time}</span>
              </div>
            </div>

            {/* Right: price + remaining */}
            <div className="flex items-center gap-2 shrink-0">
              {lowestFare != null && (
                <span className="text-xs font-semibold text-primary">{formatPrice(lowestFare.price)}</span>
              )}
              <span className={cn(
                "text-[10px] font-medium",
                train.remaining_tickets === 0 ? "text-destructive" :
                train.remaining_tickets != null && train.remaining_tickets < 10 ? "text-warning" : "text-emerald-600 dark:text-emerald-400",
              )}>
                {formatRemaining(train.remaining_tickets, fmtLocale)}
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

function TransferPlanCard({ plan, index }: { plan: TransferPlanData; index: number }) {
  const { locale } = useI18n();
  const fmtLocale = locale === "en" ? "en" : "zh-CN";
  const route = plan.legs.length > 0
    ? [plan.legs[0].from_station, ...plan.via, plan.legs[plan.legs.length - 1].to_station].join(" → ")
    : plan.via.join(" → ");

  const transfers = Math.max(0, plan.legs.length - 1);
  const maxWait = plan.waits?.length ? Math.max(...plan.waits.filter((x) => typeof x === "number")) : 0;
  const worstWait = maxWait || (plan.waits?.[0] ?? 0) || 0;

  function waitLevel(waitMin: number) {
    if (waitMin <= 0) return "none" as const;
    if (waitMin < 60) return "good" as const;
    if (waitMin < 180) return "warn" as const;
    return "bad" as const;
  }

  function waitBar(waitMin: number) {
    // Make long waits visually obvious (non-linear).
    // 0..240min -> ~10..100% width; >240 stays 100%
    const pct = Math.min(100, Math.max(10, Math.round((Math.pow(waitMin / 240, 0.65)) * 100)));
    const level = waitLevel(waitMin);
    const bar =
      level === "good" ? "bg-emerald-500/70" :
      level === "warn" ? "bg-amber-500/80" :
      level === "bad" ? "bg-rose-500/75" : "bg-border/50";
    const pill =
      level === "good" ? "bg-emerald-500/10 text-emerald-300 ring-emerald-500/25" :
      level === "warn" ? "bg-amber-500/10 text-amber-300 ring-amber-500/25" :
      level === "bad" ? "bg-rose-500/10 text-rose-300 ring-rose-500/25" : "bg-muted/30 text-muted-foreground ring-border/40";
    return { pct, bar, pill, level };
  }

  function formatWait(waitMin: number) {
    const w = Math.max(0, Math.round(waitMin));
    if (w >= 60) {
      const h = Math.floor(w / 60);
      const m = w % 60;
      if (locale === "en") return `${h}h${m ? ` ${m}m` : ""}`;
      return `${h}小时${m ? `${m}分` : ""}`;
    }
    return locale === "en" ? `${w}m` : `${w}分`;
  }

  function waitBlocks(waitMin: number) {
    // Discrete blocks (easier to read than a progress bar)
    // 0..240min => 1..8 blocks (cap)
    const blocks = Math.max(1, Math.min(8, Math.ceil(waitMin / 30)));
    const level = waitLevel(waitMin);
    const on =
      level === "good" ? "bg-emerald-500/70" :
      level === "warn" ? "bg-amber-500/80" :
      level === "bad" ? "bg-rose-500/75" : "bg-border/50";
    return { blocks, on, level };
  }

  const legRow = "grid grid-cols-[56px_1fr] md:grid-cols-[64px_1fr_150px] gap-x-3 items-center min-w-0";
  const timelineStations = plan.legs.length > 0
    ? [plan.legs[0].from_station, ...plan.via, plan.legs[plan.legs.length - 1].to_station]
    : [];

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, delay: index * 0.08 }}
      className="rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm p-4 md:p-4 space-y-2.5"
    >
      {/* Header: compressed, decision-first */}
      <div className="space-y-1">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-baseline gap-2 min-w-0">
            <span className="text-2xl md:text-3xl font-extrabold text-foreground tabular-nums leading-none">
              {formatDuration(plan.total_minutes, fmtLocale)}
            </span>
            {index === 0 && (
              <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold bg-primary/15 text-primary ring-1 ring-primary/25 shrink-0">
                {locale === "en" ? "Recommended" : "推荐"}
              </span>
            )}
          </div>
          <div className="text-right shrink-0">
            <div className="text-[10px] text-muted-foreground">{locale === "en" ? "Total" : "总价"}</div>
            <div className={cn(
              "text-2xl md:text-3xl font-extrabold tabular-nums leading-none",
              plan.total_price != null ? "text-primary" : "text-muted-foreground",
            )}>
              {plan.total_price != null ? formatPrice(plan.total_price) : "--"}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] md:text-xs text-muted-foreground">
          <span className="tabular-nums">{locale === "en" ? `${transfers} change` : `${transfers}次换乘`}</span>
          <span className="text-muted-foreground/40">·</span>
          <span className="tabular-nums">
            {locale === "en"
              ? `max wait ${worstWait}m`
              : `最长候车${worstWait}分`}
          </span>
          <span className={cn(
            "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 tabular-nums",
            waitBar(worstWait).pill,
          )}>
            {waitBar(worstWait).level === "good"
              ? (locale === "en" ? "Short" : "短")
              : waitBar(worstWait).level === "warn"
                ? (locale === "en" ? "Long" : "长")
                : (locale === "en" ? "Bad" : "超长")}
          </span>
        </div>

        {/* Mini timeline: stations only (avoid repeating in legs) */}
        {timelineStations.length >= 2 && (
          <div className="flex items-center gap-2 text-[11px] md:text-xs text-muted-foreground min-w-0">
            <span className="truncate">{timelineStations[0]}</span>
            <span className="text-muted-foreground/40">→</span>
            {timelineStations.length === 3 ? (
              <>
                <span className="truncate">{timelineStations[1]}</span>
                <span className="text-muted-foreground/40">→</span>
                <span className="truncate">{timelineStations[2]}</span>
              </>
            ) : (
              <span className="truncate">{timelineStations[timelineStations.length - 1]}</span>
            )}
          </div>
        )}
      </div>

      {/* Legs: compact, no repeated station names */}
      <div className="space-y-1.5 pt-0.5">
        {plan.legs.map((leg, i) => (
          <div key={i} className="space-y-1.5">
            <div className={cn(legRow, "py-1")}>
              <div className="w-[56px] md:w-[64px] flex justify-start">
                <span
                  className={cn(
                    "inline-flex w-[52px] md:w-[58px] justify-center items-center rounded-md px-1 py-0.5 text-[10px] font-bold text-white",
                    getTrainTypeColor(leg.train_no.charAt(0)),
                  )}
                >
                  {leg.train_no}
                </span>
              </div>

              <div className="min-w-0">
                <div className="flex items-baseline justify-between gap-2 min-w-0">
                  <div className="text-[12px] md:text-sm font-semibold text-foreground tabular-nums whitespace-nowrap">
                    {leg.departure_time}–{leg.arrival_time}
                  </div>
                  <div className="text-[11px] md:text-sm font-semibold text-foreground tabular-nums whitespace-nowrap">
                    {formatDuration(leg.duration_minutes, fmtLocale)}
                  </div>
                </div>
                <div className="mt-0.5 text-[10px] md:text-xs text-muted-foreground truncate">
                  {leg.from_station} → {leg.to_station}
                </div>
              </div>
            </div>

            {/* Wait bar between legs */}
            {i < plan.legs.length - 1 && plan.waits[i] != null && (
              <div className={cn(legRow, "py-1")}>
                <span className="block" />
                <div className="col-span-2">
                  {(() => {
                    const w = Number(plan.waits[i] ?? 0);
                    const { pill, level } = waitBar(w);
                    const { blocks, on } = waitBlocks(w);
                    const label =
                      level === "good" ? (locale === "en" ? "Short transfer" : "短暂停留") :
                      level === "warn" ? (locale === "en" ? "Long transfer" : "较长中转") :
                      level === "bad" ? (locale === "en" ? "Very long wait" : "超长等待") :
                      (locale === "en" ? "Wait" : "候车");

                    return (
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-1.5">
                          {Array.from({ length: 8 }).map((_, bi) => (
                            <span
                              // eslint-disable-next-line react/no-array-index-key
                              key={bi}
                              className={cn(
                                "h-2.5 w-2.5 rounded-[3px]",
                                bi < blocks ? on : "bg-muted/35",
                              )}
                            />
                          ))}
                        </div>
                        <span className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-1 text-[10px] md:text-xs font-semibold ring-1 tabular-nums whitespace-nowrap",
                          pill,
                        )}>
                          {label} · {formatWait(w)}
                        </span>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
}

interface TrainResultCardsProps {
  cards: ChatCard[];
  onQueryTransfer?: (from: string, to: string) => void;
}

export function TrainResultCards({ cards, onQueryTransfer }: TrainResultCardsProps) {
  const { t, locale } = useI18n();
  const [expandedCards, setExpandedCards] = useState<Record<number, boolean>>({});

  const toggleExpand = (idx: number) => {
    setExpandedCards((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  return (
    <div className="space-y-2.5 mt-2 w-full">
      {cards.map((card, ci) => {
        const isExpanded = expandedCards[ci] ?? false;
        const trainList = card.type !== "transfer" ? card.trains : [];
        const visibleTrains = isExpanded ? trainList : trainList.slice(0, 5);
        const hiddenCount = trainList.length - 5;

        return (
          <motion.div
            key={ci}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: ci * 0.08 }}
            className="rounded-xl border border-primary/15 bg-gradient-to-br from-primary/[0.03] to-accent/20 p-3"
          >
            {/* Header */}
            <div className="flex items-center gap-2 mb-2 px-0.5">
              {card.type === "fastest_train" ? (
                <Zap className="h-3.5 w-3.5 text-amber-500" />
              ) : card.type === "transfer" ? (
                <ArrowRightLeft className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <TrainFront className="h-3.5 w-3.5 text-primary" />
              )}
              <span className="text-xs font-medium text-foreground/80">
                {card.type === "train_list"
                  ? `${card.from} → ${card.to}  ·  ${card.trains.length}${locale === "en" ? " trains" : "趟"}`
                  : card.type === "transfer"
                  ? `${card.from} → ${card.to}  ·  ${card.plans.length}${locale === "en" ? " plans" : "个方案"}`
                  : card.hint || t("chat.quick.fast.label")}
              </span>
            </div>

            {/* Content */}
            <div className="space-y-1.5">
              {card.type === "transfer"
                ? [...card.plans]
                    .sort((a, b) => (
                      a.total_minutes - b.total_minutes
                      || (Math.max(0, ...(a.waits || [0])) - Math.max(0, ...(b.waits || [0])))
                      || (a.legs.length - b.legs.length)
                    ))
                    .map((plan, i) => (
                      <TransferPlanCard key={i} plan={plan} index={i} />
                    ))
                : visibleTrains.map((train, i) => (
                    <MiniTrainCard
                      key={`${train.train_no}:${train.from_station}:${i}`}
                      train={train}
                      index={i}
                    />
                  ))}
            </div>

            {/* Expand / collapse for train lists */}
            {card.type !== "transfer" && hiddenCount > 0 && (
              <button
                onClick={() => toggleExpand(ci)}
                className="flex items-center justify-center gap-1 w-full mt-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", isExpanded && "rotate-180")} />
                {isExpanded
                  ? (locale === "en" ? "Show less" : "收起")
                  : (locale === "en" ? `Show ${hiddenCount} more` : `展开剩余 ${hiddenCount} 趟`)}
              </button>
            )}

            {/* Query transfer button - inline at bottom */}
            {card.type === "train_list" && onQueryTransfer && (
              <button
                onClick={() => onQueryTransfer(card.from, card.to)}
                className="flex items-center justify-center gap-1.5 w-full mt-1.5 pt-1.5 border-t border-border/40 text-[11px] text-muted-foreground hover:text-primary transition-colors"
              >
                <ArrowRightLeft className="h-3 w-3" />
                {t("chat.card.queryTransfer")}
              </button>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
