"use client";

import { useEffect, useRef, useState } from "react";
import { Copy, Undo2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { TicketOrder } from "@/types/ticketing";
import { formatDateLocalized } from "@/utils/date";
import { formatPrice, getTrainTypeLabel } from "@/utils/format";
import { useI18n } from "@/lib/i18n/i18n";
import { cn } from "@/utils/cn";

interface TripCardProps {
  order: TicketOrder;
  refunding: boolean;
  onRefund: (order: TicketOrder) => void;
}

export function TripCard({ order, refunding, onRefund }: TripCardProps) {
  const { locale, t } = useI18n();
  const fmtLocale = locale === "en" ? "en" : "zh-CN";
  const isRefunded = order.status === "refunded";
  const [copied, setCopied] = useState<"order" | "refund" | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
  }, []);

  const copyValue = async (value: string, field: "order" | "refund") => {
    if (!value || typeof navigator === "undefined" || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(field);
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setCopied(null), 1500);
    } catch {
      setCopied(null);
    }
  };

  const refundedTime = order.refunded_at
    ? new Intl.DateTimeFormat(locale === "en" ? "en-US" : "zh-CN", {
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: locale === "en",
      }).format(new Date(order.refunded_at))
    : null;

  const departureDate = formatDateLocalized(order.run_date, fmtLocale);
  const seatAssignment = `${order.coach_no || "--"} ${t("booking.success.coach")} ${order.seat_no || "--"}`;

  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-[24px] border border-border/70 bg-card/80 shadow-[0_14px_40px_-30px_rgba(15,23,42,0.6)] backdrop-blur-sm transition-opacity duration-300",
        isRefunded ? "opacity-[0.96]" : "",
      )}
    >
      {/* 已完成角标 */}
      {isRefunded && (
        <div className="pointer-events-none absolute right-[-44px] top-[18px] z-10 rotate-[34deg] border border-border/70 bg-muted/70 px-10 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {locale === "en" ? "Completed" : "已完成"}
        </div>
      )}

      {/* 头部信息 */}
      <div className="flex h-9 items-center justify-between border-b border-border/55 px-4 sm:px-5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="rounded-xl bg-primary px-2.5 py-1 text-sm font-semibold leading-none text-primary-foreground">
            {order.train_no}
          </span>
          {order.train_type && (
            <Badge variant="secondary">{getTrainTypeLabel(order.train_type, fmtLocale)}</Badge>
          )}
          <Badge variant={isRefunded ? "warning" : "success"}>
            {isRefunded ? t("trips.status.refunded") : t("trips.status.booked")}
          </Badge>
        </div>
        {order.demo_mode && (
          <Badge variant="secondary" className="text-[10px]">{t("booking.demo.badge")}</Badge>
        )}
      </div>

      {/* 主体站点信息 */}
      <div className="px-4 py-3.5 sm:px-5 sm:py-4">
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 lg:gap-5">
          <div className="min-w-0 text-left">
            <p className="tabular-nums text-[32px] font-bold leading-none tracking-[-0.04em] text-foreground sm:text-[38px] lg:text-[44px]">
              {order.departure_time || "--:--"}
            </p>
            <p className="mt-1.5 text-[1.05rem] font-semibold tracking-tight sm:text-[1.25rem] lg:text-[1.5rem]">
              {order.from_station}
            </p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground sm:text-sm">{departureDate}</p>
          </div>

          <div className="flex min-w-0 flex-col items-center justify-center text-center">
            <div className="flex w-full items-center gap-2.5">
              <div className="h-px flex-1 bg-border/80" />
              <span className="shrink-0 text-xs font-semibold tracking-[0.18em] text-muted-foreground lg:text-sm">{order.train_no}</span>
              <div className="h-px flex-1 bg-border/80" />
            </div>
            <p className="mt-1.5 text-xs font-medium leading-5 text-muted-foreground lg:text-sm lg:leading-6">
              {seatAssignment}
            </p>
          </div>

          <div className="min-w-0 text-right">
            <p className="tabular-nums text-[32px] font-bold leading-none tracking-[-0.04em] text-foreground sm:text-[38px] lg:text-[44px]">
              {order.arrival_time || "--:--"}
            </p>
            <p className="mt-1.5 text-[1.05rem] font-semibold tracking-tight sm:text-[1.25rem] lg:text-[1.5rem]">
              {order.to_station}
            </p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground sm:text-sm">{departureDate}</p>
          </div>
        </div>

        {/* 底部详细信息 - 紧凑对其版重构 */}
        <div className="mt-4 border-t border-border/55 pt-4">
          <div className="grid grid-cols-1 gap-y-3 sm:grid-cols-2 sm:gap-x-6 lg:gap-x-8 sm:gap-y-0">
            
            {/* 左侧信息列 */}
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-3">
                {/* 统一使用 w-20 (80px) 锁定 Label 宽度，实现绝对对齐 */}
                <span className="w-20 shrink-0 text-sm text-muted-foreground">{t("booking.passenger")}</span>
                <span className="text-sm font-medium text-foreground">{order.passenger_name}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-20 shrink-0 text-sm text-muted-foreground">{t("trips.card.seat")}</span>
                <span className="text-sm font-medium text-foreground">{order.seat_label}</span>
              </div>
            </div>

            {/* 右侧信息列 */}
            <div className="mt-2 flex flex-col gap-2.5 sm:mt-0">
              <div className="flex items-center gap-3">
                <span className="w-20 shrink-0 text-sm text-muted-foreground">{t("trips.card.amount")}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold leading-none tracking-tight text-amber-600 dark:text-amber-400 sm:text-2xl">
                    {formatPrice(order.fare_amount)}
                  </span>
                  {isRefunded && (
                    <Badge variant="warning" className="h-5 px-1.5 text-[10px] font-semibold uppercase leading-none">
                      {locale === "en" ? "Refunded" : "已退回"}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-20 shrink-0 pt-[3px] text-sm text-muted-foreground">{t("booking.orderNo")}</span>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-foreground">{order.order_no}</span>
                    <button
                      type="button"
                      onClick={() => copyValue(order.order_no, "order")}
                      className="group flex h-5 w-5 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      title={t("common.copy")}
                    >
                      {copied === "order" ? (
                        <Check className="h-3.5 w-3.5 text-green-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5 transition-transform group-hover:scale-110" />
                      )}
                    </button>
                  </div>
                  {isRefunded && refundedTime && (
                    <span className="text-[11px] leading-tight text-muted-foreground">
                      {t("trips.card.refundedAt")} · {refundedTime}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 退款操作按钮区域 */}
          {!isRefunded && (
            <div className="mt-5 flex w-full justify-end sm:mt-4">
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => onRefund(order)}
                disabled={refunding}
              >
                <Undo2 className="mr-2 h-4 w-4" />
                {refunding ? t("trips.refund.processing") : t("trips.refund.action")}
              </Button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}