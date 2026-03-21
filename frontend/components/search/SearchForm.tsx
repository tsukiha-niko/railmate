"use client";

import { useState, useCallback } from "react";
import { Search, ArrowLeftRight, MapPin, CalendarDays, Clock, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Chip from "@mui/material/Chip";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import ButtonBase from "@mui/material/ButtonBase";
import { StationAutocomplete } from "./StationAutocomplete";
import { useUserContextStore } from "@/store/userContextStore";
import { useSearchStore, type RecentSearch } from "@/store/searchStore";
import { getToday, getTomorrow, formatDateLocalized } from "@/utils/date";
import type { TrainSearchParams } from "@/types/trains";
import { useI18n } from "@/lib/i18n/i18n";

interface Props { onSearch: (params: TrainSearchParams) => void; loading?: boolean; }

export function SearchForm({ onSearch, loading }: Props) {
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
  const { t, locale } = useI18n();

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
        <CardContent sx={{ display: "flex", flexDirection: "column", gap: 2.5, p: { xs: 2.5, sm: 3 } }}>
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "flex-end", gap: { xs: 1, sm: 1.5 } }}>
            <StationAutocomplete
              label={t("search.from")}
              value={from}
              onChange={setFrom}
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
              sx={{
                border: 1,
                borderColor: (th) => `${th.palette.divider}80`,
                width: 40,
                height: 40,
                borderRadius: "12px",
                alignSelf: "center",
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
              placeholder={t("search.stationPlaceholder")}
              onEnter={handleSearch}
            />
          </Box>

          <Box sx={{ display: "grid", gridTemplateColumns: "1fr auto", alignItems: "flex-end", gap: { xs: 1, sm: 1.5 } }}>
            <TextField
              label={<Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}><CalendarDays size={14} />{t("search.departDate")}</Box>}
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              slotProps={{ htmlInput: { min: getToday() } }}
              fullWidth
            />
            <Box sx={{ display: "flex", gap: 0.75 }}>
              <Button variant={date === getToday() ? "contained" : "outlined"} size="small" onClick={() => setDate(getToday())} sx={{ borderRadius: "10px" }}>{t("search.today")}</Button>
              <Button variant={date === getTomorrow() ? "contained" : "outlined"} size="small" onClick={() => setDate(getTomorrow())} sx={{ borderRadius: "10px" }}>{t("search.tomorrow")}</Button>
            </Box>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
            <Typography variant="caption" color="text.secondary">{t("search.trainType")}</Typography>
            {TRAIN_TYPES.map((tt) => (
              <Chip
                key={tt.value}
                label={tt.label}
                size="small"
                variant={trainType === tt.value ? "filled" : "outlined"}
                color={trainType === tt.value ? "primary" : "default"}
                onClick={() => setTrainType(tt.value)}
                clickable
                sx={{ borderRadius: "8px" }}
              />
            ))}
          </Box>

          {recentSearches.length > 0 && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <Clock size={12} />{t("search.recentSearches")}
                </Typography>
                <IconButton size="small" onClick={clearRecentSearches} sx={{ opacity: 0.5 }}>
                  <Trash2 size={12} />
                </IconButton>
              </Box>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                {recentSearches.slice(0, 5).map((entry, i) => (
                  <Chip
                    key={i}
                    label={`${entry.from} → ${entry.to}`}
                    size="small"
                    variant="outlined"
                    clickable
                    onClick={() => handleRecentClick(entry)}
                    sx={{ borderRadius: "8px", fontSize: "0.75rem" }}
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

          <Typography variant="caption" color="text.secondary" align="center">
            {formatDateLocalized(date, locale === "en" ? "en" : "zh-CN")}
          </Typography>
        </CardContent>
      </Card>
    </motion.div>
  );
}
