"use client";

import { motion } from "framer-motion";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { Zap, Clock, ArrowRightLeft, MapPin } from "lucide-react";
import { useI18n } from "@/lib/i18n/i18n";

interface Props {
  onSelect: (text: string) => void;
}

export function QuickActions({ onSelect }: Props) {
  const { t } = useI18n();
  const ACTIONS = [
    { icon: Zap, label: t("chat.quick.fast.label"), text: t("chat.quick.fast.text"), color: "#F59E0B", bg: "#F59E0B14" },
    { icon: Clock, label: t("chat.quick.tomorrow.label"), text: t("chat.quick.tomorrow.text"), color: "#3B82F6", bg: "#3B82F614" },
    { icon: ArrowRightLeft, label: t("chat.quick.transfer.label"), text: t("chat.quick.transfer.text"), color: "#10B981", bg: "#10B98114" },
    { icon: MapPin, label: t("chat.quick.nearby.label"), text: t("chat.quick.nearby.text"), color: "#8B5CF6", bg: "#8B5CF614" },
  ];

  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5, width: "100%", pt: 1 }}>
      {ACTIONS.map((action, i) => (
        <motion.div
          key={action.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 + i * 0.06, ease: [0.22, 1, 0.36, 1] }}
        >
          <Card
            variant="outlined"
            sx={{
              borderColor: (th) => `${th.palette.divider}60`,
              borderRadius: 4,
              transition: "all 0.2s ease",
              "&:hover": {
                borderColor: action.color,
                boxShadow: `0 8px 24px -8px ${action.color}20`,
                transform: "translateY(-1px)",
              },
            }}
          >
            <CardActionArea
              onClick={() => onSelect(action.text)}
              sx={{ display: "flex", alignItems: "center", gap: 1.5, p: 2, justifyContent: "flex-start" }}
            >
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: 2.5,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  bgcolor: action.bg,
                  flexShrink: 0,
                }}
              >
                <action.icon size={16} style={{ color: action.color }} />
              </Box>
              <Typography variant="body2" fontWeight={600}>{action.label}</Typography>
            </CardActionArea>
          </Card>
        </motion.div>
      ))}
    </Box>
  );
}
