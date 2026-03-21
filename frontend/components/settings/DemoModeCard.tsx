"use client";

import { useEffect, useState } from "react";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import { ShieldCheck } from "lucide-react";
import { useI18n } from "@/lib/i18n/i18n";
import { getTicketingCapabilities } from "@/services/ticketing";

export function DemoModeCard() {
  const { t } = useI18n();
  const [demoMessage, setDemoMessage] = useState("");

  useEffect(() => {
    getTicketingCapabilities()
      .then((cap) => setDemoMessage(cap.message))
      .catch(() => setDemoMessage(""));
  }, []);

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 5,
        background: (th) =>
          `linear-gradient(135deg, ${th.palette.primary.main}14 0%, ${th.palette.background.paper}EA 50%, ${th.palette.background.paper}CC 100%)`,
      }}
    >
      <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 2 }}>
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
              <ShieldCheck size={20} style={{ color: "var(--primary)" }} />
              <Typography variant="subtitle1" fontWeight={700}>{t("settings.demoMode.title")}</Typography>
              <Chip label={t("settings.demoMode.locked")} size="small" />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {t("settings.demoMode.desc")}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
            <Typography variant="body2" fontWeight={600}>{t("settings.demoMode.switchLabel")}</Typography>
            <Switch checked disabled color="primary" />
          </Box>
        </Box>

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr", xl: "1fr 1fr 1fr" }, gap: 1.5, mt: 2 }}>
          {[
            { label: t("settings.demoMode.effect.buy"), desc: t("settings.demoMode.effect.buyDesc") },
            { label: t("settings.demoMode.effect.refund"), desc: t("settings.demoMode.effect.refundDesc") },
            { label: t("settings.demoMode.effect.debug"), desc: demoMessage || t("settings.demoMode.effect.debugDesc") },
          ].map((item) => (
            <Box key={item.label} sx={{ borderRadius: 4, border: 1, borderColor: (th: any) => `${th.palette.divider}70`, bgcolor: "background.paper", p: 2, minHeight: { xl: 120 } }}>
              <Typography variant="caption" color="text.secondary">{item.label}</Typography>
              <Typography variant="body2" fontWeight={500} sx={{ mt: 0.5 }}>{item.desc}</Typography>
            </Box>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
}
