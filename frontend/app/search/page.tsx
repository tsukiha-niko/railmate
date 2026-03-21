"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Alert from "@mui/material/Alert";
import { AlertCircle, TrainFront } from "lucide-react";
import { SearchForm } from "@/components/search/SearchForm";
import { TrainCardList } from "@/components/tickets/TrainCardList";
import { useTicketSearch } from "@/hooks/useTicketSearch";
import type { TrainSearchParams } from "@/types/trains";
import { useI18n } from "@/lib/i18n/i18n";
import { formatDuration } from "@/utils/date";
import { formatPrice, getLowestFare } from "@/utils/format";

type SortKey = "departure" | "duration" | "price";
type SortDirection = "asc" | "desc";

function toMinutesOfDay(time: string): number {
  const [h, m] = time.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return Number.MAX_SAFE_INTEGER;
  return h * 60 + m;
}

function compareBySortKey(a: ReturnType<typeof useTicketSearch>["results"][number], b: ReturnType<typeof useTicketSearch>["results"][number], sortKey: SortKey): number {
  const aPrice = getLowestFare(a)?.price ?? Infinity;
  const bPrice = getLowestFare(b)?.price ?? Infinity;
  const aDep = toMinutesOfDay(a.departure_time);
  const bDep = toMinutesOfDay(b.departure_time);
  if (sortKey === "departure") return aDep - bDep || a.duration_minutes - b.duration_minutes || aPrice - bPrice;
  if (sortKey === "duration") return a.duration_minutes - b.duration_minutes || aDep - bDep || aPrice - bPrice;
  return aPrice - bPrice || aDep - bDep || a.duration_minutes - b.duration_minutes;
}

export default function SearchPage() {
  const { results, loading, error, searched, searchDate, search } = useTicketSearch();
  const { t, locale } = useI18n();
  const [sortKey, setSortKey] = useState<SortKey>("departure");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const statsLocale = locale === "en" ? "en" : "zh-CN";
  const sortedResults = useMemo(() => {
    const list = [...results];
    list.sort((a, b) => { const v = compareBySortKey(a, b, sortKey); return sortDirection === "asc" ? v : -v; });
    return list;
  }, [results, sortDirection, sortKey]);

  const getTopBySort = useMemo(() => (key: SortKey, dir: SortDirection) => {
    if (results.length === 0) return null;
    const list = [...results];
    list.sort((a, b) => { const v = compareBySortKey(a, b, key); return dir === "asc" ? v : -v; });
    return list[0] ?? null;
  }, [results]);

  const departureTop = getTopBySort("departure", sortKey === "departure" ? sortDirection : "asc");
  const durationTop = getTopBySort("duration", sortKey === "duration" ? sortDirection : "asc");
  const priceTop = getTopBySort("price", sortKey === "price" ? sortDirection : "asc");
  const priceTopFare = priceTop ? getLowestFare(priceTop) : null;
  const sortIcon = sortDirection === "asc" ? "↑" : "↓";

  const handleSortClick = (key: SortKey) => {
    if (sortKey === key) { setSortDirection((p) => (p === "asc" ? "desc" : "asc")); return; }
    setSortKey(key); setSortDirection("asc");
  };

  return (
    <Box sx={{ mx: "auto", width: "100%", maxWidth: 1680, flex: 1, overflowY: "auto", px: { xs: 1.5, sm: 2.5, lg: 3 }, py: { xs: 1.5, sm: 2 } }}>
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", width: 40, height: 40, borderRadius: 3, bgcolor: (th) => `${th.palette.primary.main}1A` }}>
            <TrainFront size={20} style={{ color: "var(--primary)" }} />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={800}>{t("search.title")}</Typography>
            <Typography variant="caption" color="text.secondary">{t("search.subtitle")}</Typography>
          </Box>
        </Box>
      </motion.div>

      <Box sx={{ display: "grid", flex: 1, gap: { xs: 2, lg: 2.5 }, gridTemplateColumns: { lg: "380px 1fr" } }}>
        <Box sx={{ position: { lg: "sticky" }, top: { lg: 12 }, height: "fit-content" }}>
          <SearchForm onSearch={(params: TrainSearchParams) => search(params)} loading={loading} />
        </Box>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {error && (
            <Alert severity="error" variant="outlined" icon={<AlertCircle size={18} />}>{error}</Alert>
          )}

          {searched && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
              {!loading && results.length > 0 && (
                <Box sx={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 1, mb: 1.5 }}>
                  <Typography variant="body2" fontWeight={700} color="text.secondary">
                    {t("search.found", { count: results.length })}
                  </Typography>
                  <Box sx={{ display: "flex", gap: 0.75 }}>
                    {departureTop && (
                      <Chip label={`${departureTop.departure_time}${sortKey === "departure" ? ` ${sortIcon}` : ""}`} size="small"
                        color={sortKey === "departure" ? "primary" : "default"} variant={sortKey === "departure" ? "filled" : "outlined"}
                        onClick={() => handleSortClick("departure")} clickable />
                    )}
                    {durationTop && (
                      <Chip label={`${formatDuration(durationTop.duration_minutes, statsLocale)}${sortKey === "duration" ? ` ${sortIcon}` : ""}`} size="small"
                        color={sortKey === "duration" ? "primary" : "default"} variant={sortKey === "duration" ? "filled" : "outlined"}
                        onClick={() => handleSortClick("duration")} clickable />
                    )}
                    {priceTopFare && (
                      <Chip label={`${formatPrice(priceTopFare.price)}${sortKey === "price" ? ` ${sortIcon}` : ""}`} size="small"
                        color={sortKey === "price" ? "primary" : "default"} variant={sortKey === "price" ? "filled" : "outlined"}
                        onClick={() => handleSortClick("price")} clickable />
                    )}
                  </Box>
                </Box>
              )}
              <TrainCardList trains={sortedResults} date={searchDate} loading={loading} emptyMessage={t("search.empty")} />
            </motion.div>
          )}
        </Box>
      </Box>
    </Box>
  );
}
