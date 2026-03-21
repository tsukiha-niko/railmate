"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import { ArrowUpRight, Compass, Loader2, RefreshCw, Ticket, TrainFront, Wallet } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { TripCard } from "@/components/tickets/TripCard";
import { listTicketOrders, refundTicket } from "@/services/ticketing";
import { useChatStore } from "@/store/chatStore";
import type { TicketOrder, TicketOrderStatus, TicketingListResponse } from "@/types/ticketing";
import { formatPrice } from "@/utils/format";
import { useI18n } from "@/lib/i18n/i18n";
import { useResponsiveNavMode } from "@/hooks/useResponsiveNavMode";

type FilterKey = "all" | TicketOrderStatus;

function SummaryCard({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string | number }) {
  return (
    <Card variant="outlined" sx={{ minHeight: 104 }}>
      <CardContent sx={{ display: "flex", flexDirection: "column", justifyContent: "space-between", height: "100%", p: 2, "&:last-child": { pb: 2 } }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <Typography variant="caption" color="text.secondary">{label}</Typography>
          <Box sx={{ width: 32, height: 32, borderRadius: 3, bgcolor: "action.hover", display: "flex", alignItems: "center", justifyContent: "center", color: "text.secondary" }}>
            <Icon className="h-[18px] w-[18px]" />
          </Box>
        </Box>
        <Typography variant="h5" fontWeight={700} noWrap sx={{ fontVariantNumeric: "tabular-nums" }}>{value}</Typography>
      </CardContent>
    </Card>
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
    setLoading(true); setError(null);
    try { setData(await listTicketOrders(userId)); } catch (err) { setError(err instanceof Error ? err.message : t("common.loadFailed")); } finally { setLoading(false); }
  }, [t, userId]);

  useEffect(() => { loadTrips(); }, [loadTrips]);

  const trips = useMemo(() => data?.trips ?? [], [data?.trips]);
  const filteredTrips = useMemo(() => filter === "all" ? trips : trips.filter((i) => i.status === filter), [filter, trips]);

  const handleRefund = useCallback(async (order: TicketOrder) => {
    setRefundingId(order.id);
    try { await refundTicket(order.id); await loadTrips(); } catch (err) { setError(err instanceof Error ? err.message : t("errors.requestFailed")); } finally { setRefundingId(null); }
  }, [loadTrips, t]);

  const summary = data?.summary;

  return (
    <Box sx={{ mx: "auto", width: "100%", maxWidth: 1440, flex: 1, overflowY: "auto", px: { xs: 2, sm: 3, lg: 3.5 }, pt: { xs: 1.5, sm: 2.5 }, pb: showBottomNav ? 12 : 3, display: "flex", flexDirection: "column", gap: 2 }}>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <PageHeader
          title={t("trips.title")}
          subtitle={t("trips.subtitle")}
          badges={data?.demo_mode ? [t("booking.demo.badge")] : undefined}
          action={
            <Button variant="outlined" onClick={loadTrips} disabled={loading} startIcon={loading ? <CircularProgress size={16} /> : <RefreshCw size={16} />} sx={{ alignSelf: "flex-start" }}>
              {t("trips.refresh")}
            </Button>
          }
        >
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 1, mt: 2 }}>
            <SummaryCard icon={Ticket} label={t("trips.summary.total")} value={summary?.total_orders ?? 0} />
            <SummaryCard icon={TrainFront} label={t("trips.summary.active")} value={summary?.active_orders ?? 0} />
            <SummaryCard icon={Wallet} label={t("trips.summary.spent")} value={formatPrice(summary?.total_spent ?? 0)} />
            <SummaryCard icon={ArrowUpRight} label={t("trips.summary.refunded")} value={formatPrice(summary?.total_refunded ?? 0)} />
          </Box>
        </PageHeader>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
          {(["all", "booked", "refunded"] as FilterKey[]).map((item) => (
            <Chip key={item} label={t(`trips.filter.${item}`)} clickable onClick={() => setFilter(item)}
              color={filter === item ? "primary" : "default"} variant={filter === item ? "filled" : "outlined"} />
          ))}
        </Box>
      </motion.div>

      {error && <Card variant="outlined"><CardContent><Typography variant="body2" color="error">{error}</Typography></CardContent></Card>}

      {loading ? (
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 280, borderRadius: 6, border: 1, borderColor: "divider", bgcolor: "background.paper" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, color: "text.secondary" }}>
            <CircularProgress size={20} />
            <Typography variant="body2">{t("trips.loading")}</Typography>
          </Box>
        </Box>
      ) : filteredTrips.length === 0 ? (
        <EmptyState
          icon={trips.length === 0 ? <Ticket size={28} /> : <Compass size={28} />}
          title={trips.length === 0 ? t("trips.empty.title") : t("trips.empty.filtered")}
          description={trips.length === 0 ? t("trips.empty.desc") : t("trips.empty.filteredDesc")}
        />
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {filteredTrips.map((order, index) => (
            <motion.div key={order.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * 0.04, 0.2) }}>
              <TripCard order={order} refunding={refundingId === order.id} onRefund={handleRefund} />
            </motion.div>
          ))}
        </Box>
      )}
    </Box>
  );
}
