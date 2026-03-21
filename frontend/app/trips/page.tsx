"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import { ArrowUpRight, Compass, RefreshCw, Ticket, TrainFront, Wallet } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { TripCard } from "@/components/tickets/TripCard";
import { useTrips, useRefundTicket } from "@/hooks/queries/useTrips";
import type { TicketOrder, TicketOrderStatus } from "@/types/ticketing";
import { formatPrice } from "@/utils/format";
import { useI18n } from "@/lib/i18n/i18n";
import { useResponsiveNavMode } from "@/hooks/useResponsiveNavMode";

type FilterKey = "all" | TicketOrderStatus;

type SummaryColor = "primary" | "success" | "warning" | "error";

function SummaryCard({ icon: Icon, label, value, semanticColor }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string | number; semanticColor: SummaryColor }) {
  const colorMap: Record<SummaryColor, string> = {
    primary: "primary.main",
    success: "success.main",
    warning: "warning.main",
    error: "error.main",
  };
  const iconColor = colorMap[semanticColor];

  return (
    <Card
      variant="outlined"
      sx={{
        minHeight: 104,
        borderRadius: "16px",
        borderColor: (th) => `${th.palette.divider}60`,
        boxShadow: "var(--shadow-card)",
        transition: "all 0.2s ease",
        "&:hover": { boxShadow: "var(--shadow-card-hover)", transform: "translateY(-1px)" },
      }}
    >
      <CardContent sx={{ display: "flex", flexDirection: "column", justifyContent: "space-between", height: "100%", p: 2.5, "&:last-child": { pb: 2.5 } }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <Typography variant="caption" color="text.secondary">{label}</Typography>
          <Box sx={{ width: 34, height: 34, borderRadius: "10px", bgcolor: (th) => {
            const palette = th.palette as any;
            const resolved = semanticColor === "primary" ? palette.primary.main
              : semanticColor === "success" ? palette.success.main
              : semanticColor === "warning" ? palette.warning.main
              : palette.error.main;
            return `${resolved}14`;
          }, display: "flex", alignItems: "center", justifyContent: "center", color: iconColor }}>
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
  const [filter, setFilter] = useState<FilterKey>("all");

  const { data, isLoading: loading, error: queryError, refetch } = useTrips();
  const refundMutation = useRefundTicket();

  const error = queryError ? (queryError instanceof Error ? queryError.message : t("common.loadFailed")) : null;

  const trips = useMemo(() => data?.trips ?? [], [data?.trips]);
  const filteredTrips = useMemo(() => filter === "all" ? trips : trips.filter((i) => i.status === filter), [filter, trips]);

  const handleRefund = (order: TicketOrder) => {
    refundMutation.mutate(order.id);
  };

  const summary = data?.summary;

  return (
    <Box sx={{ mx: "auto", width: "100%", maxWidth: 1440, flex: 1, overflowY: "auto", px: { xs: 2, sm: 3, lg: 3.5 }, pt: { xs: 2, sm: 2.5 }, pb: showBottomNav ? 12 : 3, display: "flex", flexDirection: "column", gap: 3 }}>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <PageHeader
          title={t("trips.title")}
          subtitle={t("trips.subtitle")}
          badges={data?.demo_mode ? [t("booking.demo.badge")] : undefined}
          action={
            <Button variant="outlined" onClick={() => refetch()} disabled={loading} startIcon={loading ? <CircularProgress size={16} /> : <RefreshCw size={16} />} sx={{ alignSelf: "flex-start", borderRadius: "8px" }}>
              {t("trips.refresh")}
            </Button>
          }
        >
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 1.5, mt: 2.5 }}>
            <SummaryCard icon={Ticket} label={t("trips.summary.total")} value={summary?.total_orders ?? 0} semanticColor="primary" />
            <SummaryCard icon={TrainFront} label={t("trips.summary.active")} value={summary?.active_orders ?? 0} semanticColor="success" />
            <SummaryCard icon={Wallet} label={t("trips.summary.spent")} value={formatPrice(summary?.total_spent ?? 0)} semanticColor="warning" />
            <SummaryCard icon={ArrowUpRight} label={t("trips.summary.refunded")} value={formatPrice(summary?.total_refunded ?? 0)} semanticColor="error" />
          </Box>
        </PageHeader>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
          {(["all", "booked", "refunded"] as FilterKey[]).map((item) => (
            <Chip key={item} label={t(`trips.filter.${item}`)} clickable onClick={() => setFilter(item)}
              color={filter === item ? "primary" : "default"} variant={filter === item ? "filled" : "outlined"} sx={{ borderRadius: "6px" }} />
          ))}
        </Box>
      </motion.div>

      {error && <Card variant="outlined" sx={{ borderRadius: "16px" }}><CardContent><Typography variant="body2" color="error">{error}</Typography></CardContent></Card>}

      {loading ? (
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 280, borderRadius: "16px", border: 1, borderColor: "divider", bgcolor: "background.paper" }}>
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
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
          {filteredTrips.map((order, index) => (
            <motion.div key={order.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * 0.04, 0.2) }}>
              <TripCard order={order} refunding={refundMutation.isPending && refundMutation.variables === order.id} onRefund={handleRefund} />
            </motion.div>
          ))}
        </Box>
      )}
    </Box>
  );
}
