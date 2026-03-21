"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Copy, Undo2, Check, ArrowRight, ScanLine, X, Bell, BellOff } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import Card from "@mui/material/Card";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import Alert from "@mui/material/Alert";
import { useQueryClient } from "@tanstack/react-query";
import { useCheckInTicketDirect } from "@/hooks/queries/useTrips";
import type { TicketOrder, TravelPhase } from "@/types/ticketing";
import { resolveTravelPhase } from "@/utils/tripPhase";
import { formatDateLocalized } from "@/utils/date";
import { formatPrice, getTrainTypeLabel } from "@/utils/format";
import { useI18n } from "@/lib/i18n/i18n";
import { useReminderStore } from "@/store/reminderStore";
import { darkDialogHeaderClose, darkElevatedStrip, gateDialogPaper } from "@/lib/theme/muiDarkSurfaces";

function phaseOf(order: TicketOrder): TravelPhase {
  return resolveTravelPhase(order);
}

function statusChipLabel(phase: TravelPhase, t: (k: string) => string) {
  if (phase === "refunded") return t("trips.status.refunded");
  if (phase === "checked_in") return t("trips.status.checkedIn");
  if (phase === "expired") return t("trips.status.expired");
  return t("trips.status.booked");
}

interface TripCardProps { order: TicketOrder; refunding: boolean; onRefund: (order: TicketOrder) => void; }

export function TripCard({ order, refunding, onRefund }: TripCardProps) {
  const { locale, t } = useI18n();
  const fmtLocale = locale === "en" ? "en" : "zh-CN";
  const phase = phaseOf(order);
  const isRefunded = order.status === "refunded";
  const [copied, setCopied] = useState<"order" | "refund" | null>(null);
  const [gateOpen, setGateOpen] = useState(false);
  const timerRef = useRef<number | null>(null);
  const existingReminder = useReminderStore((s) => s.getReminderByOrder(order.id));
  const addReminder = useReminderStore((s) => s.addReminder);
  const removeReminder = useReminderStore((s) => s.removeReminder);
  const queryClient = useQueryClient();
  const checkInDirect = useCheckInTicketDirect();

  /** 弹窗打开且仍为待出行：轮询列表，以便他人扫码检票后本页同步为已检票 */
  useEffect(() => {
    if (!gateOpen || phase !== "booked") return;
    const id = window.setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
    }, 2500);
    return () => window.clearInterval(id);
  }, [gateOpen, phase, queryClient]);

  const handleToggleReminder = () => {
    if (existingReminder) {
      removeReminder(existingReminder.id);
    } else {
      addReminder({
        orderId: order.id,
        trainNo: order.train_no,
        fromStation: order.from_station,
        toStation: order.to_station,
        departureTime: order.departure_time || "00:00",
        runDate: order.run_date,
        minutesBefore: 30,
        enabled: true,
      });
    }
  };

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

  const checkInUrl = useMemo(
    () =>
      typeof window === "undefined"
        ? ""
        : `${window.location.origin}/api/v1/tickets/check-in/public/${encodeURIComponent(order.order_no)}`,
    [order.order_no],
  );

  const borderLeftColor =
    phase === "refunded" ? "warning.main"
    : phase === "expired" ? "error.main"
    : phase === "checked_in" ? "info.main"
    : "success.main";

  const statusChipColor =
    phase === "refunded" ? "warning"
    : phase === "expired" ? "error"
    : phase === "checked_in" ? "info"
    : "success";

  const checkedInFmt = order.checked_in_at
    ? new Intl.DateTimeFormat(locale === "en" ? "en-US" : "zh-CN", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: locale === "en",
    }).format(new Date(order.checked_in_at))
    : null;

  const canOpenVoucher = !isRefunded && phase !== "refunded";
  const canRefund = !isRefunded && phase !== "checked_in";

  return (
    <Card
      variant="outlined"
      sx={{
        position: "relative",
        overflow: "hidden",
        borderRadius: "12px",
        borderLeft: 3,
        borderLeftColor,
        opacity: isRefunded ? 0.88 : 1,
        boxShadow: "var(--shadow-card)",
        transition: "all 0.22s ease",
        "&:hover": { boxShadow: "var(--shadow-card-hover)", transform: "translateY(-1px)" },
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, px: 2, pt: 1.5, pb: 0.75 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, minWidth: 0, flexWrap: "wrap" }}>
          <Chip label={order.train_no} color="primary" size="small" sx={{ fontWeight: 700, height: 24 }} />
          {order.train_type && <Typography variant="caption" color="text.secondary">{getTrainTypeLabel(order.train_type, fmtLocale)}</Typography>}
          <Chip label={statusChipLabel(phase, t)} size="small" color={statusChipColor} sx={{ height: 22, fontSize: "0.6rem" }} />
          {order.demo_mode && <Chip label="Demo" size="small" variant="outlined" sx={{ height: 22, fontSize: "0.6rem" }} />}
        </Box>
        <Typography variant="subtitle2" fontWeight={800} color="warning.main" sx={{ fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
          {formatPrice(order.fare_amount)}
        </Typography>
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: "auto 1fr auto", alignItems: "center", gap: 1.5, px: 2, py: 1 }}>
        <Box sx={{ minWidth: 56 }}>
          <Typography variant="h6" fontWeight={800} sx={{ fontVariantNumeric: "tabular-nums", lineHeight: 1.15, fontSize: "1.125rem", letterSpacing: "-0.01em" }}>{order.departure_time || "--:--"}</Typography>
          <Typography variant="caption" color="text.secondary" noWrap sx={{ mt: 0.25, display: "block" }}>{order.from_station}</Typography>
        </Box>
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.25 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.6rem", whiteSpace: "nowrap", fontWeight: 600 }}>{seatInfo}</Typography>
          <Box sx={{ display: "flex", alignItems: "center", width: "100%" }}>
            <Box sx={{ flex: 1, height: "1px", bgcolor: "divider", borderRadius: 1 }} />
            <ArrowRight size={12} style={{ opacity: 0.4, flexShrink: 0 }} />
          </Box>
        </Box>
        <Box sx={{ minWidth: 56, textAlign: "right" }}>
          <Typography variant="h6" fontWeight={800} sx={{ fontVariantNumeric: "tabular-nums", lineHeight: 1.15, fontSize: "1.125rem", letterSpacing: "-0.01em" }}>{order.arrival_time || "--:--"}</Typography>
          <Typography variant="caption" color="text.secondary" noWrap sx={{ mt: 0.25, display: "block" }}>{order.to_station}</Typography>
        </Box>
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, px: 2, pb: 1.5, pt: 0.75, flexWrap: "wrap" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap", minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary">{departureDate}</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ opacity: 0.5 }}>·</Typography>
          <Typography variant="caption" color="text.secondary">{order.passenger_name}</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ opacity: 0.5 }}>·</Typography>
          <Typography variant="caption" color="text.secondary">{order.seat_label}</Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace", fontSize: "0.6rem" }}>{order.order_no}</Typography>
            <IconButton size="small" onClick={() => copyValue(order.order_no, "order")} sx={{ p: 0.25 }}>
              {copied === "order" ? <Check size={11} style={{ color: "var(--success)" }} /> : <Copy size={11} />}
            </IconButton>
          </Box>
        </Box>
        {!isRefunded && (
          <Box sx={{ display: "flex", gap: 0.75, flexShrink: 0, flexWrap: "wrap" }}>
            <IconButton
              size="small"
              onClick={handleToggleReminder}
              sx={{
                borderRadius: "10px",
                border: 1,
                borderColor: existingReminder ? "primary.main" : "divider",
                bgcolor: existingReminder ? (th: any) => `${th.palette.primary.main}0A` : "transparent",
                width: 30,
                height: 30,
              }}
              title={existingReminder ? t("trips.reminder.off") : t("trips.reminder.on")}
            >
              {existingReminder ? <Bell size={14} style={{ color: "var(--primary)" }} /> : <BellOff size={14} />}
            </IconButton>
            {canRefund ? (
              <Button variant="outlined" size="small" onClick={() => onRefund(order)} disabled={refunding} startIcon={<Undo2 size={13} />}
                sx={{ borderRadius: "10px", fontSize: "0.75rem", py: 0.25, px: 1.5, minHeight: 30 }}>
                {refunding ? t("trips.refund.processing") : t("trips.refund.action")}
              </Button>
            ) : null}
            {canOpenVoucher ? (
              <Button
                variant={phase === "booked" ? "contained" : "outlined"}
                size="small"
                onClick={() => setGateOpen(true)}
                startIcon={<ScanLine size={13} />}
                sx={{ borderRadius: "10px", fontSize: "0.75rem", py: 0.25, px: 1.5, minHeight: 30 }}
              >
                {phase === "booked" ? t("trips.gate.action") : t("trips.gate.viewVoucher")}
              </Button>
            ) : null}
          </Box>
        )}
      </Box>

      <Dialog open={gateOpen} onClose={() => setGateOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: (th) => gateDialogPaper(th) }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 2.5, pt: 2, pb: 0.5 }}>
          <Typography variant="subtitle1" fontWeight={700}>{t("trips.gate.title")}</Typography>
          <IconButton size="small" onClick={() => setGateOpen(false)} sx={(th) => darkDialogHeaderClose(th)}>
            <X size={16} />
          </IconButton>
        </Box>
        <DialogContent sx={{ px: 2.5, pb: 2.5, pt: 1 }}>
          {phase === "checked_in" && order.checked_in_at && checkedInFmt ? (
            <Alert severity="success" variant="outlined" sx={(th) => ({
              mb: 2,
              borderRadius: "12px",
              ...(th.palette.mode === "dark" ? {
                borderColor: `${th.palette.success.main}55`,
                bgcolor: `${th.palette.success.main}14`,
              } : {}),
            })}
            >
              {t("trips.gate.scanOk")}（{t("trips.gate.checkedInAt")} {checkedInFmt}）
            </Alert>
          ) : null}

          {phase === "expired" ? (
            <Alert severity="warning" variant="outlined" sx={{ mb: 2, borderRadius: "12px" }}>
              {t("trips.gate.expiredHint")}
            </Alert>
          ) : null}

          {(phase === "booked" || phase === "checked_in" || phase === "expired") ? (
            <>
              <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", mb: 2.5, opacity: phase === "booked" ? 1 : 0.85 }}>
                <Box sx={{ position: "relative" }}>
                  <Box sx={{
                    p: 2,
                    borderRadius: "12px",
                    bgcolor: "#fff",
                    border: 2,
                    borderColor: "primary.main",
                    display: "inline-flex",
                    boxShadow: (th) => `0 4px 24px -4px ${th.palette.primary.main}20`,
                  }}>
                    <QRCodeSVG value={checkInUrl || order.order_no} size={220} level="M" />
                  </Box>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, fontFamily: "monospace", letterSpacing: 1.5, fontWeight: 600 }}>
                  {order.order_no}
                </Typography>
              </Box>

              <Box sx={(th) => ({
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 1,
                px: 2,
                py: 1.5,
                borderRadius: "12px",
                ...darkElevatedStrip(th),
              })}
              >
                <Box sx={{ textAlign: "center" }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.6rem", display: "block" }}>{order.from_station}</Typography>
                  <Typography variant="subtitle2" fontWeight={800} sx={{ fontVariantNumeric: "tabular-nums" }}>{order.departure_time}</Typography>
                </Box>
                <Box sx={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
                  <Chip label={order.train_no} size="small" color="primary" sx={{ fontWeight: 700, height: 22, fontSize: "0.65rem" }} />
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

              {phase === "booked" ? (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mt: 2 }}>
                  <Button
                    variant="contained"
                    fullWidth
                    disabled={checkInDirect.isPending}
                    onClick={() => void checkInDirect.mutateAsync(order.id)}
                    sx={{ borderRadius: "10px" }}
                  >
                    {checkInDirect.isPending ? t("trips.gate.scanBusy") : t("trips.gate.checkInNow")}
                  </Button>
                </Box>
              ) : null}
            </>
          ) : null}

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
