"use client";

import { motion } from "framer-motion";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Typography from "@mui/material/Typography";
import { Zap, Clock, ArrowRightLeft, MapPin } from "lucide-react";
import { useI18n } from "@/lib/i18n/i18n";

interface Props {
  onSelect: (text: string) => void;
}

export function QuickActions({ onSelect }: Props) {
  const { t } = useI18n();
  const ACTIONS = [
    { icon: Zap, label: t("chat.quick.fast.label"), text: t("chat.quick.fast.text"), color: "#F59E0B" },
    { icon: Clock, label: t("chat.quick.tomorrow.label"), text: t("chat.quick.tomorrow.text"), color: "#3B82F6" },
    { icon: ArrowRightLeft, label: t("chat.quick.transfer.label"), text: t("chat.quick.transfer.text"), color: "#10B981" },
    { icon: MapPin, label: t("chat.quick.nearby.label"), text: t("chat.quick.nearby.text"), color: "#8B5CF6" },
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
            onClick={() => onSelect(action.text)}
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
              <action.icon size={16} style={{ color: action.color }} />
            </Box>
            <Typography variant="body2" fontWeight={600}>{action.label}</Typography>
          </ButtonBase>
        </motion.div>
      ))}
    </Box>
  );
}
