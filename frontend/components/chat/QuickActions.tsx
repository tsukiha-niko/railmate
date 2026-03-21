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
    { icon: Zap, label: t("chat.quick.fast.label"), text: t("chat.quick.fast.text"), color: "#F59E0B" },
    { icon: Clock, label: t("chat.quick.tomorrow.label"), text: t("chat.quick.tomorrow.text"), color: "#3B82F6" },
    { icon: ArrowRightLeft, label: t("chat.quick.transfer.label"), text: t("chat.quick.transfer.text"), color: "#10B981" },
    { icon: MapPin, label: t("chat.quick.nearby.label"), text: t("chat.quick.nearby.text"), color: "#8B5CF6" },
  ];

  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5, width: "100%", pt: 0.5 }}>
      {ACTIONS.map((action, i) => (
        <motion.div key={action.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: i * 0.05 }}>
          <Card variant="outlined" sx={{ "&:hover": { borderColor: "primary.main" } }}>
            <CardActionArea onClick={() => onSelect(action.text)} sx={{ display: "flex", alignItems: "center", gap: 1.5, p: 1.5, justifyContent: "flex-start" }}>
              <action.icon size={16} style={{ color: action.color }} />
              <Typography variant="body2">{action.label}</Typography>
            </CardActionArea>
          </Card>
        </motion.div>
      ))}
    </Box>
  );
}
