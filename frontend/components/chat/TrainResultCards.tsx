"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { usePathname, useSearchParams } from "next/navigation";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import { TrainFront, Zap, ArrowRightLeft, ChevronDown } from "lucide-react";
import type { ChatCard } from "@/utils/parseToolCards";
import { useI18n } from "@/lib/i18n/i18n";
import { useChatViewStore } from "@/store/chatViewStore";
import { MiniTrainCard } from "./MiniTrainCard";
import { TransferPlanCard } from "./TransferPlanCard";

const EMPTY_EXPANDED_CARDS: Record<number, boolean> = {};

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
    <Box sx={{ mt: 1.5, width: "100%", display: "flex", flexDirection: "column", gap: 1.5 }}>
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
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1, color: "text.secondary" }}>
              {card.type === "fastest_train" ? <Zap size={16} style={{ color: "#F59E0B" }} /> : isTransfer ? <ArrowRightLeft size={16} style={{ color: "#10B981" }} /> : <TrainFront size={16} />}
              <Typography variant="body2" fontWeight={700} color="text.primary">
                {card.type === "train_list"
                  ? `${card.from} → ${card.to}  ·  ${card.trains.length}${locale === "en" ? " trains" : "趟"}`
                  : isTransfer
                    ? `${card.from} → ${card.to}  ·  ${card.plans.length}${locale === "en" ? " plans" : "个方案"}`
                    : card.hint || t("chat.quick.fast.label")}
              </Typography>
            </Box>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {isTransfer
                ? [...card.plans]
                    .sort((a, b) => a.total_minutes - b.total_minutes || (Math.max(0, ...(a.waits || [0])) - Math.max(0, ...(b.waits || [0]))) || a.legs.length - b.legs.length)
                    .map((plan, i) => (
                      <TransferPlanCard key={`${plan.legs.map((l) => l.train_no).join("-")}:${plan.total_minutes}:${i}`} plan={plan} index={i} fallbackDate={card.date} returnTo={returnTo} />
                    ))
                : visibleTrains.map((train, i) => (
                    <MiniTrainCard key={`${train.train_no}:${train.from_station}:${train.to_station}:${train.departure_time}:${i}`} train={train} index={i} returnTo={returnTo} />
                  ))}
            </Box>

            {card.type !== "transfer" && hiddenCount > 0 && (
              <Button onClick={() => toggleExpand(ci)} size="small" fullWidth sx={{ mt: 0.5, color: "text.secondary", textTransform: "none" }} startIcon={<ChevronDown size={14} style={{ transform: isExpanded ? "rotate(180deg)" : undefined, transition: "transform 0.2s" }} />}>
                {isExpanded ? (locale === "en" ? "Show less" : "收起") : (locale === "en" ? `Show ${hiddenCount} more` : `展开剩余 ${hiddenCount} 趟`)}
              </Button>
            )}

            {card.type === "train_list" && onQueryTransfer && (
              <Button onClick={() => onQueryTransfer(card.from, card.to)} size="small" fullWidth sx={{ mt: 0.5, color: "text.secondary", borderTop: 1, borderColor: "divider", borderRadius: 0, textTransform: "none" }} startIcon={<ArrowRightLeft size={12} />}>
                {t("chat.card.queryTransfer")}
              </Button>
            )}
          </motion.div>
        );
      })}
    </Box>
  );
}
