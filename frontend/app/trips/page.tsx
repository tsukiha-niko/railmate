"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, Compass, Loader2, Sparkles, Ticket, TrainFront, Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TripCard } from "@/components/tickets/TripCard";
import { listTicketOrders, refundTicket } from "@/services/ticketing";
import { useChatStore } from "@/store/chatStore";
import type { TicketOrder, TicketOrderStatus, TicketingListResponse } from "@/types/ticketing";
import { formatPrice } from "@/utils/format";
import { useI18n } from "@/lib/i18n/i18n";

type FilterKey = "all" | TicketOrderStatus;

export default function TripsPage() {
  const { t } = useI18n();
  const userId = useChatStore((s) => s.userId);
  const [data, setData] = useState<TicketingListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [refundingId, setRefundingId] = useState<number | null>(null);

  const loadTrips = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listTicketOrders(userId);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [t, userId]);

  useEffect(() => {
    loadTrips();
  }, [loadTrips]);

  const trips = useMemo(() => data?.trips ?? [], [data?.trips]);
  const filteredTrips = useMemo(() => {
    if (filter === "all") return trips;
    return trips.filter((item) => item.status === filter);
  }, [filter, trips]);

  const handleRefund = useCallback(async (order: TicketOrder) => {
    setRefundingId(order.id);
    try {
      await refundTicket(order.id);
      await loadTrips();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.requestFailed"));
    } finally {
      setRefundingId(null);
    }
  }, [loadTrips, t]);

  const summary = data?.summary;
  const summaryCards = [
    {
      key: "total",
      icon: Ticket,
      label: t("trips.summary.total"),
      value: summary?.total_orders ?? 0,
      className: "",
    },
    {
      key: "active",
      icon: TrainFront,
      label: t("trips.summary.active"),
      value: summary?.active_orders ?? 0,
      className: "",
    },
    {
      key: "spent",
      icon: Wallet,
      label: t("trips.summary.spent"),
      value: formatPrice(summary?.total_spent ?? 0),
      className: "",
    },
    {
      key: "refunded",
      icon: ArrowUpRight,
      label: t("trips.summary.refunded"),
      value: formatPrice(summary?.total_refunded ?? 0),
      className: "bg-gradient-to-br from-amber-500/[0.12] via-rose-500/[0.08] to-card/78",
    },
  ] as const;

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col overflow-y-auto px-3 pb-24 pt-3 sm:px-5 sm:pb-6 sm:pt-5 lg:px-6 xl:px-8">
      <div className="space-y-5">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="overflow-hidden border-border/70 bg-gradient-to-br from-primary/[0.11] via-card/92 to-card/82">
            <CardContent className="flex flex-col gap-5 p-5 sm:p-6">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-bold sm:text-3xl">{t("trips.title")}</h1>
                    {data?.demo_mode ? <Badge variant="secondary">{t("booking.demo.badge")}</Badge> : null}
                  </div>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{t("trips.subtitle")}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" className="gap-2" onClick={loadTrips} disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    {t("trips.refresh")}
                  </Button>
                </div>
              </div>

              <div className="grid w-full grid-cols-2 gap-3 sm:[grid-template-columns:repeat(4,minmax(0,1fr))]">
                {summaryCards.map((item) => (
                  <div
                    key={item.key}
                    className={`flex min-h-[112px] min-w-0 w-full flex-col justify-between rounded-2xl border border-border/60 bg-card/72 p-4 backdrop-blur-sm lg:min-h-[118px] ${item.className}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-background/72 text-muted-foreground">
                        <item.icon className="h-4.5 w-4.5" />
                      </div>
                    </div>
                    <p className="truncate text-[1.75rem] font-semibold tracking-tight lg:text-3xl">{item.value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <div className="flex flex-wrap gap-2">
            {(["all", "booked", "refunded"] as FilterKey[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setFilter(item)}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-all ${
                  filter === item
                    ? "border-primary/35 bg-primary/12 text-primary"
                    : "border-border/70 bg-card/60 text-muted-foreground hover:border-primary/20 hover:text-foreground"
                }`}
              >
                {t(`trips.filter.${item}`)}
              </button>
            ))}
          </div>
        </motion.div>

        {error ? (
          <Card>
            <CardContent className="p-4 text-sm text-destructive">{error}</CardContent>
          </Card>
        ) : null}

        {loading ? (
          <div className="flex min-h-[280px] items-center justify-center rounded-[28px] border border-border/70 bg-card/65">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("trips.loading")}
            </div>
          </div>
        ) : filteredTrips.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex min-h-[320px] flex-col items-center justify-center gap-4 p-8 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-primary/10 text-primary">
                {trips.length === 0 ? <Ticket className="h-7 w-7" /> : <Compass className="h-7 w-7" />}
              </div>
              <div>
                <p className="text-lg font-semibold">{trips.length === 0 ? t("trips.empty.title") : t("trips.empty.filtered")}</p>
                <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                  {trips.length === 0 ? t("trips.empty.desc") : t("trips.empty.filteredDesc")}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-5 xl:gap-6">
            {filteredTrips.map((order, index) => (
              <motion.div key={order.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * 0.04, 0.2) }}>
                <TripCard order={order} refunding={refundingId === order.id} onRefund={handleRefund} />
              </motion.div>
            ))}
          </div>
        )}

        {data?.account_username ? (
          <div className="flex items-center gap-2 rounded-2xl border border-border/65 bg-card/60 px-4 py-3 text-sm text-muted-foreground">
            <TrainFront className="h-4 w-4 text-primary" />
            {t("trips.boundAccount", { username: data.account_username })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
