"use client";

import { useEffect, useRef, useState } from "react";
import { Copy, Undo2, Check, ArrowRight, ScanLine, X, RefreshCw } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import Card from "@mui/material/Card";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import type { TicketOrder } from "@/types/ticketing";
import { formatDateLocalized } from "@/utils/date";
import { formatPrice, getTrainTypeLabel } from "@/utils/format";
import { useI18n } from "@/lib/i18n/i18n";

function InfoRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.65rem", lineHeight: 1 }}>{label}</Typography>
      <Typography variant="body2" fontWeight={highlight ? 700 : 600} color={highlight ? "primary.main" : "text.primary"} sx={{ mt: 0.25 }}>{value}</Typography>
    </Box>
  );
}

interface TripCardProps { order: TicketOrder; refunding: boolean; onRefund: (order: TicketOrder) => void; }

export function TripCard({ order, refunding, onRefund }: TripCardProps) {
  const { locale, t } = useI18n();
  const fmtLocale = locale === "en" ? "en" : "zh-CN";
  const isRefunded = order.status === "refunded";
  const [copied, setCopied] = useState<"order" | "refund" | null>(null);
  const [gateOpen, setGateOpen] = useState(false);
  const [qrSuffix, setQrSuffix] = useState("");
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
  const seatInfo = `${order.coach_no || "--"}${t("booking.success.coach")} ${order.seat_no || "--"}`;

  return (
    <Card
      variant="outlined"
      sx={{
        position: "relative",
        overflow: "hidden",
        borderRadius: "14px",
        borderLeft: 3,
        borderLeftColor: isRefunded ? "warning.main" : "success.main",
        opacity: isRefunded ? 0.88 : 1,
        boxShadow: "var(--shadow-card)",
        transition: "box-shadow 0.2s",
        "&:hover": { boxShadow: "var(--shadow-card-hover)" },
      }}
    >
      {/* Header: train info + price */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, px: 1.5, pt: 1.25, pb: 0.75 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap", minWidth: 0 }}>
          <Chip label={order.train_no} color="primary" size="small" sx={{ fontWeight: 700, borderRadius: "6px", height: 22 }} />
          {order.train_type && <Typography variant="caption" color="text.secondary">{getTrainTypeLabel(order.train_type, fmtLocale)}</Typography>}
          <Chip label={isRefunded ? t("trips.status.refunded") : t("trips.status.booked")} size="small" color={isRefunded ? "warning" : "success"} sx={{ borderRadius: "6px", height: 20, fontSize: "0.6rem" }} />
          {order.demo_mode && <Chip label="Demo" size="small" variant="outlined" sx={{ borderRadius: "6px", height: 20, fontSize: "0.6rem" }} />}
        </Box>
        <Typography variant="subtitle2" fontWeight={800} color="warning.main" sx={{ fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
          {formatPrice(order.fare_amount)}
        </Typography>
      </Box>

      {/* Route row */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 1.5, py: 0.75 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h6" fontWeight={800} sx={{ fontVariantNumeric: "tabular-nums", lineHeight: 1.1, fontSize: "1.125rem" }}>{order.departure_time || "--:--"}</Typography>
          <Typography variant="caption" color="text.secondary" noWrap>{order.from_station}</Typography>
        </Box>
        <Box sx={{ flex: 1, display: "flex", alignItems: "center", gap: 0.5, minWidth: 40 }}>
          <Box sx={{ flex: 1, height: "1px", bgcolor: "divider" }} />
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.6rem", whiteSpace: "nowrap", fontWeight: 600 }}>{seatInfo}</Typography>
          <ArrowRight size={12} style={{ opacity: 0.4, flexShrink: 0 }} />
        </Box>
        <Box sx={{ minWidth: 0, textAlign: "right" }}>
          <Typography variant="h6" fontWeight={800} sx={{ fontVariantNumeric: "tabular-nums", lineHeight: 1.1, fontSize: "1.125rem" }}>{order.arrival_time || "--:--"}</Typography>
          <Typography variant="caption" color="text.secondary" noWrap>{order.to_station}</Typography>
        </Box>
      </Box>

      {/* Footer */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, px: 1.5, pb: 1.25, pt: 0.5, flexWrap: "wrap" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary">{departureDate}</Typography>
          <Typography variant="caption" color="text.secondary">·</Typography>
          <Typography variant="caption" color="text.secondary">{order.passenger_name}</Typography>
          <Typography variant="caption" color="text.secondary">·</Typography>
          <Typography variant="caption" color="text.secondary">{order.seat_label}</Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace", fontSize: "0.6rem" }}>{order.order_no}</Typography>
            <IconButton size="small" onClick={() => copyValue(order.order_no, "order")} sx={{ p: 0.25 }}>
              {copied === "order" ? <Check size={11} style={{ color: "var(--success)" }} /> : <Copy size={11} />}
            </IconButton>
          </Box>
        </Box>
        {!isRefunded && (
          <Box sx={{ display: "flex", gap: 0.75, flexShrink: 0 }}>
            <Button variant="outlined" size="small" onClick={() => onRefund(order)} disabled={refunding} startIcon={<Undo2 size={13} />}
              sx={{ borderRadius: "8px", fontSize: "0.75rem", py: 0.25, px: 1.5, minHeight: 28 }}>
              {refunding ? t("trips.refund.processing") : t("trips.refund.action")}
            </Button>
            <Button variant="contained" size="small" onClick={() => setGateOpen(true)} startIcon={<ScanLine size={13} />}
              sx={{ borderRadius: "8px", fontSize: "0.75rem", py: 0.25, px: 1.5, minHeight: 28 }}>
              {t("trips.gate.action")}
            </Button>
          </Box>
        )}
      </Box>

      {/* Gate entry dialog */}
      <Dialog open={gateOpen} onClose={() => setGateOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: "16px", overflow: "hidden" } }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 2.5, pt: 2, pb: 0.5 }}>
          <Typography variant="subtitle1" fontWeight={700}>{t("trips.gate.title")}</Typography>
          <IconButton size="small" onClick={() => setGateOpen(false)} sx={{ bgcolor: "action.hover", borderRadius: "8px" }}>
            <X size={16} />
          </IconButton>
        </Box>
        <DialogContent sx={{ px: 2.5, pb: 2.5, pt: 1 }}>
          {/* QR code area */}
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", mb: 2.5 }}>
            <Box sx={{ position: "relative" }}>
              <Box sx={{
                p: 2,
                borderRadius: "14px",
                bgcolor: "#fff",
                border: 2,
                borderColor: "primary.main",
                display: "inline-flex",
                boxShadow: (th) => `0 4px 24px -4px ${th.palette.primary.main}20`,
              }}>
                <QRCodeSVG
                  value={JSON.stringify({
                    order_no: order.order_no,
                    train_no: order.train_no,
                    from: order.from_station,
                    to: order.to_station,
                    date: order.run_date,
                    departure: order.departure_time,
                    arrival: order.arrival_time,
                    passenger: order.passenger_name,
                    seat: seatInfo,
                    v: qrSuffix,
                  })}
                  size={220}
                  level="M"
                />
              </Box>
              <IconButton
                size="small"
                onClick={() => setQrSuffix((s) => s + "1")}
                sx={{
                  position: "absolute",
                  bottom: -6,
                  right: -6,
                  bgcolor: "background.paper",
                  border: 1,
                  borderColor: "divider",
                  borderRadius: "8px",
                  width: 28,
                  height: 28,
                  boxShadow: "var(--shadow-card)",
                  "&:hover": { bgcolor: "action.hover" },
                }}
              >
                <RefreshCw size={13} />
              </IconButton>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, fontFamily: "monospace", letterSpacing: 1.5, fontWeight: 600 }}>
              {order.order_no}
            </Typography>
          </Box>

          {/* Compact info strip */}
          <Box sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
            px: 2,
            py: 1.5,
            borderRadius: "10px",
            bgcolor: "action.hover",
          }}>
            <Box sx={{ textAlign: "center" }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.6rem", display: "block" }}>{order.from_station}</Typography>
              <Typography variant="subtitle2" fontWeight={800} sx={{ fontVariantNumeric: "tabular-nums" }}>{order.departure_time}</Typography>
            </Box>
            <Box sx={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
              <Chip label={order.train_no} size="small" color="primary" sx={{ fontWeight: 700, borderRadius: "6px", height: 20, fontSize: "0.65rem" }} />
              <Box sx={{ display: "flex", alignItems: "center", width: "80%", mt: 0.5 }}>
                <Box sx={{ flex: 1, height: "1px", bgcolor: "divider" }} />
                <ArrowRight size={12} style={{ opacity: 0.35 }} />
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.6rem" }}>{seatInfo}</Typography>
            </Box>
            <Box sx={{ textAlign: "center" }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.6rem", display: "block" }}>{order.to_station}</Typography>
              <Typography variant="subtitle2" fontWeight={800} sx={{ fontVariantNumeric: "tabular-nums" }}>{order.arrival_time}</Typography>
            </Box>
          </Box>

          <Box sx={{ display: "flex", justifyContent: "space-between", mt: 1.5, px: 0.5 }}>
            <Typography variant="caption" color="text.secondary">{departureDate} · {order.passenger_name}</Typography>
            <Typography variant="caption" color="text.secondary">{order.seat_label}</Typography>
          </Box>

          <Typography variant="caption" color="text.secondary" sx={{ display: "block", textAlign: "center", mt: 2, fontSize: "0.7rem", opacity: 0.7 }}>
            {t("trips.gate.hint")}
          </Typography>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
