"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Alert from "@mui/material/Alert";
import { AlertCircle, TrainFront } from "lucide-react";
import { SearchForm } from "@/components/search/SearchForm";
import { TrainCardList } from "@/components/tickets/TrainCardList";
import { useTicketSearch } from "@/hooks/useTicketSearch";
import { listStations } from "@/services/trains";
import type { TrainSearchParams, TrainSearchResult } from "@/types/trains";
import { useI18n } from "@/lib/i18n/i18n";
import { formatDuration } from "@/utils/date";
import { formatPrice, getLowestFare, maxLowestFareInList } from "@/utils/format";

type SortKey = "departure" | "duration" | "price";
type SortDirection = "asc" | "desc";

function toMinutesOfDay(time: string): number {
  const [h, m] = time.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return Number.MAX_SAFE_INTEGER;
  return h * 60 + m;
}

function compareBySortKey(a: TrainSearchResult, b: TrainSearchResult, sortKey: SortKey): number {
  const aPrice = getLowestFare(a)?.price ?? Infinity;
  const bPrice = getLowestFare(b)?.price ?? Infinity;
  const aDep = toMinutesOfDay(a.departure_time);
  const bDep = toMinutesOfDay(b.departure_time);
  if (sortKey === "departure") return aDep - bDep || a.duration_minutes - b.duration_minutes || aPrice - bPrice;
  if (sortKey === "duration") return a.duration_minutes - b.duration_minutes || aDep - bDep || aPrice - bPrice;
  return aPrice - bPrice || aDep - bDep || a.duration_minutes - b.duration_minutes;
}

const STATIONS_STALE_MS = 30 * 60_000;

export default function SearchPage() {
  const queryClient = useQueryClient();
  const { results, filteredResults, trainTypeFilter, loading, error, searched, searchDate, search } = useTicketSearch();
  const { t, locale } = useI18n();
  const [sortKey, setSortKey] = useState<SortKey>("departure");
  const [budgetMin, setBudgetMin] = useState(0);
  const [budgetMax, setBudgetMax] = useState(0);

  const fareUpperBound = useMemo(() => {
    const raw = maxLowestFareInList(results);
    return raw > 0 ? Math.ceil(raw) : 0;
  }, [results]);

  const prevLoading = useRef(false);

  useEffect(() => {
    if (fareUpperBound <= 0) {
      setBudgetMin(0);
      setBudgetMax(0);
      return;
    }
    setBudgetMin(0);
    setBudgetMax(fareUpperBound);
  }, [fareUpperBound]);

  useEffect(() => {
    if (prevLoading.current && !loading && searched) {
      const raw = maxLowestFareInList(results);
      const ub = raw > 0 ? Math.ceil(raw) : 0;
      if (ub <= 0) {
        setBudgetMin(0);
        setBudgetMax(0);
      } else {
        setBudgetMin(0);
        setBudgetMax(ub);
      }
    }
    prevLoading.current = loading;
  }, [loading, searched, results]);

  useEffect(() => {
    void queryClient.prefetchQuery({
      queryKey: ["stations"],
      queryFn: () => listStations(),
      staleTime: STATIONS_STALE_MS,
    });
  }, [queryClient]);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const statsLocale = locale === "en" ? "en" : "zh-CN";

  const budgetFilteredResults = useMemo(() => {
    if (fareUpperBound <= 0) return filteredResults;
    return filteredResults.filter((tr) => {
      const p = getLowestFare(tr)?.price;
      if (p == null || !Number.isFinite(p)) return true;
      return p >= budgetMin && p <= budgetMax;
    });
  }, [filteredResults, budgetMin, budgetMax, fareUpperBound]);

  const budgetActive = fareUpperBound > 0 && (budgetMin > 0 || budgetMax < fareUpperBound);

  const sortedResults = useMemo(() => {
    const list = [...budgetFilteredResults];
    list.sort((a, b) => { const v = compareBySortKey(a, b, sortKey); return sortDirection === "asc" ? v : -v; });
    return list;
  }, [budgetFilteredResults, sortDirection, sortKey]);

  const getTopBySort = useMemo(() => (key: SortKey, dir: SortDirection) => {
    if (budgetFilteredResults.length === 0) return null;
    const list = [...budgetFilteredResults];
    list.sort((a, b) => { const v = compareBySortKey(a, b, key); return dir === "asc" ? v : -v; });
    return list[0] ?? null;
  }, [budgetFilteredResults]);

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
    <Box sx={{ mx: "auto", width: "100%", maxWidth: 1680, flex: 1, overflowY: "auto", px: { xs: 1.5, sm: 2.5, lg: 3 }, py: { xs: 2.5, sm: 3 } }}>
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2.5 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 42,
              height: 42,
              borderRadius: "10px",
              background: (th) => `linear-gradient(135deg, ${th.palette.primary.main}18, ${th.palette.primary.main}08)`,
            }}
          >
            <TrainFront size={20} style={{ color: "var(--primary)" }} />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={800} sx={{ letterSpacing: "-0.01em" }}>{t("search.title")}</Typography>
            <Typography variant="caption" color="text.secondary">{t("search.subtitle")}</Typography>
          </Box>
        </Box>
      </motion.div>

      <Box sx={{ display: "grid", flex: 1, gap: { xs: 2.5, lg: 3 }, gridTemplateColumns: { lg: "400px 1fr" } }}>
        <Box sx={{ position: { lg: "sticky" }, top: { lg: 12 }, height: "fit-content" }}>
          <SearchForm
            onSearch={(params: TrainSearchParams) => search(params)}
            loading={loading}
            budgetSlider={
              searched && fareUpperBound > 0
                ? {
                    maxBound: fareUpperBound,
                    minValue: budgetMin,
                    maxValue: budgetMax,
                    onChange: (a, b) => {
                      setBudgetMin(a);
                      setBudgetMax(b);
                    },
                  }
                : undefined
            }
          />
        </Box>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {error && (
            <Alert severity="error" variant="outlined" icon={<AlertCircle size={18} />} sx={{ borderRadius: "12px" }}>{error}</Alert>
          )}

          {searched && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
              {!loading && results.length > 0 && (
                <Box sx={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 1, mb: 2 }}>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
                    <Typography variant="body2" fontWeight={700} color="text.secondary">
                      {t("search.found", { count: budgetFilteredResults.length })}
                    </Typography>
                    {trainTypeFilter ? (
                      <Typography variant="caption" color="text.disabled">
                        {t("search.queryTotal", { total: results.length })}
                      </Typography>
                    ) : null}
                    {budgetActive ? (
                      <Typography variant="caption" color="text.disabled">
                        {t("search.budgetApplied", { shown: budgetFilteredResults.length, eligible: filteredResults.length })}
                      </Typography>
                    ) : null}
                  </Box>
                  <Box sx={{ display: "flex", gap: 0.75 }}>
                    {departureTop && (
                      <Chip label={`${departureTop.departure_time}${sortKey === "departure" ? ` ${sortIcon}` : ""}`} size="small"
                        color={sortKey === "departure" ? "primary" : "default"} variant={sortKey === "departure" ? "filled" : "outlined"}
                        onClick={() => handleSortClick("departure")} clickable sx={{ borderRadius: "6px" }} />
                    )}
                    {durationTop && (
                      <Chip label={`${formatDuration(durationTop.duration_minutes, statsLocale)}${sortKey === "duration" ? ` ${sortIcon}` : ""}`} size="small"
                        color={sortKey === "duration" ? "primary" : "default"} variant={sortKey === "duration" ? "filled" : "outlined"}
                        onClick={() => handleSortClick("duration")} clickable sx={{ borderRadius: "6px" }} />
                    )}
                    {priceTopFare && (
                      <Chip label={`${formatPrice(priceTopFare.price)}${sortKey === "price" ? ` ${sortIcon}` : ""}`} size="small"
                        color={sortKey === "price" ? "primary" : "default"} variant={sortKey === "price" ? "filled" : "outlined"}
                        onClick={() => handleSortClick("price")} clickable sx={{ borderRadius: "6px" }} />
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
