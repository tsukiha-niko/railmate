"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import { Clock, ArrowRight } from "lucide-react";
import { cn } from "@/utils/cn";
import { formatDuration } from "@/utils/date";
import { formatPrice, formatRemaining, getLowestFare, getTrainTypeColor } from "@/utils/format";
import type { TrainCardData } from "@/utils/parseToolCards";
import { useI18n } from "@/lib/i18n/i18n";

function getDateInShanghai(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  return `${parts.find((p) => p.type === "year")?.value || "1970"}-${parts.find((p) => p.type === "month")?.value || "01"}-${parts.find((p) => p.type === "day")?.value || "01"}`;
}

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

export function getDateLabel(trainDate: string | undefined, locale: string, showToday = false): string | null {
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

interface MiniTrainCardProps {
  train: TrainCardData;
  index: number;
  returnTo: string;
}

export function MiniTrainCard({ train, index, returnTo }: MiniTrainCardProps) {
  const { locale, t } = useI18n();
  const fmtLocale = locale === "en" ? "en" : "zh-CN";
  const detailParams = new URLSearchParams({ date: train.date || "", from: train.from_station, to: train.to_station });
  detailParams.set("returnTo", returnTo);
  const href = `/trains/${encodeURIComponent(train.train_no)}?${detailParams.toString()}`;
  const dateLabel = getDateLabel(train.date, locale);
  const lowestFare = getLowestFare(train);

  return (
    <motion.div initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.15, delay: index * 0.04 }}>
      <Card
        variant="outlined"
        sx={{
          borderRadius: "10px",
          bgcolor: "background.default",
          boxShadow: "none",
          borderLeft: "2px solid transparent",
          transition: "all 0.15s ease",
          "&:hover": { borderLeftColor: "primary.main", boxShadow: "var(--shadow-card)" },
        }}
      >
        <CardActionArea component={Link} href={href} sx={{ px: 1.25, py: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <span className={cn("inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold text-white leading-none", getTrainTypeColor(train.train_type))}>{train.train_no}</span>
            {dateLabel && <Chip label={dateLabel} size="small" color="warning" variant="outlined" sx={{ fontSize: "0.6rem", height: 18, borderRadius: "4px" }} />}

            <Box sx={{ minWidth: 0, ml: 0.5 }}>
              <Typography variant="caption" fontWeight={800} sx={{ fontVariantNumeric: "tabular-nums", fontSize: "0.8rem" }}>{train.departure_time}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mx: 0.25, fontSize: "0.6rem" }}>{train.from_station}</Typography>
            </Box>

            <Box sx={{ flex: 1, display: "flex", alignItems: "center", gap: 0.25, minWidth: 32 }}>
              <Box sx={{ flex: 1, height: "1px", bgcolor: "divider" }} />
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.25, color: "text.secondary", flexShrink: 0 }}>
                <Clock size={9} />
                <Typography variant="caption" sx={{ fontSize: "0.6rem" }}>{formatDuration(train.duration_minutes, fmtLocale)}</Typography>
              </Box>
              <ArrowRight size={10} style={{ opacity: 0.3, flexShrink: 0 }} />
            </Box>

            <Box sx={{ minWidth: 0, textAlign: "right" }}>
              <Typography variant="caption" fontWeight={800} sx={{ fontVariantNumeric: "tabular-nums", fontSize: "0.8rem" }}>{train.arrival_time}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mx: 0.25, fontSize: "0.6rem" }}>{train.to_station}</Typography>
            </Box>

            <Box sx={{ display: "flex", gap: 0.5, alignItems: "center", flexShrink: 0, ml: 0.5 }}>
              <Chip label={lowestFare != null ? formatPrice(lowestFare.price) : "--"} size="small" color="primary" variant="outlined" sx={{ fontWeight: 700, fontSize: "0.6rem", height: 18, borderRadius: "4px" }} />
              <Chip
                label={formatRemaining(train.remaining_tickets, fmtLocale)}
                size="small"
                sx={{
                  fontWeight: 700, fontSize: "0.6rem", height: 18, borderRadius: "4px",
                  bgcolor: train.remaining_tickets === 0 ? "error.main" : train.remaining_tickets != null && train.remaining_tickets < 10 ? "warning.main" : "success.main",
                  color: "white",
                }}
              />
            </Box>
          </Box>
        </CardActionArea>
      </Card>
    </motion.div>
  );
}
