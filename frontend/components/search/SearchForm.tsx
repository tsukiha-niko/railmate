"use client";

import { useState, useCallback } from "react";
import { Search, ArrowLeftRight, MapPin, CalendarDays, Clock, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Chip from "@mui/material/Chip";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Slider from "@mui/material/Slider";
import { StationAutocomplete } from "./StationAutocomplete";
import { useUserContextStore } from "@/store/userContextStore";
import { useSearchStore, type RecentSearch } from "@/store/searchStore";
import { getToday, getTomorrow } from "@/utils/date";
import type { TrainSearchParams } from "@/types/trains";
import { useI18n } from "@/lib/i18n/i18n";
import { useSortedStationsForSearch } from "@/hooks/queries/useStations";
import { formatPrice } from "@/utils/format";

export interface BudgetSliderValue {
  maxBound: number;
  minValue: number;
  maxValue: number;
  onChange: (min: number, max: number) => void;
}

interface Props {
  onSearch: (params: TrainSearchParams) => void;
  loading?: boolean;
  budgetSlider?: BudgetSliderValue | null;
}

export function SearchForm({ onSearch, loading, budgetSlider }: Props) {
  const favoriteStations = useUserContextStore((s) => s.favoriteStations);
  const { sortedStations } = useSortedStationsForSearch(favoriteStations);
  const location = useUserContextStore((s) => s.location);
  const prevFrom = useSearchStore((s) => s.fromStation);
  const prevTo = useSearchStore((s) => s.toStation);
  const prevDate = useSearchStore((s) => s.searchDate);
  const recentSearches = useSearchStore((s) => s.recentSearches);
  const clearRecentSearches = useSearchStore((s) => s.clearRecentSearches);
  const [from, setFrom] = useState(prevFrom || location?.station || "");
  const [to, setTo] = useState(prevTo || "");
  const [date, setDate] = useState(prevDate || getToday());
  const trainType = useSearchStore((s) => s.trainTypeFilter);
  const setTrainType = useSearchStore((s) => s.setTrainTypeFilter);
  const { t } = useI18n();

  const handleRecentClick = useCallback((entry: RecentSearch) => {
    setFrom(entry.from);
    setTo(entry.to);
    setDate(entry.date);
    onSearch({ from_station: entry.from, to_station: entry.to, travel_date: entry.date });
  }, [onSearch]);

  const TRAIN_TYPES = [
    { value: "", label: t("search.type.all") },
    { value: "G", label: t("search.type.G") },
    { value: "D", label: t("search.type.D") },
    { value: "Z", label: t("search.type.Z") },
    { value: "T", label: t("search.type.T") },
    { value: "K", label: t("search.type.K") },
  ];

  const handleSwap = useCallback(() => { setFrom(to); setTo(from); }, [from, to]);
  const handleSearch = useCallback(() => {
    if (!from.trim() || !to.trim()) return;
    onSearch({ from_station: from.trim(), to_station: to.trim(), travel_date: date });
  }, [from, to, date, onSearch]);
  const useMyLocation = useCallback(() => {
    if (location?.station) setFrom(location.station);
    else if (location?.city) setFrom(location.city);
  }, [location]);

  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
      <Card variant="outlined" sx={{ borderRadius: "18px", borderColor: (th) => `${th.palette.divider}70`, boxShadow: "var(--shadow-card)" }}>
        <CardContent sx={{ display: "flex", flexDirection: "column", gap: 2.25, p: { xs: 2.5, sm: 3 } }}>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr auto 1fr", sm: "1fr 44px 1fr" }, alignItems: "flex-end", gap: { xs: 1, sm: 1.25 }, columnGap: { sm: 1.5 } }}>
            <StationAutocomplete
              label={t("search.from")}
              value={from}
              onChange={setFrom}
              stations={sortedStations}
              placeholder={t("search.stationPlaceholder")}
              onEnter={handleSearch}
              endAdornment={
                location ? (
                  <IconButton onClick={useMyLocation} size="small" title={t("search.useMyLocation")} color="primary">
                    <MapPin size={16} />
                  </IconButton>
                ) : undefined
              }
            />
            <IconButton
              onClick={handleSwap}
              aria-label={t("search.swapStations")}
              sx={{
                border: 1,
                borderColor: (th) => `${th.palette.divider}80`,
                width: 44,
                height: 44,
                borderRadius: "12px",
                alignSelf: "end",
                mb: "2px",
                flexShrink: 0,
                "&:hover": { borderColor: "primary.main", bgcolor: (th) => `${th.palette.primary.main}0A` },
                transition: "all 0.2s ease",
              }}
            >
              <ArrowLeftRight size={16} />
            </IconButton>
            <StationAutocomplete
              label={t("search.to")}
              value={to}
              onChange={setTo}
              stations={sortedStations}
              placeholder={t("search.stationPlaceholder")}
              onEnter={handleSearch}
            />
          </Box>

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr auto" }, alignItems: "flex-end", gap: { xs: 1.25, sm: 1.5 } }}>
            <TextField
              label={<Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}><CalendarDays size={14} aria-hidden />{t("search.departDate")}</Box>}
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              slotProps={{ htmlInput: { min: getToday() } }}
              fullWidth
              sx={{
                "& .MuiOutlinedInput-root": { borderRadius: "12px" },
              }}
            />
            <Box sx={{ display: "flex", gap: 0.75, flexShrink: 0, alignSelf: { xs: "stretch", sm: "end" }, justifyContent: { xs: "stretch", sm: "flex-start" } }}>
              <Button variant={date === getToday() ? "contained" : "outlined"} size="medium" onClick={() => setDate(getToday())} sx={{ borderRadius: "10px", minHeight: 40, flex: { xs: 1, sm: "none" }, px: 1.75 }}>{t("search.today")}</Button>
              <Button variant={date === getTomorrow() ? "contained" : "outlined"} size="medium" onClick={() => setDate(getTomorrow())} sx={{ borderRadius: "10px", minHeight: 40, flex: { xs: 1, sm: "none" }, px: 1.75 }}>{t("search.tomorrow")}</Button>
            </Box>
          </Box>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: "0.02em" }}>
              {t("search.trainType")}
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, alignItems: "center" }}>
              {TRAIN_TYPES.map((tt) => (
                <Chip
                  key={tt.value}
                  label={tt.label}
                  size="small"
                  variant={trainType === tt.value ? "filled" : "outlined"}
                  color={trainType === tt.value ? "primary" : "default"}
                  onClick={() => setTrainType(tt.value)}
                  clickable
                  sx={{ borderRadius: "8px", height: 28, "& .MuiChip-label": { px: 1.1, fontSize: "0.75rem" } }}
                />
              ))}
            </Box>
          </Box>

          {budgetSlider && budgetSlider.maxBound > 0 ? (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1, pt: 0.25 }}>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: "0.02em" }}>
                  {t("search.budget")}
                </Typography>
                <Typography variant="caption" color="text.disabled" sx={{ display: "block", mt: 0.35, lineHeight: 1.5 }}>
                  {t("search.budgetHint")}
                </Typography>
              </Box>
              <Slider
                size="small"
                value={[budgetSlider.minValue, budgetSlider.maxValue]}
                min={0}
                max={budgetSlider.maxBound}
                step={Math.max(1, Math.round(budgetSlider.maxBound / 80))}
                onChange={(_, v) => {
                  const [a, b] = v as number[];
                  budgetSlider.onChange(Math.min(a, b), Math.max(a, b));
                }}
                valueLabelDisplay="auto"
                valueLabelFormat={(x) => formatPrice(x)}
                sx={{
                  mt: 0.25,
                  mx: 1,
                  alignSelf: "stretch",
                  "& .MuiSlider-thumb": { width: 18, height: 18 },
                  "& .MuiSlider-valueLabel": { fontSize: "0.7rem" },
                }}
              />
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", px: 1, mt: -0.25 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
                  {formatPrice(budgetSlider.minValue)}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
                  {formatPrice(budgetSlider.maxValue)}
                </Typography>
              </Box>
            </Box>
          ) : null}

          {recentSearches.length > 0 && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: 32 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: "flex", alignItems: "center", gap: 0.6, fontWeight: 600, letterSpacing: "0.02em" }}>
                  <Clock size={13} aria-hidden />{t("search.recentSearches")}
                </Typography>
                <IconButton size="small" onClick={clearRecentSearches} aria-label={t("search.clearRecent")} sx={{ opacity: 0.55, borderRadius: "10px" }}>
                  <Trash2 size={14} />
                </IconButton>
              </Box>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, alignItems: "center" }}>
                {recentSearches.slice(0, 5).map((entry, i) => (
                  <Chip
                    key={i}
                    label={`${entry.from} → ${entry.to}`}
                    size="small"
                    variant="outlined"
                    clickable
                    onClick={() => handleRecentClick(entry)}
                    sx={{ borderRadius: "8px", height: 28, fontSize: "0.75rem", "& .MuiChip-label": { px: 1.1 } }}
                  />
                ))}
              </Box>
            </Box>
          )}

          <Button
            variant="contained"
            size="large"
            onClick={handleSearch}
            disabled={!from.trim() || !to.trim() || loading}
            startIcon={<Search size={18} />}
            fullWidth
            sx={{ height: { xs: 48, sm: 52 }, borderRadius: "14px", fontSize: "0.9375rem", fontWeight: 700, boxShadow: "var(--shadow-primary)" }}
          >
            {loading ? t("search.searching") : t("search.btn.search")}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
