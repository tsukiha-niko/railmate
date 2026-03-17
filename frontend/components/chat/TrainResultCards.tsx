"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, ArrowRight, TrainFront, Zap, Ticket, ArrowRightLeft, ChevronDown } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/utils/cn";
import { formatDuration } from "@/utils/date";
import { formatPrice, formatRemaining, getTrainTypeColor } from "@/utils/format";
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
              {train.price_second_seat != null && (
                <span className="text-xs font-semibold text-primary">{formatPrice(train.price_second_seat)}</span>
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

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, delay: index * 0.08 }}
      className="rounded-lg border border-border/60 bg-card/60 backdrop-blur-sm p-2.5 space-y-1.5"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-foreground truncate">{route}</span>
        <div className="flex items-center gap-2 shrink-0">
          {plan.total_price != null && (
            <span className="text-xs font-semibold text-primary">{formatPrice(plan.total_price)}</span>
          )}
          <Badge variant="secondary" className="text-[10px] shrink-0">
            {formatDuration(plan.total_minutes, fmtLocale)}
          </Badge>
        </div>
      </div>
      <div className="flex items-center gap-1 flex-wrap">
        {plan.legs.map((leg, i) => (
          <div key={i} className="flex items-center gap-1">
            <span className={cn(
              "inline-flex items-center rounded px-1 py-0.5 text-[10px] font-bold text-white",
              getTrainTypeColor(leg.train_no.charAt(0)),
            )}>
              {leg.train_no}
            </span>
            <span className="text-[10px] text-muted-foreground tabular-nums">
              {leg.departure_time}→{leg.arrival_time}
            </span>
            {i < plan.legs.length - 1 && plan.waits[i] != null && (
              <span className="text-[10px] text-amber-500 dark:text-amber-400 mx-0.5">
                {locale === "en" ? `wait ${plan.waits[i]}min` : `候${plan.waits[i]}分`}
              </span>
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
                ? card.plans.map((plan, i) => (
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
