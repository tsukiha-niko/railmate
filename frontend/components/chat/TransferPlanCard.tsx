"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import { Clock } from "lucide-react";
import { cn } from "@/utils/cn";
import { formatDuration } from "@/utils/date";
import { formatPrice, getTrainTypeColor } from "@/utils/format";
import type { TransferLegData, TransferPlanData } from "@/utils/parseToolCards";
import { useI18n } from "@/lib/i18n/i18n";
import { getDateLabel } from "./MiniTrainCard";

function getLowestLegFare(leg: TransferLegData): number | null {
  const fares = [leg.price_no_seat, leg.price_hard_seat, leg.price_hard_sleeper, leg.price_soft_sleeper, leg.price_second_seat, leg.price_first_seat, leg.price_business_seat]
    .filter((p): p is number => typeof p === "number" && Number.isFinite(p) && p > 0);
  return fares.length ? Math.min(...fares) : null;
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

interface TransferPlanCardProps {
  plan: TransferPlanData;
  index: number;
  fallbackDate?: string;
  returnTo: string;
}

export function TransferPlanCard({ plan, index, fallbackDate, returnTo }: TransferPlanCardProps) {
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

  function formatWait(waitMin: number) {
    const w = Math.max(0, Math.round(waitMin));
    if (w >= 60) {
      const h = Math.floor(w / 60);
      const m = w % 60;
      return locale === "en" ? `${h}h${m ? ` ${m}m` : ""}` : `${h}小时${m ? `${m}分` : ""}`;
    }
    return locale === "en" ? `${w}m` : `${w}分`;
  }

  const worstLevel = waitLevel(worstWait);

  return (
    <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2, delay: index * 0.08 }}>
      <Card variant="outlined" sx={{ bgcolor: "background.paper", p: { xs: 2, sm: 2.5 }, borderRadius: "18px", borderColor: (th: any) => `${th.palette.divider}50`, boxShadow: "var(--shadow-card)", transition: "box-shadow 0.2s ease", "&:hover": { boxShadow: "var(--shadow-card-hover)" } }}>
        {/* Header: total duration + price */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography fontWeight={800} sx={{ fontVariantNumeric: "tabular-nums", lineHeight: 1, fontSize: { xs: "1.2rem", sm: "1.35rem" } }}>
              {formatDuration(plan.total_minutes, fmtLocale)}
            </Typography>
            {index === 0 && <Chip label={locale === "en" ? "Recommended" : "推荐"} size="small" color="primary" sx={{ fontSize: "0.6rem", height: 22 }} />}
          </Box>
          <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.5 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.65rem" }}>{locale === "en" ? "Total" : "总价"}</Typography>
            <Typography fontWeight={800} color={displayTotalPrice != null ? "primary.main" : "text.secondary"} sx={{ fontVariantNumeric: "tabular-nums", lineHeight: 1, fontSize: { xs: "1.15rem", sm: "1.3rem" } }}>
              {displayTotalPrice != null ? formatPrice(displayTotalPrice) : "--"}
            </Typography>
          </Box>
        </Box>

        {/* Tags */}
        <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", mb: 1.5 }}>
          <Chip label={locale === "en" ? `${transfers} change` : `${transfers}次换乘`} size="small" variant="outlined" sx={{ height: 22, fontSize: "0.625rem" }} />
          <Chip icon={<Clock size={11} />} label={locale === "en" ? `Wait ${formatWait(worstWait)}` : `候车 ${formatWait(worstWait)}`} size="small" variant="outlined" sx={{ height: 22, fontSize: "0.625rem" }} />
          <Chip
            label={worstLevel === "good" ? (locale === "en" ? "Smooth" : "衔接好") : worstLevel === "warn" ? (locale === "en" ? "Normal" : "一般") : worstLevel === "bad" ? (locale === "en" ? "Long wait" : "等待长") : (locale === "en" ? "No wait" : "无等待")}
            size="small"
            color={worstLevel === "good" ? "success" : worstLevel === "warn" ? "warning" : worstLevel === "bad" ? "error" : "default"}
            sx={{ height: 22, fontSize: "0.625rem" }}
          />
        </Box>

        {/* Legs */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {plan.legs.map((leg, i) => {
            const waitMinutes = Number(plan.waits[i] ?? 0);
            const wl = waitLevel(waitMinutes);
            const legDate = leg.date || fallbackDate || "";
            const legParams = new URLSearchParams({ date: legDate, from: leg.from_station, to: leg.to_station });
            legParams.set("returnTo", returnTo);
            const legHref = `/trains/${encodeURIComponent(leg.train_no)}?${legParams.toString()}`;

            return (
              <Box key={`${leg.train_no}:${leg.departure_time}:${i}`}>
                <Card variant="outlined" sx={{ bgcolor: (th: any) => `${th.palette.action.hover}40`, borderRadius: "14px", borderColor: (th: any) => `${th.palette.divider}30`, transition: "border-color 0.18s ease", "&:hover": { borderColor: "primary.main" } }}>
                  <CardActionArea component={Link} href={legHref} sx={{ px: 2, py: 1.5 }}>
                    <Box sx={{ display: "grid", gridTemplateColumns: "80px 1fr auto", gap: { xs: 1, sm: 1.5 }, alignItems: "center" }}>
                      {/* Left col: badge + date — vertically centered */}
                      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.5 }}>
                        <span className={cn("inline-flex items-center rounded-lg px-2.5 py-1 text-sm font-extrabold text-white leading-none", getTrainTypeColor(leg.train_no.charAt(0)))}>{leg.train_no}</span>
                        {legDate && <Chip label={getDateLabel(legDate, locale, true) || legDate.slice(5)} size="small" color="warning" variant="outlined" sx={{ fontSize: "0.55rem", height: 18, "& .MuiChip-label": { px: 0.5 } }} />}
                      </Box>
                      {/* Middle col: time + stations — left aligned */}
                      <Box>
                        <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.75 }}>
                          <Typography fontWeight={800} sx={{ fontVariantNumeric: "tabular-nums", letterSpacing: "-0.01em", fontSize: { xs: "1.2rem", sm: "1.3rem" }, lineHeight: 1 }}>
                            {leg.departure_time}
                          </Typography>
                          <Box component="span" sx={{ color: "text.disabled", fontSize: "1rem" }}>→</Box>
                          <Typography fontWeight={800} sx={{ fontVariantNumeric: "tabular-nums", letterSpacing: "-0.01em", fontSize: { xs: "1.2rem", sm: "1.3rem" }, lineHeight: 1 }}>
                            {leg.arrival_time}
                          </Typography>
                        </Box>
                        <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: "0.7rem", mt: 0.5, display: "block" }}>{leg.from_station} → {leg.to_station}</Typography>
                      </Box>
                      {/* Right col: duration */}
                      <Typography fontWeight={700} color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums", fontSize: "0.9rem", whiteSpace: "nowrap", textAlign: "right" }}>
                        {formatDuration(leg.duration_minutes, fmtLocale)}
                      </Typography>
                    </Box>
                  </CardActionArea>
                </Card>

                {i < plan.legs.length - 1 && plan.waits[i] != null && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, py: 0.75, px: 1 }}>
                    <Box sx={{ flex: 1, height: "2px", borderRadius: 1, bgcolor: wl === "good" ? "success.main" : wl === "warn" ? "warning.main" : wl === "bad" ? "error.main" : "divider", opacity: 0.25 }} />
                    <Typography variant="caption" sx={{ fontSize: "0.65rem", flexShrink: 0, color: wl === "good" ? "success.main" : wl === "warn" ? "warning.main" : wl === "bad" ? "error.main" : "text.secondary" }}>
                      {locale === "en" ? `${plan.via[i] || "Transfer"} stop` : `${plan.via[i] || "中转站"}停留`}
                    </Typography>
                    <Chip icon={<Clock size={10} />} label={formatWait(waitMinutes)} size="small"
                      color={wl === "good" ? "success" : wl === "warn" ? "warning" : wl === "bad" ? "error" : "default"}
                      sx={{ fontSize: "0.6rem", height: 22 }}
                    />
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>
      </Card>
    </motion.div>
  );
}
