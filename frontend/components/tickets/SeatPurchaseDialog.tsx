"use client";

import { Loader2, Sparkles, Ticket, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { TicketOrder } from "@/types/ticketing";
import { formatDateLocalized, formatDuration } from "@/utils/date";
import { formatPrice } from "@/utils/format";
import { useI18n } from "@/lib/i18n/i18n";

type SeatSelection = {
  key: string;
  label: string;
  price: number;
};

interface SeatPurchaseDialogProps {
  open: boolean;
  seat: SeatSelection | null;
  trainNo: string;
  trainTypeLabel: string;
  runDate: string;
  fromStation: string;
  toStation: string;
  departureTime?: string | null;
  arrivalTime?: string | null;
  durationMinutes?: number | null;
  demoMode: boolean;
  loginBound: boolean;
  accountUsername?: string | null;
  purchasing: boolean;
  purchasedOrder: TicketOrder | null;
  onConfirm: () => void;
  onClose: () => void;
  onViewTrips: () => void;
}

export function SeatPurchaseDialog({
  open,
  seat,
  trainNo,
  trainTypeLabel,
  runDate,
  fromStation,
  toStation,
  departureTime,
  arrivalTime,
  durationMinutes,
  demoMode,
  loginBound,
  accountUsername,
  purchasing,
  purchasedOrder,
  onConfirm,
  onClose,
  onViewTrips,
}: SeatPurchaseDialogProps) {
  const { locale, t } = useI18n();

  if (!open || !seat) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-3 backdrop-blur-sm sm:items-center sm:p-6">
      <div className="w-full max-w-lg overflow-hidden rounded-[28px] border border-border/70 bg-card/95 shadow-[0_28px_80px_-32px_rgba(15,23,42,0.65)]">
        <div className="flex items-start justify-between gap-3 border-b border-border/60 bg-gradient-to-br from-primary/[0.10] via-card/95 to-card px-5 py-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold">{t("booking.dialog.title")}</h3>
              {demoMode ? <Badge variant="secondary">{t("booking.demo.badge")}</Badge> : null}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{t("booking.dialog.subtitle")}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary/80 hover:text-foreground"
            aria-label={t("booking.dialog.close")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          {purchasedOrder ? (
            <>
              <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                    <Ticket className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-semibold">{t("booking.success.title")}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{t("booking.success.desc")}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <Badge variant="success">{purchasedOrder.booking_reference}</Badge>
                      <Badge variant="secondary">{`${purchasedOrder.coach_no ?? "--"} ${t("booking.success.coach")}`}</Badge>
                      <Badge variant="secondary">{purchasedOrder.seat_no ?? "--"}</Badge>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <div className="rounded-2xl border border-border/65 bg-muted/35 p-3">
                  <p className="text-xs text-muted-foreground">{t("booking.orderNo")}</p>
                  <p className="mt-1 font-medium">{purchasedOrder.order_no}</p>
                </div>
                <div className="rounded-2xl border border-border/65 bg-muted/35 p-3">
                  <p className="text-xs text-muted-foreground">{t("booking.passenger")}</p>
                  <p className="mt-1 font-medium">{purchasedOrder.passenger_name}</p>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button className="flex-1 gap-2" onClick={onViewTrips}>
                  <Sparkles className="h-4 w-4" />
                  {t("booking.success.viewTrips")}
                </Button>
                <Button variant="outline" className="flex-1" onClick={onClose}>
                  {t("common.done")}
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="rounded-[24px] border border-border/65 bg-gradient-to-br from-card to-muted/30 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{trainTypeLabel}</Badge>
                  <span className="rounded-xl bg-primary px-2.5 py-1 text-sm font-semibold text-primary-foreground">{trainNo}</span>
                  <span className="text-sm text-muted-foreground">{formatDateLocalized(runDate, locale === "en" ? "en" : "zh-CN")}</span>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center">
                  <div>
                    <p className="text-lg font-semibold">{fromStation}</p>
                    <p className="text-sm text-muted-foreground">{departureTime || "--:--"}</p>
                  </div>
                  <div className="text-center text-sm text-muted-foreground">
                    <p>→</p>
                    {durationMinutes != null ? <p>{formatDuration(durationMinutes, locale === "en" ? "en" : "zh-CN")}</p> : null}
                  </div>
                  <div className="sm:text-right">
                    <p className="text-lg font-semibold">{toStation}</p>
                    <p className="text-sm text-muted-foreground">{arrivalTime || "--:--"}</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-2xl border border-border/65 bg-muted/35 p-3">
                  <p className="text-xs text-muted-foreground">{t("booking.seat")}</p>
                  <p className="mt-1 font-medium">{seat.label}</p>
                </div>
                <div className="rounded-2xl border border-border/65 bg-muted/35 p-3">
                  <p className="text-xs text-muted-foreground">{t("booking.fare")}</p>
                  <p className="mt-1 font-medium">{formatPrice(seat.price)}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-border/65 bg-card/60 p-3 text-sm">
                <p className="font-medium">{t("booking.account")}</p>
                <p className="mt-1 text-muted-foreground">
                  {loginBound
                    ? t("booking.account.bound", { username: accountUsername || "--" })
                    : t("booking.account.unbound")}
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button className="flex-1 gap-2" onClick={onConfirm} disabled={purchasing}>
                  {purchasing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ticket className="h-4 w-4" />}
                  {purchasing ? t("booking.submitting") : t("booking.confirm")}
                </Button>
                <Button variant="outline" className="flex-1" onClick={onClose} disabled={purchasing}>
                  {t("common.cancel")}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
