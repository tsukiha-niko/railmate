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
import { alpha, type Theme } from "@mui/material/styles";
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
import { arrivalCalendarDayOffset, segmentDurationByStops } from "@/utils/trainCrossDay";
import { cn } from "@/utils/cn";
import { useI18n } from "@/lib/i18n/i18n";

function seatCardAccent(key: string, th: Theme) {
  const p = th.palette;
  const edge = alpha(p.text.primary, p.mode === "dark" ? 0.14 : 0.1);
  const subtle = (tint: string) => ({
    bg: alpha(tint, p.mode === "dark" ? 0.05 : 0.035),
    border: edge,
    bar: alpha(tint, 0.28),
    price: p.text.primary,
  });
  switch (key) {
    case "business_seat":
      return subtle(p.warning.main);
    case "first_seat":
      return subtle(p.primary.main);
    case "second_seat":
      return subtle(p.success.main);
    case "soft_sleeper":
      return subtle(p.secondary.main);
    case "hard_sleeper":
      return subtle(p.error.main);
    case "hard_seat":
      return subtle(p.info.main);
    case "no_seat": {
      const g = p.text.secondary;
      return {
        bg: alpha(p.text.primary, p.mode === "dark" ? 0.035 : 0.025),
        border: edge,
        bar: alpha(g, 0.22),
        price: p.text.primary,
      };
    }
    default:
      return subtle(p.primary.main);
  }
}

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

  const routeFromName = fromStation || originStop?.station_name || "";
  const routeToName = toStation || terminalStop?.station_name || "";
  const fromStopDetail = routeFromName ? stops.find((s) => s.station_name === routeFromName) : undefined;
  const toStopDetail = routeToName ? stops.find((s) => s.station_name === routeToName) : undefined;
  const routeDepTime =
    fromStopDetail?.departure_time && fromStopDetail.departure_time !== "--"
      ? fromStopDetail.departure_time
      : fromStopDetail?.arrival_time ?? null;
  const routeArrTime =
    toStopDetail?.arrival_time && toStopDetail.arrival_time !== "--"
      ? toStopDetail.arrival_time
      : toStopDetail?.departure_time ?? null;
  const segmentMinutes =
    routeFromName && routeToName ? segmentDurationByStops(stops, routeFromName, routeToName) : null;
  const arrivalDayOffset =
    routeFromName && routeToName
      ? arrivalCalendarDayOffset(routeDepTime, routeArrTime, segmentMinutes)
      : 0;
  const displayArrivalTime =
    routeArrTime && routeArrTime !== "--"
      ? routeArrTime
      : terminalStop?.arrival_time && terminalStop.arrival_time !== "--"
        ? terminalStop.arrival_time
        : "";

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
        <Card variant="outlined" sx={{ borderRadius: "12px", borderColor: (th) => `${th.palette.divider}70`, boxShadow: "var(--shadow-card)", "&:hover": { boxShadow: "var(--shadow-card-hover)" } }}>
          <CardContent sx={{ pt: 3, pb: 2.5 }}>
            <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1.5, mb: 2.5 }}>
              <span className={cn("inline-flex items-center rounded-lg px-3 py-1.5 text-base font-bold text-white shadow-sm", getTrainTypeColor(trainType))}>{trainNo}</span>
              <Chip label={trainTypeLabel} variant="outlined" size="small" sx={{ borderRadius: "8px" }} />
              <Box sx={{ ml: "auto", display: "flex", alignItems: "center", gap: 0.75, color: "text.secondary" }}>
                <Calendar size={14} /><Typography variant="caption">{formatDateLocalized(date, dateLocale)}</Typography>
              </Box>
            </Box>

            {(fromStation && toStation) || (originStop && terminalStop) ? (
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 1fr)",
                  alignItems: "center",
                  gap: { xs: 0.75, sm: 1.75, md: 2.25 },
                  borderRadius: "12px",
                  bgcolor: (th: any) => `${th.palette.action.hover}60`,
                  px: { xs: 1.25, sm: 3 },
                  py: { xs: 2.25, sm: 3.25 },
                }}
              >
                <Box sx={{ textAlign: "center", minWidth: 0 }}>
                  <Typography
                    variant="h5"
                    fontWeight={800}
                    sx={{
                      fontSize: { xs: "1.05rem", sm: "1.55rem" },
                      letterSpacing: "-0.03em",
                      lineHeight: 1.25,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {fromStation || originStop?.station_name}
                  </Typography>
                  {originStop ? (
                    <Typography
                      component="div"
                      color="text.secondary"
                      sx={{
                        mt: 0.75,
                        fontVariantNumeric: "tabular-nums",
                        fontWeight: 700,
                        fontSize: { xs: "1.05rem", sm: "1.35rem" },
                        letterSpacing: "-0.02em",
                        lineHeight: 1.2,
                      }}
                    >
                      {originStop.departure_time !== "--" ? originStop.departure_time : ""}
                    </Typography>
                  ) : null}
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 0.5,
                    flexShrink: 0,
                    width: { xs: 88, sm: 120 },
                    maxWidth: { xs: 88, sm: 140 },
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 0.35, sm: 0.75 }, width: "100%" }}>
                    <Box sx={{ height: 2, flex: 1, borderRadius: 1, bgcolor: "divider", minWidth: 0 }} />
                    <ArrowRight size={20} strokeWidth={2.25} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
                    <Box sx={{ height: 2, flex: 1, borderRadius: 1, bgcolor: "divider", minWidth: 0 }} />
                  </Box>
                  {totalStops > 0 ? (
                    <Typography
                      variant="body1"
                      color="text.secondary"
                      sx={{
                        fontWeight: 700,
                        fontSize: { xs: "0.78rem", sm: "1.05rem" },
                        letterSpacing: "0.02em",
                        whiteSpace: "nowrap",
                        maxWidth: "100%",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {locale === "en" ? `${totalStops} stops` : `共${totalStops}站`}
                    </Typography>
                  ) : null}
                </Box>
                <Box sx={{ textAlign: "center", minWidth: 0 }}>
                  <Typography
                    variant="h5"
                    fontWeight={800}
                    sx={{
                      fontSize: { xs: "1.05rem", sm: "1.55rem" },
                      letterSpacing: "-0.03em",
                      lineHeight: 1.25,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {toStation || terminalStop?.station_name}
                  </Typography>
                  {displayArrivalTime ? (
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: { xs: 0.5, sm: 0.75 },
                        flexWrap: "nowrap",
                        mt: 0.75,
                        minWidth: 0,
                      }}
                    >
                      <Typography
                        component="span"
                        color="text.secondary"
                        sx={{
                          fontVariantNumeric: "tabular-nums",
                          fontWeight: 700,
                          fontSize: { xs: "1.05rem", sm: "1.35rem" },
                          letterSpacing: "-0.02em",
                          flexShrink: 0,
                        }}
                      >
                        {displayArrivalTime}
                      </Typography>
                      {arrivalDayOffset >= 1 ? (
                        <Chip
                          size="small"
                          label={arrivalDayOffset === 1 ? t("train.arrivalNextDay") : t("train.arrivalPlusDays", { n: arrivalDayOffset })}
                          sx={(th) => ({
                            height: 24,
                            maxWidth: "100%",
                            fontWeight: 700,
                            fontSize: { xs: "0.65rem", sm: "0.78rem" },
                            borderRadius: "8px",
                            bgcolor: alpha(th.palette.primary.main, 0.14),
                            color: "primary.main",
                            border: `1px solid ${alpha(th.palette.primary.main, 0.28)}`,
                          })}
                        />
                      ) : null}
                    </Box>
                  ) : null}
                </Box>
              </Box>
            ) : null}
          </CardContent>
        </Card>
      </motion.div>

      {fromStation && toStation && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
          <Card variant="outlined" sx={{ borderRadius: "12px", borderColor: (th) => `${th.palette.divider}70`, boxShadow: "var(--shadow-card)", "&:hover": { boxShadow: "var(--shadow-card-hover)" } }}>
            <CardContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 2.5 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 36,
                    height: 36,
                    borderRadius: "10px",
                    bgcolor: (th) => alpha(th.palette.primary.main, 0.12),
                    color: "primary.main",
                    fontWeight: 800,
                    fontSize: "0.95rem",
                  }}
                >
                  ¥
                </Box>
                <Typography variant="subtitle1" fontWeight={800} sx={{ letterSpacing: "-0.02em", color: "text.primary" }}>
                  {t("train.price.title")}
                </Typography>
              </Box>
              <Alert
                severity="info"
                variant="outlined"
                icon={<Sparkles size={17} strokeWidth={2.25} />}
                sx={(th) => ({
                  py: 1,
                  borderRadius: "12px",
                  borderColor: alpha(th.palette.info.main, 0.45),
                  bgcolor: alpha(th.palette.info.main, 0.08),
                  color: "text.primary",
                  "& .MuiAlert-icon": { color: "info.main" },
                })}
              >
                {t("booking.detailHint")}
              </Alert>
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
                      sx={(th) => {
                        const a = seatCardAccent(key, th);
                        const hoverShadow = `0 2px 10px ${alpha(a.bar, th.palette.mode === "dark" ? 0.12 : 0.08)}`;
                        return {
                          borderRadius: "12px",
                          overflow: "hidden",
                          borderColor: a.border,
                          bgcolor: a.bg,
                          transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                          boxShadow: "none",
                          "&:hover": {
                            borderColor: alpha(a.bar, 0.45),
                            boxShadow: hoverShadow,
                          },
                        };
                      }}
                    >
                      <Button
                        onClick={() => handleSeatSelect({ key, label, price })}
                        sx={(th) => {
                          const a = seatCardAccent(key, th);
                          return {
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 0.75,
                            minHeight: 96,
                            width: "100%",
                            textTransform: "none",
                            borderRadius: "12px",
                            position: "relative",
                            px: 1.75,
                            py: 1.35,
                            "&::before": {
                              content: '""',
                              position: "absolute",
                              left: 0,
                              top: 14,
                              bottom: 14,
                              width: 3,
                              borderRadius: "0 3px 3px 0",
                              bgcolor: a.bar,
                            },
                          };
                        }}
                      >
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          noWrap
                          sx={{ fontWeight: 650, maxWidth: "100%", fontSize: { xs: "0.9rem", sm: "0.95rem" } }}
                        >
                          {label}
                        </Typography>
                        <Typography
                          variant="h5"
                          fontWeight={800}
                          sx={{
                            fontVariantNumeric: "tabular-nums",
                            color: "text.primary",
                            letterSpacing: "-0.03em",
                            fontSize: { xs: "1.35rem", sm: "1.5rem" },
                            lineHeight: 1.15,
                          }}
                        >
                          {formatPrice(price)}
                        </Typography>
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
        <Card variant="outlined" sx={{ borderRadius: "12px", borderColor: (th) => `${th.palette.divider}70`, boxShadow: "var(--shadow-card)", "&:hover": { boxShadow: "var(--shadow-card-hover)" } }}>
          <CardHeader
            title={
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 36,
                    height: 36,
                    borderRadius: "10px",
                    bgcolor: (th) => `${th.palette.primary.main}14`,
                    color: "primary.main",
                  }}
                >
                  <Clock size={18} strokeWidth={2.25} />
                </Box>
                <Typography variant="subtitle1" fontWeight={700} sx={{ letterSpacing: "-0.02em" }}>
                  {t("train.schedule")}
                </Typography>
              </Box>
            }
            sx={{ pb: 0, "& .MuiCardHeader-content": { overflow: "visible" } }}
          />
          <CardContent sx={{ pt: 2 }}>
            {loading ? (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} variant="rounded" height={72} sx={{ borderRadius: "12px" }} />
                ))}
              </Box>
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
