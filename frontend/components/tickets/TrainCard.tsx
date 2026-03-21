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
import { formatPrice, formatRemaining, getAvailableFares, getFareLabel, getLowestFare, getTrainTypeLabel, getTrainTypeColor } from "@/utils/format";
import { cn } from "@/utils/cn";
import { useI18n } from "@/lib/i18n/i18n";

interface Props { train: TrainSearchResult; date: string; index?: number; tags?: string[]; }

export function TrainCard({ train, date, index = 0, tags = [] }: Props) {
  const { locale, t } = useI18n();
  const fmtLocale = locale === "en" ? "en" : "zh-CN";
  const lowestFare = getLowestFare(train);
  const additionalFares = getAvailableFares(train).filter((f) => f.key !== lowestFare?.key).slice(0, 2);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: Math.min(index * 0.04, 0.4), ease: [0.22, 1, 0.36, 1] }}>
      <Card
        variant="outlined"
        sx={{
          borderRadius: 5,
          borderColor: (th) => `${th.palette.divider}70`,
          transition: "all 0.2s ease",
          "&:hover": {
            borderColor: "primary.main",
            boxShadow: "var(--shadow-md)",
            transform: "translateY(-1px)",
          },
        }}
      >
        <CardActionArea
          component={Link}
          href={`/trains/${train.train_no}?date=${date}&from=${encodeURIComponent(train.from_station)}&to=${encodeURIComponent(train.to_station)}`}
          sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 5 }}
        >
          <Box sx={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 1, mb: 1.5 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
              <span className={cn("inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-bold text-white", getTrainTypeColor(train.train_type))}>{train.train_no}</span>
              <Typography variant="caption" color="text.secondary">{getTrainTypeLabel(train.train_type, fmtLocale)}</Typography>
              {tags.map((tag) => <Chip key={tag} label={tag} size="small" color="warning" sx={{ fontSize: "0.625rem", height: 20, borderRadius: 2 }} />)}
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              {lowestFare && (
                <Chip label={`${t("tickets.fare.from")} ${formatPrice(lowestFare.price)}`} size="small" color="primary" variant="outlined" sx={{ fontWeight: 700, fontSize: "0.75rem", borderRadius: 2.5 }} />
              )}
              <Chip
                label={formatRemaining(train.remaining_tickets, fmtLocale)}
                size="small"
                sx={{
                  fontWeight: 700, fontSize: "0.75rem", borderRadius: 2.5,
                  bgcolor: train.remaining_tickets === 0 ? "error.main" : train.remaining_tickets != null && train.remaining_tickets < 10 ? "warning.main" : "success.main",
                  color: "white",
                }}
              />
            </Box>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 1.5, sm: 2.5 } }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h5" fontWeight={800} sx={{ fontVariantNumeric: "tabular-nums" }}>{train.departure_time}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{train.from_station}</Typography>
            </Box>
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.5, px: 1 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "text.secondary" }}>
                <Clock size={12} />
                <Typography variant="caption">{formatDuration(train.duration_minutes, fmtLocale)}</Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <Box sx={{ width: { xs: 36, sm: 64 }, height: "1px", background: "linear-gradient(to right, var(--border), var(--primary))" }} />
                <ArrowRight size={14} style={{ opacity: 0.5 }} />
              </Box>
            </Box>
            <Box sx={{ flex: 1, textAlign: "right" }}>
              <Typography variant="h5" fontWeight={800} sx={{ fontVariantNumeric: "tabular-nums" }}>{train.arrival_time}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{train.to_station}</Typography>
            </Box>
          </Box>

          {additionalFares.length > 0 && (
            <Box sx={{ display: { xs: "none", sm: "flex" }, flexWrap: "wrap", gap: 0.75, mt: 1.5 }}>
              {additionalFares.map((fare) => (
                <Chip key={fare.key} label={`${getFareLabel(fare.key, fmtLocale)} ${formatPrice(fare.price)}`} size="small" variant="outlined" sx={{ fontSize: "0.75rem", borderRadius: 2.5 }} />
              ))}
            </Box>
          )}
        </CardActionArea>
      </Card>
    </motion.div>
  );
}
