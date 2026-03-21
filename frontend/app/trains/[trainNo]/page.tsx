"use client";

import { useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Clock, Calendar, Sparkles } from "lucide-react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import Skeleton from "@mui/material/Skeleton";
import Alert from "@mui/material/Alert";
import { TrainTimeline } from "@/components/tickets/TrainTimeline";
import { SeatPurchaseDialog } from "@/components/tickets/SeatPurchaseDialog";
import { purchaseTicket } from "@/services/ticketing";
import type { TicketOrder } from "@/types/ticketing";
import { useChatStore } from "@/store/chatStore";
import { useTrainSchedule, useTrainPrices, useTicketingCapabilities } from "@/hooks/queries/useTrainDetail";
import { formatPrice, getFareLabel, getTrainTypeLabel, getTrainTypeColor } from "@/utils/format";
import { formatDateLocalized, getToday } from "@/utils/date";
import { cn } from "@/utils/cn";
import { useI18n } from "@/lib/i18n/i18n";

export default function TrainDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const trainNo = params.trainNo as string;
  const date = searchParams.get("date") || getToday();
  const fromStation = searchParams.get("from");
  const toStation = searchParams.get("to");
  const returnTo = searchParams.get("returnTo");
  const { t, locale } = useI18n();
  const dateLocale = locale === "en" ? "en" : "zh-CN";
  const userId = useChatStore((s) => s.userId);

  const scheduleQuery = useTrainSchedule(trainNo, date, fromStation, toStation);
  const pricesQuery = useTrainPrices(trainNo, date, fromStation, toStation);
  const capQuery = useTicketingCapabilities();

  const stops = scheduleQuery.data?.stops ?? [];
  const loading = scheduleQuery.isLoading;
  const scheduleError = scheduleQuery.error
    ? (scheduleQuery.error instanceof Error ? scheduleQuery.error.message : t("common.loadFailed"))
    : null;
  const prices = pricesQuery.data?.prices ?? null;
  const pricesLoading = pricesQuery.isLoading;
  const priceMeta = pricesQuery.data
    ? { logged_in: pricesQuery.data.logged_in, requires_login: pricesQuery.data.requires_login, source: pricesQuery.data.source }
    : null;
  const demoMode = capQuery.data?.demo_mode ?? true;
  const boundAccount = capQuery.data?.bound_account_username ?? null;

  const [selectedSeat, setSelectedSeat] = useState<{ key: string; label: string; price: number } | null>(null);
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [purchasedOrder, setPurchasedOrder] = useState<TicketOrder | null>(null);
  const [error, setError] = useState<string | null>(null);

  const trainType = trainNo.charAt(0);
  const trainTypeLabel = getTrainTypeLabel(trainType, dateLocale);
  const originStop = stops.length > 0 ? stops[0] : null;
  const terminalStop = stops.length > 1 ? stops[stops.length - 1] : null;
  const totalStops = stops.length;

  const seatCards = [
    { key: "business_seat", label: locale === "en" ? "Business" : "商务/特等座" },
    { key: "first_seat", label: getFareLabel("price_first_seat", dateLocale) },
    { key: "second_seat", label: getFareLabel("price_second_seat", dateLocale) },
    { key: "soft_sleeper", label: getFareLabel("price_soft_sleeper", dateLocale) },
    { key: "hard_sleeper", label: getFareLabel("price_hard_sleeper", dateLocale) },
    { key: "hard_seat", label: getFareLabel("price_hard_seat", dateLocale) },
    { key: "no_seat", label: getFareLabel("price_no_seat", dateLocale) },
  ].map((item) => ({ ...item, price: (prices as Record<string, number | null | undefined> | null)?.[item.key] ?? null }))
    .filter((item): item is { key: string; label: string; price: number } => item.price != null);

  const handleBack = () => {
    if (returnTo && returnTo.startsWith("/")) { router.push(returnTo); return; }
    if (typeof window !== "undefined" && window.history.length > 1) { router.back(); return; }
    router.push("/");
  };

  const handleSeatSelect = (seat: { key: string; label: string; price: number }) => {
    setSelectedSeat(seat); setPurchasedOrder(null); setPurchaseOpen(true);
  };

  const handleConfirmPurchase = async () => {
    if (!selectedSeat || !fromStation || !toStation) return;
    setPurchasing(true);
    try {
      const order = await purchaseTicket({
        user_id: userId, train_no: trainNo, train_type: trainType, run_date: date,
        from_station: fromStation, to_station: toStation,
        departure_time: originStop?.departure_time || undefined, arrival_time: terminalStop?.arrival_time || undefined,
        seat_type: selectedSeat.key, seat_label: selectedSeat.label, seat_code: selectedSeat.key, fare_amount: selectedSeat.price,
      });
      setPurchasedOrder(order);
    } catch (err) { setError(err instanceof Error ? err.message : t("errors.requestFailed")); } finally { setPurchasing(false); }
  };

  const displayError = error || scheduleError;

  return (
    <Box sx={{ mx: "auto", width: "100%", maxWidth: "72rem", display: "flex", flexDirection: "column", gap: 2.5, overflowY: "auto", px: { xs: 2, sm: 3, lg: 4 }, py: 2.5 }}>
      <Button variant="outlined" size="small" onClick={handleBack} startIcon={<ArrowLeft size={16} />} sx={{ alignSelf: "flex-start", borderRadius: "8px" }}>
        {t("train.backToSearch")}
      </Button>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Card variant="outlined" sx={{ borderRadius: "16px", borderColor: (th) => `${th.palette.divider}70`, boxShadow: "var(--shadow-card)", "&:hover": { boxShadow: "var(--shadow-card-hover)" } }}>
          <CardContent sx={{ pt: 3, pb: 2.5 }}>
            <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1.5, mb: 2.5 }}>
              <span className={cn("inline-flex items-center rounded-lg px-3 py-1.5 text-base font-bold text-white shadow-sm", getTrainTypeColor(trainType))}>{trainNo}</span>
              <Chip label={trainTypeLabel} variant="outlined" size="small" sx={{ borderRadius: "8px" }} />
              <Box sx={{ ml: "auto", display: "flex", alignItems: "center", gap: 0.75, color: "text.secondary" }}>
                <Calendar size={14} /><Typography variant="caption">{formatDateLocalized(date, dateLocale)}</Typography>
              </Box>
            </Box>

            {(fromStation && toStation) || (originStop && terminalStop) ? (
              <Box sx={{ display: "grid", gridTemplateColumns: { md: "1fr auto 1fr" }, alignItems: "center", gap: 2, borderRadius: "12px", bgcolor: (th: any) => `${th.palette.action.hover}60`, px: 3, py: 3 }}>
                <Box sx={{ textAlign: "center" }}>
                  <Typography variant="h6" fontWeight={700}>{fromStation || originStop?.station_name}</Typography>
                  {originStop && <Typography variant="body2" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>{originStop.departure_time !== "--" ? originStop.departure_time : ""}</Typography>}
                </Box>
                <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.5 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, width: "100%" }}>
                    <Box sx={{ height: "1px", flex: 1, bgcolor: "divider" }} />
                    <ArrowRight size={14} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
                    <Box sx={{ height: "1px", flex: 1, bgcolor: "divider" }} />
                  </Box>
                  {totalStops > 0 && <Typography variant="caption" color="text.secondary">{locale === "en" ? `${totalStops} stops` : `共${totalStops}站`}</Typography>}
                </Box>
                <Box sx={{ textAlign: "center" }}>
                  <Typography variant="h6" fontWeight={700}>{toStation || terminalStop?.station_name}</Typography>
                  {terminalStop && <Typography variant="body2" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>{terminalStop.arrival_time !== "--" ? terminalStop.arrival_time : ""}</Typography>}
                </Box>
              </Box>
            ) : null}
          </CardContent>
        </Card>
      </motion.div>

      {fromStation && toStation && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
          <Card variant="outlined" sx={{ borderRadius: "16px", borderColor: (th) => `${th.palette.divider}70`, boxShadow: "var(--shadow-card)", "&:hover": { boxShadow: "var(--shadow-card-hover)" } }}>
            <CardContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 2.5 }}>
              <Typography variant="subtitle2" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <span>¥</span>{t("train.price.title")}
              </Typography>
              <Alert severity="info" variant="outlined" icon={<Sparkles size={16} />} sx={{ py: 0.5, borderRadius: "12px" }}>{t("booking.detailHint")}</Alert>
              {pricesLoading ? (
                <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 1.5 }}>
                  {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} variant="rounded" height={96} sx={{ borderRadius: "12px" }} />)}
                </Box>
              ) : prices && Object.values(prices).some((v) => v != null) ? (
                <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 1.5 }}>
                  {seatCards.map(({ key, label, price }) => (
                    <Card
                      key={key}
                      variant="outlined"
                      sx={{
                        borderRadius: "12px",
                        borderColor: (th) => `${th.palette.divider}60`,
                        transition: "all 0.2s ease",
                        "&:hover": {
                          borderColor: "primary.main",
                          boxShadow: "var(--shadow-card-hover)",
                          transform: "translateY(-2px)",
                        },
                      }}
                    >
                      <Button onClick={() => handleSeatSelect({ key, label, price })} sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 0.75, minHeight: 100, width: "100%", textTransform: "none", borderRadius: "12px" }}>
                        <Typography variant="caption" color="text.secondary" noWrap>{label}</Typography>
                        <Typography variant="h6" fontWeight={800} sx={{ fontVariantNumeric: "tabular-nums" }}>{formatPrice(price)}</Typography>
                        <Typography variant="caption" color="primary" fontWeight={600}>{t("booking.selectSeat")}</Typography>
                      </Button>
                    </Card>
                  ))}
                </Box>
              ) : (
                <Box sx={{ textAlign: "center", py: 3 }}>
                  <Typography variant="body2" color="text.secondary">{t("train.price.unavailable")}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>{priceMeta?.requires_login ? t("train.price.needLogin") : t("train.price.partial")}</Typography>
                  <Box sx={{ display: "flex", justifyContent: "center", gap: 1, mt: 2 }}>
                    {priceMeta?.requires_login && <Button variant="contained" size="small" onClick={() => router.push("/settings")} sx={{ borderRadius: "8px" }}>{t("train.price.goLogin")}</Button>}
                    <Button variant="outlined" size="small" onClick={() => window.location.reload()} sx={{ borderRadius: "8px" }}>{t("train.price.retry")}</Button>
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card variant="outlined" sx={{ borderRadius: "16px", borderColor: (th) => `${th.palette.divider}70`, boxShadow: "var(--shadow-card)", "&:hover": { boxShadow: "var(--shadow-card-hover)" } }}>
          <CardHeader title={<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}><Clock size={16} style={{ color: "var(--primary)" }} /><Typography variant="subtitle2">{t("train.schedule")}</Typography></Box>} />
          <CardContent>
            {loading ? (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} variant="text" />)}</Box>
            ) : displayError ? (
              <Box sx={{ textAlign: "center", py: 4 }}>
                <Typography variant="body2" color="error">{displayError}</Typography>
                <Button variant="outlined" size="small" onClick={() => scheduleQuery.refetch()} sx={{ mt: 1.5, borderRadius: "8px" }}>{t("common.retry")}</Button>
              </Box>
            ) : stops.length > 0 ? (
              <TrainTimeline stops={stops} highlightFrom={fromStation} highlightTo={toStation} />
            ) : (
              <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>{t("train.noSchedule")}</Typography>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <SeatPurchaseDialog
        open={purchaseOpen} seat={selectedSeat} trainNo={trainNo} trainTypeLabel={trainTypeLabel} runDate={date}
        fromStation={fromStation || originStop?.station_name || ""} toStation={toStation || terminalStop?.station_name || ""}
        departureTime={originStop?.departure_time} arrivalTime={terminalStop?.arrival_time} durationMinutes={null}
        demoMode={demoMode} loginBound={Boolean(pricesQuery.data?.logged_in || boundAccount)} accountUsername={boundAccount}
        purchasing={purchasing} purchasedOrder={purchasedOrder} onConfirm={handleConfirmPurchase}
        onClose={() => { if (!purchasing) { setPurchaseOpen(false); setSelectedSeat(null); setPurchasedOrder(null); } }}
        onViewTrips={() => router.push("/trips")}
      />
    </Box>
  );
}
