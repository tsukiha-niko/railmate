"use client";

import { Sparkles, Ticket } from "lucide-react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import type { TicketOrder } from "@/types/ticketing";
import { formatDateLocalized, formatDuration } from "@/utils/date";
import { formatPrice } from "@/utils/format";
import { useI18n } from "@/lib/i18n/i18n";

type SeatSelection = { key: string; label: string; price: number; };

interface SeatPurchaseDialogProps {
  open: boolean; seat: SeatSelection | null; trainNo: string; trainTypeLabel: string; runDate: string;
  fromStation: string; toStation: string; departureTime?: string | null; arrivalTime?: string | null;
  durationMinutes?: number | null; demoMode: boolean; loginBound: boolean; accountUsername?: string | null;
  purchasing: boolean; purchasedOrder: TicketOrder | null;
  onConfirm: () => void; onClose: () => void; onViewTrips: () => void;
}

export function SeatPurchaseDialog({
  open, seat, trainNo, trainTypeLabel, runDate, fromStation, toStation, departureTime, arrivalTime,
  durationMinutes, demoMode, loginBound, accountUsername, purchasing, purchasedOrder, onConfirm, onClose, onViewTrips,
}: SeatPurchaseDialogProps) {
  const { locale, t } = useI18n();
  if (!seat) return null;

  return (
    <Dialog open={open} onClose={purchasing ? undefined : onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: "20px" } }}>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
        {t("booking.dialog.title")}
        {demoMode && <Chip label={t("booking.demo.badge")} size="small" sx={{ borderRadius: "6px" }} />}
      </DialogTitle>

      <DialogContent dividers>
        {purchasedOrder ? (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Alert severity="success" icon={<Ticket size={20} />}>
              <Typography variant="body2" fontWeight={700}>{t("booking.success.title")}</Typography>
              <Typography variant="caption" color="text.secondary">{t("booking.success.desc")}</Typography>
              <Box sx={{ display: "flex", gap: 0.75, mt: 1, flexWrap: "wrap" }}>
                <Chip label={purchasedOrder.booking_reference} size="small" color="success" sx={{ borderRadius: "6px" }} />
                <Chip label={`${purchasedOrder.coach_no ?? "--"} ${t("booking.success.coach")}`} size="small" variant="outlined" sx={{ borderRadius: "6px" }} />
                <Chip label={purchasedOrder.seat_no ?? "--"} size="small" variant="outlined" sx={{ borderRadius: "6px" }} />
              </Box>
            </Alert>
            <Box sx={{ display: "grid", gridTemplateColumns: { sm: "1fr 1fr" }, gap: 1.5 }}>
              <InfoBlock label={t("booking.orderNo")} value={purchasedOrder.order_no} />
              <InfoBlock label={t("booking.passenger")} value={purchasedOrder.passenger_name} />
            </Box>
          </Box>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Box sx={{ borderRadius: "10px", border: 1, borderColor: (th: any) => `${th.palette.divider}70`, p: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                <Chip label={trainTypeLabel} size="small" variant="outlined" sx={{ borderRadius: "6px" }} />
                <Chip label={trainNo} color="primary" size="small" sx={{ fontWeight: 700, borderRadius: "6px" }} />
                <Typography variant="caption" color="text.secondary">{formatDateLocalized(runDate, locale === "en" ? "en" : "zh-CN")}</Typography>
              </Box>
              <Box sx={{ display: "grid", gridTemplateColumns: { sm: "1fr auto 1fr" }, gap: 2, mt: 2, alignItems: "center" }}>
                <Box><Typography variant="subtitle1" fontWeight={700}>{fromStation}</Typography><Typography variant="body2" color="text.secondary">{departureTime || "--:--"}</Typography></Box>
                <Box sx={{ textAlign: "center" }}><Typography variant="body2" color="text.secondary">→</Typography>{durationMinutes != null && <Typography variant="caption" color="text.secondary">{formatDuration(durationMinutes, locale === "en" ? "en" : "zh-CN")}</Typography>}</Box>
                <Box sx={{ textAlign: { sm: "right" } }}><Typography variant="subtitle1" fontWeight={700}>{toStation}</Typography><Typography variant="body2" color="text.secondary">{arrivalTime || "--:--"}</Typography></Box>
              </Box>
            </Box>
            <Box sx={{ display: "grid", gridTemplateColumns: { sm: "1fr 1fr" }, gap: 1.5 }}>
              <InfoBlock label={t("booking.seat")} value={seat.label} />
              <InfoBlock label={t("booking.fare")} value={formatPrice(seat.price)} />
            </Box>
            <Box sx={{ borderRadius: "10px", border: 1, borderColor: (th: any) => `${th.palette.divider}70`, p: 2 }}>
              <Typography variant="body2" fontWeight={600}>{t("booking.account")}</Typography>
              <Typography variant="caption" color="text.secondary">
                {loginBound ? t("booking.account.bound", { username: accountUsername || "--" }) : t("booking.account.unbound")}
              </Typography>
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        {purchasedOrder ? (
          <>
            <Button variant="contained" onClick={onViewTrips} startIcon={<Sparkles size={16} />} fullWidth>{t("booking.success.viewTrips")}</Button>
            <Button variant="outlined" onClick={onClose} fullWidth>{t("common.done")}</Button>
          </>
        ) : (
          <>
            <Button variant="contained" onClick={onConfirm} disabled={purchasing} startIcon={purchasing ? <CircularProgress size={16} /> : <Ticket size={16} />} fullWidth>
              {purchasing ? t("booking.submitting") : t("booking.confirm")}
            </Button>
            <Button variant="outlined" onClick={onClose} disabled={purchasing} fullWidth>{t("common.cancel")}</Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ borderRadius: "10px", border: 1, borderColor: (th: any) => `${th.palette.divider}70`, bgcolor: "action.hover", p: 1.5 }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="body2" fontWeight={600} sx={{ mt: 0.25 }}>{value}</Typography>
    </Box>
  );
}
