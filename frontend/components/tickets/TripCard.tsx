"use client";

import { useEffect, useRef, useState } from "react";
import { Copy, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { TicketOrder } from "@/types/ticketing";
import { formatDateLocalized } from "@/utils/date";
import { formatPrice, getTrainTypeLabel } from "@/utils/format";
import { useI18n } from "@/lib/i18n/i18n";
import { cn } from "@/utils/cn";

/* ====================== 1. 统计区组件（强制4卡同一行） ====================== */
export function StatsGrid() {
  const stats = [
    { label: "订单总数", value: "3" },
    { label: "有效订单", value: "0" },
    { label: "当前票额", value: "¥0" },
    { label: "累计退回", value: "¥1614", highlight: true },
  ];

  return (
    <div className="grid grid-cols-4 gap-3 overflow-x-auto pb-2 scrollbar-hide">
      {stats.map((stat, i) => (
        <div
          key={i}
          className={cn(
            "rounded-2xl bg-card/90 border border-border/60 px-5 py-4 text-center transition-all hover:border-border/80",
            stat.highlight && "bg-gradient-to-br from-amber-950/40 to-transparent border-amber-400/30"
          )}
        >
          <div className="text-[28px] font-bold tracking-tighter text-foreground">{stat.value}</div>
          <div className="mt-1 text-sm text-muted-foreground">{stat.label}</div>
        </div>
      ))}
    </div>
  );
}

/* ====================== 2. 优化后的 TripCard（正常宽版 + 明显紧凑） ====================== */
interface TripCardProps {
  order: TicketOrder;
  refunding: boolean;
  onRefund: (order: TicketOrder) => void;
}

export function TripCard({ order, refunding, onRefund }: TripCardProps) {
  const { locale, t } = useI18n();
  const fmtLocale = locale === "en" ? "en" : "zh-CN";
  const isRefunded = order.status === "refunded";
  const seatAssignment = `${order.coach_no || "--"} ${t("booking.success.coach")} ${order.seat_no || "--"}`;
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

  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-[28px] border shadow-[0_18px_50px_-36px_rgba(15,23,42,0.55)] backdrop-blur-sm",
        isRefunded ? "border-border/60 bg-card/72" : "border-border/70 bg-card/80",
      )}
    >
      {isRefunded && (
        <div className="pointer-events-none absolute right-[-44px] top-[18px] z-10 rotate-[34deg] border border-border/70 bg-muted/70 px-10 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {locale === "en" ? "Completed" : "已完成"}
        </div>
      )}

      {/* Header */}
      <div className="flex h-9 items-center justify-between border-b border-border/55 px-5 sm:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <span className="rounded-xl bg-primary px-2.5 py-1 text-sm font-semibold leading-none text-primary-foreground">
            {order.train_no}
          </span>
          {order.train_type && <Badge variant="secondary">{getTrainTypeLabel(order.train_type, fmtLocale)}</Badge>}
          <Badge variant={isRefunded ? "warning" : "success"}>
            {isRefunded ? t("trips.status.refunded") : t("trips.status.booked")}
          </Badge>
        </div>
        {order.demo_mode && <Badge variant="secondary" className="text-[10px]">{t("booking.demo.badge")}</Badge>}
      </div>

      {/* 核心时间线 - 正常宽版 + 明显紧凑 */}
      <div className="px-5 py-5 sm:px-6 sm:py-6">
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-6">
          {/* 左边 */}
          <div className="text-left">
            <p className="text-[42px] font-bold leading-none tracking-[-0.04em] tabular-nums text-foreground">
              {order.departure_time || "--:--"}
            </p>
            <p className="mt-1.5 text-[1.35rem] font-semibold tracking-tight">{order.from_station}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">{formatDateLocalized(order.run_date, fmtLocale)}</p>
          </div>

          {/* 中间 */}
          <div className="flex flex-col items-center text-center min-w-[140px]">
            <div className="flex w-full items-center gap-2">
              <div className="h-px flex-1 bg-border/80" />
              <div>
                <span className="block text-xs font-semibold tracking-widest text-muted-foreground">G337</span>
                <span className="block text-[10px] text-muted-foreground">{seatAssignment}</span>
              </div>
              <div className="h-px flex-1 bg-border/80" />
            </div>
          </div>

          {/* 右边 */}
          <div className="text-right">
            <p className="text-[42px] font-bold leading-none tracking-[-0.04em] tabular-nums text-foreground">
              {order.arrival_time || "--:--"}
            </p>
            <p className="mt-1.5 text-[1.35rem] font-semibold tracking-tight">{order.to_station}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">{formatDateLocalized(order.run_date, fmtLocale)}</p>
          </div>
        </div>

        {/* 底部信息 - 正常紧凑2列网格 */}
        <div className="mt-6 grid grid-cols-2 gap-x-10 gap-y-4 border-t border-border/55 pt-5">
          {/* 左列 */}
          <div className="space-y-3">
            <div className="flex items-baseline gap-3">
              <span className="w-[64px] text-sm text-muted-foreground shrink-0">乘车人</span>
              <span className="font-medium">{order.passenger_name}</span>
            </div>
            <div className="flex items-baseline gap-3">
              <span className="w-[64px] text-sm text-muted-foreground shrink-0">座位信息</span>
              <span className="font-medium">{order.seat_label}</span>
            </div>
          </div>

          {/* 右列 */}
          <div className="space-y-3 text-right">
            <div className="flex items-center justify-end gap-3">
              <span className="text-sm text-muted-foreground shrink-0">订单金额</span>
              <div className="flex items-center gap-2">
                <span className="text-[30px] font-bold tracking-tighter text-amber-600 dark:text-amber-300">
                  {formatPrice(order.fare_amount)}
                </span>
                {isRefunded && <Badge variant="warning">已退回</Badge>}
              </div>
            </div>

            <div className="flex items-start justify-end gap-3">
              <span className="text-sm text-muted-foreground shrink-0 pt-0.5">订单号</span>
              <button
                onClick={() => copyValue(order.order_no, "order")}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>{order.order_no}</span>
                {copied === "order" && <span className="text-[10px] text-emerald-500">已复制</span>}
              </button>
            </div>

            {isRefunded && refundedTime && (
              <div className="text-xs text-muted-foreground">退票时间：{refundedTime}</div>
            )}
          </div>
        </div>

        {/* 退款按钮（未退款时显示） */}
        {!isRefunded && (
          <div className="mt-6 flex justify-end">
            <Button variant="outline" className="gap-2" onClick={() => onRefund(order)} disabled={refunding}>
              <Undo2 className="h-4 w-4" />
              {refunding ? t("trips.refund.processing") : t("trips.refund.action")}
            </Button>
          </div>
        )}
      </div>
    </article>
  );
}