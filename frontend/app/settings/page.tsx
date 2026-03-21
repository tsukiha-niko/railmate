"use client";

import { motion } from "framer-motion";
import Box from "@mui/material/Box";
import { PageHeader } from "@/components/common/PageHeader";
import { LocationSettings } from "@/components/settings/LocationSettings";
import { AppearanceSettings } from "@/components/settings/AppearanceSettings";
import { PreferenceSettings } from "@/components/settings/PreferenceSettings";
import { TripModeSettings } from "@/components/settings/TripModeSettings";
import { DemoModeCard } from "@/components/settings/DemoModeCard";
import { RailAccountSettings } from "@/components/settings/RailAccountSettings";
import { AIConfigSettings } from "@/components/settings/AIConfigSettings";
import { useUserContextStore } from "@/store/userContextStore";
import { useI18n } from "@/lib/i18n/i18n";
import { useResponsiveNavMode } from "@/hooks/useResponsiveNavMode";

export default function SettingsPage() {
  const location = useUserContextStore((s) => s.location);
  const preference = useUserContextStore((s) => s.preference);
  const planningMode = useUserContextStore((s) => s.planningMode);
  const { t } = useI18n();
  const { showBottomNav } = useResponsiveNavMode();

  const prefLabels: Record<string, string> = {
    fast: t("settings.pref.fast"),
    cheap: t("settings.pref.cheap"),
    balanced: t("settings.pref.balanced"),
  };
  const modeLabels: Record<string, string> = {
    efficient: t("settings.tripMode.efficient"),
    rail_experience: t("settings.tripMode.rail"),
    stopover_explore: t("settings.tripMode.stopover"),
  };

  return (
    <Box
      sx={{
        mx: "auto",
        width: "100%",
        maxWidth: 1480,
        flex: 1,
        overflowY: "auto",
        px: { xs: 1.5, sm: 2.5, lg: 3.5 },
        pt: { xs: 1.5, sm: 2.5 },
        pb: showBottomNav ? 12 : 3,
        display: "flex",
        flexDirection: "column",
        gap: 2.5,
      }}
    >
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Box sx={{ display: "grid", gap: 2.5, gridTemplateColumns: { xl: "1.5fr 1fr" } }}>
          <PageHeader
            title={t("settings.title")}
            subtitle={t("settings.subtitle")}
            badges={[t("settings.currentLocation"), t("settings.preference"), t("settings.tripMode")]}
          />
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", sm: "1fr 1fr 1fr", xl: "1fr" }, gap: 1.5 }}>
            <InfoCell label={t("settings.currentLocation")} value={location ? location.city : t("settings.location.unset")} />
            <InfoCell label={t("settings.preference")} value={prefLabels[preference] ?? ""} />
            <InfoCell label={t("settings.tripMode")} value={modeLabels[planningMode] ?? ""} />
          </Box>
        </Box>
      </motion.div>

      <Box sx={{ display: "grid", gap: 2.5, gridTemplateColumns: { xl: "7fr 5fr" } }}>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <LocationSettings />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.09 }}>
          <AppearanceSettings />
        </motion.div>
      </Box>

      <Box sx={{ display: "grid", gap: 2.5, gridTemplateColumns: { xl: "1fr 1fr" } }}>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
          <PreferenceSettings />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}>
          <TripModeSettings />
        </motion.div>
      </Box>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.155 }}>
        <DemoModeCard />
      </motion.div>

      <Box sx={{ display: "grid", gap: 2.5, gridTemplateColumns: { xl: "7fr 5fr" } }}>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}>
          <RailAccountSettings />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
          <AIConfigSettings />
        </motion.div>
      </Box>
    </Box>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <Box
      sx={{
        borderRadius: "0 10px 10px 0",
        borderLeft: 3,
        borderLeftColor: "primary.main",
        bgcolor: "background.paper",
        boxShadow: "var(--shadow-card)",
        px: 2,
        py: 1.5,
        transition: "all 0.2s ease",
        "&:hover": { boxShadow: "var(--shadow-card-hover)" },
      }}
    >
      <Box component="span" sx={{ display: "block", fontSize: "0.6875rem", color: "text.secondary", mb: 0.5 }}>{label}</Box>
      <Box component="span" sx={{ display: "block", fontSize: "0.9375rem", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</Box>
    </Box>
  );
}
