"use client";

import { motion } from "framer-motion";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import { TrainFront, Search } from "lucide-react";
import { TrainCard } from "./TrainCard";
import type { TrainSearchResult } from "@/types/trains";
import { useI18n } from "@/lib/i18n/i18n";
import { getLowestFare } from "@/utils/format";

interface Props {
  trains: TrainSearchResult[];
  date: string;
  loading?: boolean;
  emptyMessage?: string;
}

function uid(t: TrainSearchResult) {
  return `${t.train_no}:${t.from_station}:${t.departure_time}`;
}

function annotateTrains(trains: TrainSearchResult[], tr: (key: string) => string) {
  if (trains.length === 0) return [];
  const cheapest = trains.reduce((a, b) => (getLowestFare(a)?.price ?? Infinity) < (getLowestFare(b)?.price ?? Infinity) ? a : b);
  const fastest = trains.reduce((a, b) => a.duration_minutes < b.duration_minutes ? a : b);
  const earliest = trains.reduce((a, b) => a.departure_time < b.departure_time ? a : b);
  const eId = uid(earliest), fId = uid(fastest), cId = uid(cheapest);
  return trains.map((train) => {
    const id = uid(train);
    const tags: string[] = [];
    if (id === eId) tags.push(tr("tickets.tag.earliest"));
    if (id === fId && fId !== eId) tags.push(tr("tickets.tag.fastest"));
    if (id === cId && cId !== eId && cId !== fId) tags.push(tr("tickets.tag.cheapest"));
    return { train, tags };
  });
}

export function TrainCardList({ trains, date, loading, emptyMessage }: Props) {
  const { t, locale } = useI18n();

  if (loading) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, py: 6, borderRadius: 5, border: 1, borderColor: (th: any) => `${th.palette.divider}70`, bgcolor: "background.paper" }}>
        <Box sx={{ position: "relative" }}>
          <CircularProgress size={48} />
          <Box sx={{ position: "absolute", top: -4, right: -4, width: 20, height: 20, borderRadius: "50%", bgcolor: "primary.main", opacity: 0.2, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Search size={12} />
          </Box>
        </Box>
        <Box sx={{ textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary" sx={{ display: "flex", alignItems: "center", gap: 1, justifyContent: "center" }}>
            <TrainFront size={14} />
            {locale === "en" ? "Querying real-time trains..." : "正在查询实时车次..."}
          </Typography>
        </Box>
      </Box>
    );
  }

  if (trains.length === 0) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 8, color: "text.secondary" }}>
          <TrainFront size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
          <Typography variant="body2">{emptyMessage || t("tickets.empty")}</Typography>
        </Box>
      </motion.div>
    );
  }

  const annotated = annotateTrains(trains, t);

  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: { xs: 1.5, sm: 2 } }}>
      {annotated.map(({ train, tags }, i) => (
        <TrainCard key={`${train.train_no}:${train.from_station}:${train.departure_time}:${i}`} train={train} date={date} index={i} tags={tags} />
      ))}
    </Box>
  );
}
