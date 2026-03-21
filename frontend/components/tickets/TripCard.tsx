"use client";

import { useEffect, useRef, useState } from "react";
import { Copy, Undo2, Check } from "lucide-react";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Divider from "@mui/material/Divider";
import type { TicketOrder } from "@/types/ticketing";
import { formatDateLocalized } from "@/utils/date";
import { formatPrice, getTrainTypeLabel } from "@/utils/format";
import { useI18n } from "@/lib/i18n/i18n";

interface TripCardProps { order: TicketOrder; refunding: boolean; onRefund: (order: TicketOrder) => void; }

export function TripCard({ order, refunding, onRefund }: TripCardProps) {
  const { locale, t } = useI18n();
  const fmtLocale = locale === "en" ? "en" : "zh-CN";
  const isRefunded = order.status === "refunded";
  const [copied, setCopied] = useState<"order" | "refund" | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => () => { if (timerRef.current) window.clearTimeout(timerRef.current); }, []);

  const copyValue = async (value: string, field: "order" | "refund") => {
    if (!value || typeof navigator === "undefined" || !navigator.clipboard) return;
    try { await navigator.clipboard.writeText(value); setCopied(field); if (timerRef.current) window.clearTimeout(timerRef.current); timerRef.current = window.setTimeout(() => setCopied(null), 1500); } catch { setCopied(null); }
  };

  const refundedTime = order.refunded_at
    ? new Intl.DateTimeFormat(locale === "en" ? "en-US" : "zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: locale === "en" }).format(new Date(order.refunded_at))
    : null;
  const departureDate = formatDateLocalized(order.run_date, fmtLocale);
  const seatAssignment = `${order.coach_no || "--"} ${t("booking.success.coach")} ${order.seat_no || "--"}`;

  return (
    <Card
      variant="outlined"
      sx={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 5,
        borderColor: (th) => `${th.palette.divider}70`,
        opacity: isRefunded ? 0.92 : 1,
        transition: "all 0.3s ease",
        boxShadow: "var(--shadow-xs)",
        "&:hover": { boxShadow: "var(--shadow-sm)" },
      }}
    >
      {isRefunded && (
        <Box sx={{ position: "absolute", right: -44, top: 20, zIndex: 10, transform: "rotate(34deg)", bgcolor: "action.disabledBackground", border: 1, borderColor: "divider", px: 5, py: 0.5, borderRadius: 1 }}>
          <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "text.secondary" }}>
            {locale === "en" ? "Completed" : "已完成"}
          </Typography>
        </Box>
      )}

      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: 1, borderColor: "divider", px: { xs: 2.5, sm: 3 }, height: 44 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
          <Chip label={order.train_no} color="primary" size="small" sx={{ fontWeight: 700, borderRadius: 999 }} />
          {order.train_type && <Chip label={getTrainTypeLabel(order.train_type, fmtLocale)} size="small" variant="outlined" sx={{ borderRadius: 999 }} />}
          <Chip label={isRefunded ? t("trips.status.refunded") : t("trips.status.booked")} size="small" color={isRefunded ? "warning" : "success"} sx={{ borderRadius: 999 }} />
        </Box>
        {order.demo_mode && <Chip label={t("booking.demo.badge")} size="small" variant="outlined" sx={{ borderRadius: 999 }} />}
      </Box>

      <CardContent sx={{ px: { xs: 2.5, sm: 3 }, py: { xs: 2.5, sm: 3 } }}>
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: { xs: 2, lg: 3 } }}>
          <Box>
            <Typography variant="h4" fontWeight={800} sx={{ fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{order.departure_time || "--:--"}</Typography>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mt: 1 }}>{order.from_station}</Typography>
            <Typography variant="caption" color="text.secondary">{departureDate}</Typography>
          </Box>
          <Box sx={{ textAlign: "center" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Box sx={{ height: "1px", flex: 1, bgcolor: "divider" }} />
              <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ letterSpacing: 1 }}>{order.train_no}</Typography>
              <Box sx={{ height: "1px", flex: 1, bgcolor: "divider" }} />
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>{seatAssignment}</Typography>
          </Box>
          <Box sx={{ textAlign: "right" }}>
            <Typography variant="h4" fontWeight={800} sx={{ fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{order.arrival_time || "--:--"}</Typography>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mt: 1 }}>{order.to_station}</Typography>
            <Typography variant="caption" color="text.secondary">{departureDate}</Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 2.5 }} />

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: { xs: 1.5, sm: 3 } }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            <InfoRow label={t("booking.passenger")} value={order.passenger_name} />
            <InfoRow label={t("trips.card.seat")} value={order.seat_label} />
          </Box>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Typography variant="body2" color="text.secondary" sx={{ width: 80, flexShrink: 0 }}>{t("trips.card.amount")}</Typography>
              <Typography variant="h6" fontWeight={800} color="warning.main">{formatPrice(order.fare_amount)}</Typography>
              {isRefunded && <Chip label={locale === "en" ? "Refunded" : "已退回"} size="small" color="warning" sx={{ borderRadius: 999 }} />}
            </Box>
            <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
              <Typography variant="body2" color="text.secondary" sx={{ width: 80, flexShrink: 0, pt: 0.25 }}>{t("booking.orderNo")}</Typography>
              <Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <Typography variant="body2" fontWeight={600}>{order.order_no}</Typography>
                  <IconButton size="small" onClick={() => copyValue(order.order_no, "order")} title={t("common.copy")} sx={{ borderRadius: 2 }}>
                    {copied === "order" ? <Check size={14} style={{ color: "#10B981" }} /> : <Copy size={14} />}
                  </IconButton>
                </Box>
                {isRefunded && refundedTime && <Typography variant="caption" color="text.secondary">{t("trips.card.refundedAt")} · {refundedTime}</Typography>}
              </Box>
            </Box>
          </Box>
        </Box>

        {!isRefunded && (
          <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 3 }}>
            <Button variant="outlined" onClick={() => onRefund(order)} disabled={refunding} startIcon={<Undo2 size={16} />} sx={{ minWidth: { sm: 160 }, borderRadius: 999 }}>
              {refunding ? t("trips.refund.processing") : t("trips.refund.action")}
            </Button>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
      <Typography variant="body2" color="text.secondary" sx={{ width: 80, flexShrink: 0 }}>{label}</Typography>
      <Typography variant="body2" fontWeight={600}>{value}</Typography>
    </Box>
  );
}
