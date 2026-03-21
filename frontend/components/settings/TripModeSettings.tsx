"use client";

import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import { Bot } from "lucide-react";
import { SectionHeader } from "@/components/common/SectionHeader";
import { RadioCardGroup } from "@/components/common/RadioCardGroup";
import { useUserContextStore } from "@/store/userContextStore";
import { useI18n } from "@/lib/i18n/i18n";

export function TripModeSettings() {
  const planningMode = useUserContextStore((s) => s.planningMode);
  const setPlanningMode = useUserContextStore((s) => s.setPlanningMode);
  const { t } = useI18n();

  const options = [
    { value: "efficient" as const, label: t("settings.tripMode.efficient"), description: t("settings.tripMode.efficient.desc") },
    { value: "rail_experience" as const, label: t("settings.tripMode.rail"), description: t("settings.tripMode.rail.desc") },
    { value: "stopover_explore" as const, label: t("settings.tripMode.stopover"), description: t("settings.tripMode.stopover.desc") },
  ];

  return (
    <Card variant="outlined">
      <CardContent sx={{ display: "flex", flexDirection: "column", gap: 2, p: { xs: 2, sm: 2.5 } }}>
        <SectionHeader icon={<Bot />} title={t("settings.tripMode")} />
        <RadioCardGroup options={options} value={planningMode} onChange={setPlanningMode} />
      </CardContent>
    </Card>
  );
}
