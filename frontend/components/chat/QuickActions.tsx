"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import { Zap, Clock, ArrowRightLeft, MapPin, DollarSign } from "lucide-react";
import { useI18n } from "@/lib/i18n/i18n";
import { useUserContextStore } from "@/store/userContextStore";
import { getQuickestTrain, getCheapestTrain } from "@/services/trains";
import { getToday, getTomorrow } from "@/utils/date";

interface Props {
  onSelect: (text: string) => void;
}

export function QuickActions({ onSelect }: Props) {
  const { t } = useI18n();
  const router = useRouter();
  const location = useUserContextStore((s) => s.location);
  const favorites = useUserContextStore((s) => s.favoriteStations);
  const [loadingIdx, setLoadingIdx] = useState<number | null>(null);

  const handleQuickSearch = async (type: "quickest" | "cheapest", idx: number) => {
    if (!location?.station || favorites.length === 0) {
      onSelect(type === "quickest" ? t("chat.quick.fast.text") : t("chat.quick.cheap.text"));
      return;
    }

    const from = location.station;
    const to = favorites[0];
    const date = getToday();
    setLoadingIdx(idx);
    try {
      const fn = type === "quickest" ? getQuickestTrain : getCheapestTrain;
      const result = await fn({ from_station: from, to_station: to, travel_date: date });
      router.push(`/trains/${result.train_no}?date=${date}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&returnTo=/`);
    } catch {
      onSelect(type === "quickest" ? t("chat.quick.fast.text") : t("chat.quick.cheap.text"));
    } finally {
      setLoadingIdx(null);
    }
  };

  const ACTIONS = [
    { icon: Zap, label: t("chat.quick.fast.label"), color: "#F59E0B", onClick: (idx: number) => handleQuickSearch("quickest", idx) },
    { icon: DollarSign, label: t("chat.quick.cheap.label"), color: "#10B981", onClick: (idx: number) => handleQuickSearch("cheapest", idx) },
    { icon: Clock, label: t("chat.quick.tomorrow.label"), color: "#3B82F6", onClick: () => onSelect(t("chat.quick.tomorrow.text")) },
    { icon: ArrowRightLeft, label: t("chat.quick.transfer.label"), color: "#8B5CF6", onClick: () => onSelect(t("chat.quick.transfer.text")) },
  ];

  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "1fr 1fr 1fr 1fr" }, gap: 1, width: "100%" }}>
      {ACTIONS.map((action, i) => (
        <motion.div
          key={action.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 + i * 0.06, ease: [0.22, 1, 0.36, 1] }}
        >
          <ButtonBase
            onClick={() => action.onClick(i)}
            disabled={loadingIdx !== null}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              p: 2,
              width: "100%",
              justifyContent: "flex-start",
              borderRadius: "12px",
              bgcolor: "background.paper",
              border: 1,
              borderColor: (th) => `${th.palette.divider}60`,
              borderLeft: `3px solid ${action.color}`,
              textAlign: "left",
              transition: "all 0.2s ease",
              "&:hover": {
                boxShadow: `0 4px 16px -4px ${action.color}30`,
                transform: "translateY(-1px)",
              },
            }}
          >
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: `${action.color}1A`,
                flexShrink: 0,
              }}
            >
              {loadingIdx === i ? (
                <CircularProgress size={14} sx={{ color: action.color }} />
              ) : (
                <action.icon size={16} style={{ color: action.color }} />
              )}
            </Box>
            <Typography variant="body2" fontWeight={600}>{action.label}</Typography>
          </ButtonBase>
        </motion.div>
      ))}
    </Box>
  );
}
