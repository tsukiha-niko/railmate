"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, Compass, Loader2, RefreshCw, Ticket, TrainFront, Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TripCard } from "@/components/tickets/TripCard";
import { listTicketOrders, refundTicket } from "@/services/ticketing";
import { useChatStore } from "@/store/chatStore";
import type { TicketOrder, TicketOrderStatus, TicketingListResponse } from "@/types/ticketing";
import { formatPrice } from "@/utils/format";
import { useI18n } from "@/lib/i18n/i18n";
import { useResponsiveNavMode } from "@/hooks/useResponsiveNavMode";
import { cn } from "@/utils/cn";

type FilterKey = "all" | TicketOrderStatus;

type SummaryCardProps = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
};

function SummaryCard({ icon: Icon, label, value }: SummaryCardProps) {
  return (
    <div
      className="flex min-h-[104px] flex-col justify-between rounded-2xl border border-border/60 bg-card/72 p-3.5 backdrop-blur-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-background/72 text-muted-foreground">
          <Icon className="h-4.5 w-4.5" />
        </div>
      </div>
      <p className="truncate text-[1.6rem] font-semibold tracking-tight sm:text-[1.8rem]">{value}</p>
    </div>
  );
}

export default function TripsPage() {
  const { t } = useI18n();
  const { showBottomNav } = useResponsiveNavMode();
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

  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-[1440px] flex-1 flex-col overflow-y-auto px-4 pt-3 sm:px-6 sm:pt-5 lg:px-7 xl:px-8",
        showBottomNav ? "pb-24" : "pb-6",
      )}
    >
      <div className="space-y-4">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="overflow-hidden border-border/70 bg-gradient-to-br from-primary/[0.11] via-card/92 to-card/82">
            <CardContent className="space-y-4 p-4 sm:p-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-bold sm:text-3xl">{t("trips.title")}</h1>
                    {data?.demo_mode ? <Badge variant="secondary">{t("booking.demo.badge")}</Badge> : null}
                  </div>
                  <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{t("trips.subtitle")}</p>
                </div>
                <Button variant="outline" className="gap-2 self-start" onClick={loadTrips} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  {t("trips.refresh")}
                </Button>
              </div>

              <div className="grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">
                <SummaryCard icon={Ticket} label={t("trips.summary.total")} value={summary?.total_orders ?? 0} />
                <SummaryCard icon={TrainFront} label={t("trips.summary.active")} value={summary?.active_orders ?? 0} />
                <SummaryCard icon={Wallet} label={t("trips.summary.spent")} value={formatPrice(summary?.total_spent ?? 0)} />
                <SummaryCard icon={ArrowUpRight} label={t("trips.summary.refunded")} value={formatPrice(summary?.total_refunded ?? 0)} />
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
                className={`inline-flex items-center rounded-full border px-2.5 py-1.5 text-sm font-medium transition-all ${
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
          <div className="grid gap-4">
            {filteredTrips.map((order, index) => (
              <motion.div key={order.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * 0.04, 0.2) }}>
                <TripCard order={order} refunding={refundingId === order.id} onRefund={handleRefund} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
