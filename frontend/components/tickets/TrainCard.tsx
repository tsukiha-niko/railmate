"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import { Clock, ArrowRight } from "lucide-react";
import type { TrainSearchResult } from "@/types/trains";
import { formatDuration } from "@/utils/date";
import { formatPrice, formatRemaining, getLowestFare, getTrainTypeLabel, getTrainTypeColor } from "@/utils/format";
import { cn } from "@/utils/cn";
import { useI18n } from "@/lib/i18n/i18n";

interface Props { train: TrainSearchResult; date: string; index?: number; tags?: string[]; }

export function TrainCard({ train, date, index = 0, tags = [] }: Props) {
  const { locale, t } = useI18n();
  const fmtLocale = locale === "en" ? "en" : "zh-CN";
  const lowestFare = getLowestFare(train);
  const href = `/trains/${train.train_no}?date=${date}&from=${encodeURIComponent(train.from_station)}&to=${encodeURIComponent(train.to_station)}`;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: Math.min(index * 0.03, 0.3) }}>
      <Card
        variant="outlined"
        sx={{
          borderRadius: "12px",
          boxShadow: "var(--shadow-card)",
          transition: "all 0.22s ease",
          borderColor: (th: any) => `${th.palette.divider}90`,
          "&:hover": {
            borderColor: "primary.main",
            boxShadow: "var(--shadow-card-hover)",
            transform: "translateY(-1px)",
          },
        }}
      >
        <CardActionArea component={Link} href={href} sx={{ px: 2, py: 1.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, mb: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <span className={cn("inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-bold text-white leading-none", getTrainTypeColor(train.train_type))}>{train.train_no}</span>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.7rem" }}>{getTrainTypeLabel(train.train_type, fmtLocale)}</Typography>
              {tags.map((tag) => <Chip key={tag} label={tag} size="small" color="warning" sx={{ fontSize: "0.6rem", height: 20 }} />)}
            </Box>
            <Box sx={{ display: "flex", gap: 0.5, alignItems: "center", flexShrink: 0 }}>
              {lowestFare && <Chip label={`${t("tickets.fare.from")} ${formatPrice(lowestFare.price)}`} size="small" color="primary" variant="outlined" sx={{ fontWeight: 700, fontSize: "0.7rem", height: 24 }} />}
              <Chip label={formatRemaining(train.remaining_tickets, fmtLocale)} size="small" sx={{
                fontWeight: 700, fontSize: "0.65rem", height: 22,
                bgcolor: train.remaining_tickets === 0 ? "error.main" : train.remaining_tickets != null && train.remaining_tickets < 10 ? "warning.main" : "success.main",
                color: "white",
              }} />
            </Box>
          </Box>
          <Box sx={{ display: "grid", gridTemplateColumns: "auto 1fr auto", alignItems: "center", gap: 1.5 }}>
            <Box sx={{ minWidth: 56 }}>
              <Typography variant="subtitle1" fontWeight={800} sx={{ fontVariantNumeric: "tabular-nums", lineHeight: 1.15, letterSpacing: "-0.01em" }}>{train.departure_time}</Typography>
              <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: "0.7rem", mt: 0.25, display: "block" }}>{train.from_station}</Typography>
            </Box>
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.25 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "text.secondary" }}>
                <Clock size={10} />
                <Typography variant="caption" sx={{ fontSize: "0.65rem", fontVariantNumeric: "tabular-nums" }}>{formatDuration(train.duration_minutes, fmtLocale)}</Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", width: "100%" }}>
                <Box sx={{ flex: 1, height: "1px", bgcolor: "divider", borderRadius: 1 }} />
                <ArrowRight size={12} style={{ opacity: 0.35, flexShrink: 0 }} />
              </Box>
            </Box>
            <Box sx={{ minWidth: 56, textAlign: "right" }}>
              <Typography variant="subtitle1" fontWeight={800} sx={{ fontVariantNumeric: "tabular-nums", lineHeight: 1.15, letterSpacing: "-0.01em" }}>{train.arrival_time}</Typography>
              <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: "0.7rem", mt: 0.25, display: "block" }}>{train.to_station}</Typography>
            </Box>
          </Box>
        </CardActionArea>
      </Card>
    </motion.div>
  );
}
