"use client";

import { motion } from "framer-motion";
import { Clock, ArrowRight, TrainFront, Zap, Ticket } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/utils/cn";
import { formatDuration } from "@/utils/date";
import { formatPrice, formatRemaining, getTrainTypeColor } from "@/utils/format";
import type { ChatCard, TrainCardData } from "@/utils/parseToolCards";
import { useI18n } from "@/lib/i18n/i18n";

function MiniTrainCard({ train, index }: { train: TrainCardData; index: number }) {
  const { locale, t } = useI18n();
  const fmtLocale = locale === "en" ? "en" : "zh-CN";
  const href = `/trains/${train.train_no}?date=${train.date || ""}&from=${encodeURIComponent(train.from_station)}&to=${encodeURIComponent(train.to_station)}`;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, delay: index * 0.06 }}
    >
      <Link href={href} className="block group">
        <div className="rounded-lg border border-border bg-card/80 backdrop-blur-sm p-3 hover:border-primary/40 hover:shadow-sm transition-all duration-200 group-hover:scale-[1.01]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className={cn(
                "inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-bold text-white",
                getTrainTypeColor(train.train_type),
              )}>
                {train.train_no}
              </span>
              {train.from_station && (
                <span className="text-xs text-muted-foreground">{train.from_station}</span>
              )}
            </div>
            <span className={cn(
              "text-[11px] font-medium",
              train.remaining_tickets === 0 ? "text-destructive" :
              train.remaining_tickets != null && train.remaining_tickets < 10 ? "text-warning" : "text-success",
            )}>
              {formatRemaining(train.remaining_tickets, fmtLocale)}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold tabular-nums">{train.departure_time}</span>
            <div className="flex items-center gap-1 flex-1">
              <div className="flex-1 h-px bg-border" />
              <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                <Clock className="h-2.5 w-2.5" />
                {formatDuration(train.duration_minutes, fmtLocale)}
              </div>
              <div className="flex-1 h-px bg-border" />
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
            </div>
            <span className="text-lg font-bold tabular-nums">{train.arrival_time}</span>
          </div>
          {train.price_second_seat != null && (
            <div className="flex items-center gap-1 mt-1.5">
              <Ticket className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{t("tickets.seat.second")}</span>
              <span className="text-xs font-semibold text-primary">{formatPrice(train.price_second_seat)}</span>
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  );
}

export function TrainResultCards({ cards }: { cards: ChatCard[] }) {
  const { t } = useI18n();

  return (
    <div className="space-y-3 mt-2">
      {cards.map((card, ci) => (
        <motion.div
          key={ci}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: ci * 0.1 }}
          className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-accent/30 p-3 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-2.5 px-1">
            {card.type === "fastest_train" ? (
              <Zap className="h-4 w-4 text-amber-500" />
            ) : (
              <TrainFront className="h-4 w-4 text-primary" />
            )}
            <span className="text-xs font-medium text-foreground">
              {card.type === "train_list"
                ? `${card.from} → ${card.to}  ·  ${card.trains.length} ${t("search.found", { count: card.trains.length }).replace(/\d+/, "").trim()}`
                : card.hint || t("chat.quick.fast.label")}
            </span>
          </div>
          <div className="space-y-2">
            {card.trains.slice(0, 5).map((train, i) => (
              <MiniTrainCard key={`${train.train_no}:${train.from_station}:${i}`} train={train} index={i} />
            ))}
          </div>
          {card.trains.length > 5 && (
            <p className="text-[11px] text-muted-foreground text-center mt-2">
              +{card.trains.length - 5} {t("search.type.all").toLowerCase()}...
            </p>
          )}
        </motion.div>
      ))}
    </div>
  );
}
