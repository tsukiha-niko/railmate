"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import CardActionArea from "@mui/material/CardActionArea";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
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
  isLast?: boolean;
}

export function MiniTrainCard({ train, index, returnTo, isLast = false }: MiniTrainCardProps) {
  const { locale } = useI18n();
  const fmtLocale = locale === "en" ? "en" : "zh-CN";
  const detailParams = new URLSearchParams({ date: train.date || "", from: train.from_station, to: train.to_station });
  detailParams.set("returnTo", returnTo);
  const href = `/trains/${encodeURIComponent(train.train_no)}?${detailParams.toString()}`;
  const dateLabel = getDateLabel(train.date, locale);
  const lowestFare = getLowestFare(train);

  return (
    <motion.div initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.15, delay: index * 0.04 }}>
      <CardActionArea
        component={Link}
        href={href}
        sx={{
          display: "block",
          px: { xs: 1.5, sm: 2 },
          py: 1.25,
          borderBottom: isLast ? 0 : 1,
          borderColor: (th: any) => `${th.palette.divider}20`,
          transition: "background 0.15s ease",
          "&:hover": { bgcolor: (th: any) => `${th.palette.action.hover}50` },
        }}
      >
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "64px 1fr auto", sm: "72px 1fr auto" }, gap: { xs: 0.75, sm: 1.5 }, alignItems: "center" }}>
          {/* Left: badge + date (vertically stacked, centered) */}
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.5, py: 0.25 }}>
            <span className={cn("inline-flex items-center justify-center rounded-md px-2 py-0.5 text-xs font-bold text-white leading-none whitespace-nowrap", getTrainTypeColor(train.train_type))}>
              {train.train_no}
            </span>
            {dateLabel && (
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.6rem", whiteSpace: "nowrap", lineHeight: 1 }}>
                {dateLabel}
              </Typography>
            )}
          </Box>

          {/* Middle: row1 = times + duration, row2 = stations */}
          <Box sx={{ minWidth: 0 }}>
            <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.5, flexWrap: "nowrap" }}>
              <Typography fontWeight={800} sx={{ fontVariantNumeric: "tabular-nums", fontSize: { xs: "1rem", sm: "1.1rem" }, lineHeight: 1, letterSpacing: "-0.01em", flexShrink: 0 }}>
                {train.departure_time}
              </Typography>
              <Box component="span" sx={{ color: "text.disabled", fontSize: "0.85rem", flexShrink: 0 }}>→</Box>
              <Typography fontWeight={800} sx={{ fontVariantNumeric: "tabular-nums", fontSize: { xs: "1rem", sm: "1.1rem" }, lineHeight: 1, letterSpacing: "-0.01em", flexShrink: 0 }}>
                {train.arrival_time}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.65rem", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", flexShrink: 0, ml: 0.25 }}>
                {formatDuration(train.duration_minutes, fmtLocale)}
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: "0.65rem", mt: 0.5, display: "block", lineHeight: 1 }}>
              {train.from_station} → {train.to_station}
            </Typography>
          </Box>

          {/* Right: price + ticket (vertically stacked) */}
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 0.5 }}>
            <Chip
              label={lowestFare != null ? formatPrice(lowestFare.price) : "--"}
              size="small"
              color="primary"
              variant="outlined"
              sx={{ fontWeight: 700, fontSize: "0.7rem", height: 22 }}
            />
            <Chip
              label={formatRemaining(train.remaining_tickets, fmtLocale)}
              size="small"
              sx={{
                fontWeight: 700, fontSize: "0.6rem", height: 20,
                bgcolor: train.remaining_tickets === 0 ? "error.main" : train.remaining_tickets != null && train.remaining_tickets < 10 ? "warning.main" : "success.main",
                color: "white",
              }}
            />
          </Box>
        </Box>
      </CardActionArea>
    </motion.div>
  );
}
