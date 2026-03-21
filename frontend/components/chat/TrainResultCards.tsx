"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { usePathname, useSearchParams } from "next/navigation";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import { TrainFront, Zap, ArrowRightLeft, ChevronDown } from "lucide-react";
import type { ChatCard, TrainCardData, TransferPlanData } from "@/utils/parseToolCards";
import { useI18n } from "@/lib/i18n/i18n";
import { useChatViewStore } from "@/store/chatViewStore";
import { MiniTrainCard } from "./MiniTrainCard";
import { TransferPlanCard } from "./TransferPlanCard";

const EMPTY_EXPANDED_CARDS: Record<number, boolean> = {};

function longestCommonPrefix(strs: string[]): string {
  if (!strs.length) return "";
  let prefix = strs[0];
  for (let i = 1; i < strs.length; i++) {
    while (prefix && !strs[i].startsWith(prefix)) {
      prefix = prefix.slice(0, -1);
    }
    if (!prefix) return "";
  }
  return prefix;
}

function deriveStationLabel(stations: string[], fallback: string): string {
  const unique = [...new Set(stations.filter(Boolean))];
  if (unique.length === 0) return fallback;
  if (unique.length === 1) return unique[0];
  const prefix = longestCommonPrefix(unique);
  return prefix.length >= 2 ? prefix : fallback;
}

function deriveTrainListHeader(trains: TrainCardData[], queryFrom: string, queryTo: string) {
  return {
    from: deriveStationLabel(trains.map((t) => t.from_station), queryFrom),
    to: deriveStationLabel(trains.map((t) => t.to_station), queryTo),
  };
}

function deriveTransferHeader(plans: TransferPlanData[], queryFrom: string, queryTo: string) {
  const froms = plans.map((p) => p.legs[0]?.from_station).filter(Boolean);
  const tos = plans.map((p) => p.legs[p.legs.length - 1]?.to_station).filter(Boolean);
  return {
    from: deriveStationLabel(froms, queryFrom),
    to: deriveStationLabel(tos, queryTo),
  };
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

  const toggleExpand = (idx: number) => setCardExpanded(messageId, idx, !expandedCards[idx]);

  const cardKeys = useMemo(
    () => cards.map((card, ci) =>
      card.type === "transfer"
        ? `transfer:${card.from}:${card.to}:${card.date}:${card.plans.length}:${ci}`
        : `${card.type}:${card.trains[0]?.train_no || "none"}:${card.trains.length}:${ci}`,
    ),
    [cards],
  );

  return (
    <Box sx={{ mt: 1, width: "100%", display: "flex", flexDirection: "column", gap: 1.25 }}>
      {cards.map((card, ci) => {
        const isExpanded = expandedCards[ci] ?? false;
        const trainList = card.type !== "transfer" ? card.trains : [];
        const visibleTrains = isExpanded ? trainList : trainList.slice(0, 5);
        const hiddenCount = trainList.length - 5;
        const isTransfer = card.type === "transfer";

        return (
          <motion.div
            key={cardKeys[ci]}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: ci * 0.08 }}
          >
            <Box sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.75,
              mb: 1,
              px: 1.25,
              py: 0.75,
              borderRadius: "10px",
              bgcolor: (th: any) => `${th.palette.background.paper}CC`,
              border: 1,
              borderColor: (th: any) => `${th.palette.divider}40`,
            }}>
              {card.type === "fastest_train" ? <Zap size={14} style={{ color: "#F59E0B" }} /> : isTransfer ? <ArrowRightLeft size={14} style={{ color: "#10B981" }} /> : <TrainFront size={14} />}
              <Typography variant="caption" fontWeight={700} color="text.primary" sx={{ fontSize: "0.75rem" }}>
                {(() => {
                  if (card.type === "train_list") {
                    const h = deriveTrainListHeader(card.trains, card.from, card.to);
                    return `${h.from} → ${h.to} · ${card.trains.length}${locale === "en" ? " trains" : "趟"}`;
                  }
                  if (isTransfer) {
                    const h = deriveTransferHeader(card.plans, card.from, card.to);
                    return `${h.from} → ${h.to} · ${card.plans.length}${locale === "en" ? " plans" : "个方案"}`;
                  }
                  return card.hint || t("chat.quick.fast.label");
                })()}
              </Typography>
            </Box>

            {isTransfer ? (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {[...card.plans]
                  .sort((a, b) => a.total_minutes - b.total_minutes || (Math.max(0, ...(a.waits || [0])) - Math.max(0, ...(b.waits || [0]))) || a.legs.length - b.legs.length)
                  .map((plan, i) => (
                    <TransferPlanCard key={`${plan.legs.map((l) => l.train_no).join("-")}:${plan.total_minutes}:${i}`} plan={plan} index={i} fallbackDate={card.date} returnTo={returnTo} />
                  ))}
              </Box>
            ) : (
              <Box sx={{ borderRadius: "12px", border: 1, borderColor: (th: any) => `${th.palette.divider}40`, bgcolor: "background.paper", boxShadow: "var(--shadow-card)", overflow: "hidden" }}>
                {visibleTrains.map((train, i) => (
                  <MiniTrainCard key={`${train.train_no}:${train.from_station}:${train.to_station}:${train.departure_time}:${i}`} train={train} index={i} returnTo={returnTo} isLast={i === visibleTrains.length - 1} />
                ))}
                {hiddenCount > 0 && (
                  <Button onClick={() => toggleExpand(ci)} size="small" fullWidth sx={{ color: "text.secondary", textTransform: "none", borderRadius: 0, fontSize: "0.75rem", borderTop: 1, borderColor: (th: any) => `${th.palette.divider}30`, py: 1 }} startIcon={<ChevronDown size={14} style={{ transform: isExpanded ? "rotate(180deg)" : undefined, transition: "transform 0.2s" }} />}>
                    {isExpanded ? (locale === "en" ? "Show less" : "收起") : (locale === "en" ? `Show ${hiddenCount} more` : `展开剩余 ${hiddenCount} 趟`)}
                  </Button>
                )}
                {onQueryTransfer && card.type === "train_list" && (
                  <Button onClick={() => onQueryTransfer(card.from, card.to)} size="small" fullWidth sx={{ color: "text.secondary", borderTop: 1, borderColor: (th: any) => `${th.palette.divider}30`, borderRadius: 0, textTransform: "none", fontSize: "0.75rem", py: 1 }} startIcon={<ArrowRightLeft size={12} />}>
                    {t("chat.card.queryTransfer")}
                  </Button>
                )}
              </Box>
            )}
          </motion.div>
        );
      })}
    </Box>
  );
}
