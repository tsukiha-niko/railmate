"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Clock, ArrowRight, TrainFront, Zap, ArrowRightLeft, ChevronDown } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/utils/cn";
import { formatDuration } from "@/utils/date";
import { formatPrice, formatRemaining, getLowestFare, getTrainTypeColor } from "@/utils/format";
import type { ChatCard, TrainCardData, TransferLegData, TransferPlanData } from "@/utils/parseToolCards";
import { useI18n } from "@/lib/i18n/i18n";
import { useChatViewStore } from "@/store/chatViewStore";

const EMPTY_EXPANDED_CARDS: Record<number, boolean> = {};

function getDateInShanghai(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value || "1970";
  const month = parts.find((part) => part.type === "month")?.value || "01";
  const day = parts.find((part) => part.type === "day")?.value || "01";
  return `${year}-${month}-${day}`;
}

function addDays(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(year, month - 1, day + days));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

function getLowestLegFare(leg: TransferLegData): number | null {
  const fares = [
    leg.price_no_seat,
    leg.price_hard_seat,
    leg.price_hard_sleeper,
    leg.price_soft_sleeper,
    leg.price_second_seat,
    leg.price_first_seat,
    leg.price_business_seat,
  ].filter((price): price is number => typeof price === "number" && Number.isFinite(price) && price > 0);

  if (!fares.length) return null;
  return Math.min(...fares);
}

function getLowestTotalFare(legs: TransferLegData[]): number | null {
  if (!legs.length) return null;
  let sum = 0;
  for (const leg of legs) {
    const fare = getLowestLegFare(leg);
    if (fare == null) return null;
    sum += fare;
  }
  return Math.round(sum * 10) / 10;
}

function getDateLabel(trainDate: string | undefined, locale: string, showToday = false): string | null {
  if (!trainDate) return null;
  const todayStr = getDateInShanghai();
  const month = trainDate.slice(5, 7);
  const day = trainDate.slice(8, 10);
  const normalized = locale === "en" ? `${month}/${day}` : `${month}-${day}`;
  if (trainDate === todayStr) return showToday ? normalized : null;
  const tomorrowStr = addDays(todayStr, 1);
  if (trainDate === tomorrowStr) return locale === "en" ? `Tomorrow ${normalized}` : `明天 ${normalized}`;
  return normalized;
}

function MiniTrainCard({ train, index, returnTo }: { train: TrainCardData; index: number; returnTo: string }) {
  const { locale, t } = useI18n();
  const fmtLocale = locale === "en" ? "en" : "zh-CN";
  const detailParams = new URLSearchParams({
    date: train.date || "",
    from: train.from_station,
    to: train.to_station,
  });
  detailParams.set("returnTo", returnTo);
  const href = `/trains/${encodeURIComponent(train.train_no)}?${detailParams.toString()}`;
  const dateLabel = getDateLabel(train.date, locale);
  const lowestFare = getLowestFare(train);
  const startStation = train.start_station || train.from_station;
  const endStation = train.end_station || train.to_station;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, delay: index * 0.05 }}
    >
      <Link href={href} className="block group">
        <div className="rounded-xl border border-border/65 bg-background/45 px-3.5 py-3 transition-all duration-200 hover:border-primary/30 hover:bg-background/65">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <span
                className={cn(
                  "inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-[11px] font-bold text-white",
                  getTrainTypeColor(train.train_type),
                )}
              >
                {train.train_no}
              </span>
              {dateLabel && (
                <span className="inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                  {dateLabel}
                </span>
              )}
            </div>
            <div className="ml-auto flex max-w-full flex-wrap items-center justify-end gap-1.5">
              <span className="inline-flex items-center whitespace-nowrap rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                {t("tickets.fare.from")} {lowestFare != null ? formatPrice(lowestFare.price) : "--"}
              </span>
              <span
                className={cn(
                  "inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                  train.remaining_tickets === 0
                    ? "border-destructive/35 bg-destructive/10 text-destructive"
                    : train.remaining_tickets != null && train.remaining_tickets < 10
                      ? "border-amber-400/30 bg-amber-500/10 text-warning"
                      : "border-emerald-400/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                )}
              >
                {formatRemaining(train.remaining_tickets, fmtLocale)}
              </span>
            </div>
          </div>

          <div className="mt-2.5 grid min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2.5">
            <div className="min-w-0">
              <div className="text-base font-bold tabular-nums">{train.departure_time}</div>
              <div className="truncate text-xs text-muted-foreground">{train.from_station}</div>
            </div>

            <div className="flex flex-col items-center gap-1 px-1 text-muted-foreground">
              <div className="flex items-center gap-1 whitespace-nowrap text-[11px] font-medium">
                <Clock className="h-3 w-3" />
                <span>{formatDuration(train.duration_minutes, fmtLocale)}</span>
              </div>
              <div className="flex items-center">
                <div className="h-px w-6 bg-border sm:w-8" />
                <ArrowRight className="h-3 w-3 text-primary/55" />
                <div className="h-px w-6 bg-border sm:w-8" />
              </div>
            </div>

            <div className="min-w-0 text-right">
              <div className="text-base font-bold tabular-nums">{train.arrival_time}</div>
              <div className="truncate text-xs text-muted-foreground">{train.to_station}</div>
            </div>
          </div>

          <div className="mt-2 hidden items-center gap-2 text-[11px] text-muted-foreground sm:flex">
            <span className="font-medium">{t("chat.card.origin")}:</span>
            <span className="truncate">{startStation}</span>
            <span className="text-muted-foreground/50">→</span>
            <span className="font-medium">{t("chat.card.terminal")}:</span>
            <span className="truncate">{endStation}</span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

function TransferPlanCard({
  plan,
  index,
  fallbackDate,
  returnTo,
}: {
  plan: TransferPlanData;
  index: number;
  fallbackDate?: string;
  returnTo: string;
}) {
  const { locale } = useI18n();
  const fmtLocale = locale === "en" ? "en" : "zh-CN";

  const transfers = Math.max(0, plan.legs.length - 1);
  const maxWait = plan.waits?.length ? Math.max(...plan.waits.filter((x) => typeof x === "number")) : 0;
  const worstWait = maxWait || (plan.waits?.[0] ?? 0) || 0;
  const lowestLegTotal = getLowestTotalFare(plan.legs);
  const displayTotalPrice = lowestLegTotal ?? (typeof plan.total_price === "number" && Number.isFinite(plan.total_price) ? plan.total_price : null);

  function waitLevel(waitMin: number) {
    if (waitMin <= 0) return "none" as const;
    if (waitMin < 60) return "good" as const;
    if (waitMin < 180) return "warn" as const;
    return "bad" as const;
  }

  function waitTone(waitMin: number) {
    const level = waitLevel(waitMin);
    const pillClass =
      level === "good" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 ring-emerald-500/30" :
      level === "warn" ? "bg-amber-500/10 text-amber-600 dark:text-amber-300 ring-amber-500/30" :
      level === "bad" ? "bg-rose-500/10 text-rose-600 dark:text-rose-300 ring-rose-500/30" :
      "bg-muted/35 text-muted-foreground ring-border/50";
    const lineTextClass =
      level === "good" ? "text-emerald-600/90 dark:text-emerald-300/90" :
      level === "warn" ? "text-amber-600/90 dark:text-amber-300/90" :
      level === "bad" ? "text-rose-600/90 dark:text-rose-300/90" :
      "text-muted-foreground";
    return { level, pillClass, lineTextClass };
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

  const worstWaitTone = waitTone(worstWait);
  const legRow = "transfer-leg-row";
  const waitRow = "transfer-wait-row";
  const timelineStations = plan.legs.length > 0
    ? [plan.legs[0].from_station, ...plan.via, plan.legs[plan.legs.length - 1].to_station]
    : [];

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, delay: index * 0.08 }}
      className="transfer-plan-shell space-y-2 rounded-xl border border-border/60 bg-card/65 backdrop-blur-sm"
    >
      <div className="space-y-1">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-end gap-2">
            <span className="transfer-plan-total-time font-extrabold tabular-nums text-foreground">
              {formatDuration(plan.total_minutes, fmtLocale)}
            </span>
            {index === 0 && (
              <span className="inline-flex shrink-0 items-center rounded-md bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary ring-1 ring-primary/25">
                {locale === "en" ? "Recommended" : "推荐"}
              </span>
            )}
          </div>
          <div className="shrink-0 text-right">
            <div className="flex items-baseline justify-end gap-1.5">
              <span className="text-[12px] text-muted-foreground">{locale === "en" ? "Total" : "总价"}</span>
              <span className={cn(
                "transfer-plan-total-price font-extrabold tabular-nums",
                displayTotalPrice != null ? "text-primary" : "text-muted-foreground",
              )}>
                {displayTotalPrice != null ? formatPrice(displayTotalPrice) : "--"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex min-w-0 items-center justify-between gap-2">
          {timelineStations.length >= 2 && (
            <div className="flex min-w-0 flex-1 items-center gap-2 text-[11px] text-muted-foreground">
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

          <div className="flex shrink-0 items-center justify-end gap-1.5 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center rounded-full border border-border/55 px-2 py-0.5 tabular-nums">
              {locale === "en" ? `${transfers} change` : `${transfers}次换乘`}
            </span>
            <span className="inline-flex items-center rounded-full border border-border/55 px-2 py-0.5 tabular-nums">
              {locale === "en" ? `Longest wait ${formatWait(worstWait)}` : `最长候车 ${formatWait(worstWait)}`}
            </span>
            <span className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1",
              worstWaitTone.pillClass,
            )}>
              {worstWaitTone.level === "good"
                ? (locale === "en" ? "Smooth" : "衔接好")
                : worstWaitTone.level === "warn"
                  ? (locale === "en" ? "Normal" : "一般")
                  : worstWaitTone.level === "bad"
                    ? (locale === "en" ? "Long wait" : "等待长")
                    : (locale === "en" ? "No wait" : "无等待")}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-1.5 pt-0.5">
        {plan.legs.map((leg, i) => {
          const waitMinutes = Number(plan.waits[i] ?? 0);
          const waitInfo = waitTone(waitMinutes);
          const viaName = plan.via[i];
          const legDate = leg.date || fallbackDate || "";
          const legParams = new URLSearchParams({
            date: legDate,
            from: leg.from_station,
            to: leg.to_station,
          });
          legParams.set("returnTo", returnTo);
          const legHref = `/trains/${encodeURIComponent(leg.train_no)}?${legParams.toString()}`;
          return (
            <div key={`${leg.train_no}:${leg.departure_time}:${leg.arrival_time}:${i}`} className="space-y-1.5">
              <Link href={legHref} className="block group">
                <div className={cn(
                  legRow,
                  "rounded-xl border border-border/55 bg-background/35 px-2.5 py-2 transition-all duration-200 hover:border-primary/30 hover:bg-background/55",
                )}>
                  <div className="transfer-leg-left flex flex-col items-start">
                    <span
                      className={cn(
                        "transfer-leg-no inline-flex items-center justify-center rounded-md px-1 py-0.5 text-[11px] font-bold text-white",
                        getTrainTypeColor(leg.train_no.charAt(0)),
                      )}
                    >
                      {leg.train_no}
                    </span>
                    {legDate && (
                      <span className="mt-1 inline-flex items-center rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                        {getDateLabel(legDate, locale, true) || legDate.slice(5)}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center justify-between gap-1.5">
                      <div className="transfer-leg-time truncate font-bold leading-none tabular-nums tracking-tight text-foreground group-hover:text-primary/90">
                        {leg.departure_time} <span className="px-1 text-muted-foreground/65">→</span> {leg.arrival_time}
                      </div>
                      <div className="transfer-leg-inline-duration text-[12px] font-semibold tabular-nums text-foreground/90 whitespace-nowrap">
                        {formatDuration(leg.duration_minutes, fmtLocale)}
                      </div>
                    </div>
                    <div className="transfer-leg-station mt-1 truncate text-muted-foreground/95">
                      {leg.from_station} → {leg.to_station}
                    </div>
                  </div>

                  <div className="transfer-leg-right-duration">
                    <span className="inline-flex min-w-[110px] justify-end text-[1rem] font-semibold leading-none tabular-nums text-foreground/90">
                      {formatDuration(leg.duration_minutes, fmtLocale)}
                    </span>
                  </div>
                </div>
              </Link>

              {i < plan.legs.length - 1 && plan.waits[i] != null && (
                <div className={cn(waitRow, "py-0.5")}>
                  <span className="block" />
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="h-px flex-1 bg-border/55" />
                    <span className={cn("truncate text-[10px] font-medium", waitInfo.lineTextClass)}>
                      {locale === "en"
                        ? `${viaName || "Transfer"} stop`
                        : `${viaName || "中转站"}停留`}
                    </span>
                    <span className={cn(
                      "transfer-wait-inline inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 tabular-nums whitespace-nowrap",
                      waitInfo.pillClass,
                    )}>
                      <Clock className="h-3 w-3" />
                      {formatWait(waitMinutes)}
                    </span>
                  </div>
                  <div className="transfer-wait-right">
                    <span className={cn(
                      "inline-flex min-w-[96px] items-center justify-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 tabular-nums whitespace-nowrap",
                      waitInfo.pillClass,
                    )}>
                      <Clock className="h-3 w-3" />
                      {formatWait(waitMinutes)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

interface TrainResultCardsProps {
  cards: ChatCard[];
  onQueryTransfer?: (from: string, to: string) => void;
  messageId: string;
}

export function TrainResultCards({ cards, onQueryTransfer, messageId }: TrainResultCardsProps) {
  const { t, locale } = useI18n();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const storedExpandedCards = useChatViewStore((s) => s.cardExpandedByMessage[messageId]);
  const expandedCards = storedExpandedCards ?? EMPTY_EXPANDED_CARDS;
  const setCardExpanded = useChatViewStore((s) => s.setCardExpanded);
  const returnTo = useMemo(() => {
    const query = searchParams.toString();
    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams]);

  const toggleExpand = (idx: number) => {
    setCardExpanded(messageId, idx, !expandedCards[idx]);
  };

  const cardKeys = useMemo(
    () =>
      cards.map((card, ci) =>
        card.type === "transfer"
          ? `transfer:${card.from}:${card.to}:${card.date}:${card.plans.length}:${ci}`
          : `${card.type}:${card.trains[0]?.train_no || "none"}:${card.trains.length}:${ci}`,
      ),
    [cards],
  );

  return (
    <div className="mt-2.5 w-full space-y-3">
	      {cards.map((card, ci) => {
	        const isExpanded = expandedCards[ci] ?? false;
	        const trainList = card.type !== "transfer" ? card.trains : [];
	        const visibleTrains = isExpanded ? trainList : trainList.slice(0, 5);
	        const hiddenCount = trainList.length - 5;
          const isTransferCard = card.type === "transfer";

	        return (
	          <motion.div
	            key={cardKeys[ci]}
	            initial={{ opacity: 0, y: 6 }}
	            animate={{ opacity: 1, y: 0 }}
	            transition={{ duration: 0.25, delay: ci * 0.08 }}
	            className={cn(
                isTransferCard
                  ? "rounded-none border-0 bg-transparent p-0"
                  : "rounded-2xl border border-border/70 bg-card/62 p-3.5",
              )}
	          >
	            {/* Header */}
	            <div className={cn("mb-2.5 flex items-center gap-2 px-0.5", isTransferCard && "mb-2 px-0")}>
              {card.type === "fastest_train" ? (
                <Zap className="h-4 w-4 text-amber-500" />
              ) : card.type === "transfer" ? (
                <ArrowRightLeft className="h-4 w-4 text-emerald-500" />
              ) : (
                <TrainFront className="h-4 w-4 text-primary" />
              )}
              <span className="text-sm font-semibold text-foreground/90">
                {card.type === "train_list"
                  ? `${card.from} → ${card.to}  ·  ${card.trains.length}${locale === "en" ? " trains" : "趟"}`
                  : card.type === "transfer"
                  ? `${card.from} → ${card.to}  ·  ${card.plans.length}${locale === "en" ? " plans" : "个方案"}`
                  : card.hint || t("chat.quick.fast.label")}
              </span>
            </div>

            {/* Content */}
            <div className="space-y-2">
              {card.type === "transfer"
                ? [...card.plans]
                    .sort((a, b) => (
                      a.total_minutes - b.total_minutes
                      || (Math.max(0, ...(a.waits || [0])) - Math.max(0, ...(b.waits || [0])))
                      || (a.legs.length - b.legs.length)
                    ))
                    .map((plan, i) => (
                      <TransferPlanCard
                        key={`${plan.legs.map((leg) => leg.train_no).join("-")}:${plan.total_minutes}:${i}`}
                        plan={plan}
                        index={i}
                        fallbackDate={card.date}
                        returnTo={returnTo}
                      />
                    ))
                : visibleTrains.map((train, i) => (
                    <MiniTrainCard
                      key={`${train.train_no}:${train.from_station}:${train.to_station}:${train.departure_time}:${i}`}
                      train={train}
                      index={i}
                      returnTo={returnTo}
                    />
                  ))}
            </div>

            {/* Expand / collapse for train lists */}
            {card.type !== "transfer" && hiddenCount > 0 && (
              <button
                onClick={() => toggleExpand(ci)}
                className="mt-1.5 flex w-full items-center justify-center gap-1 rounded-lg py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary/45 hover:text-foreground"
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
                className="mt-1.5 flex w-full items-center justify-center gap-1.5 border-t border-border/50 pt-2 text-[11px] text-muted-foreground transition-colors hover:text-primary"
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
