"use client";

import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import { TrendingUp } from "lucide-react";
import { SectionHeader } from "@/components/common/SectionHeader";
import { RadioCardGroup } from "@/components/common/RadioCardGroup";
import { useUserContextStore } from "@/store/userContextStore";
import { useI18n } from "@/lib/i18n/i18n";

export function PreferenceSettings() {
  const preference = useUserContextStore((s) => s.preference);
  const setPreference = useUserContextStore((s) => s.setPreference);
  const { t } = useI18n();

  const options = [
    { value: "fast" as const, label: t("settings.pref.fast"), description: t("settings.pref.fast.desc") },
    { value: "cheap" as const, label: t("settings.pref.cheap"), description: t("settings.pref.cheap.desc") },
    { value: "balanced" as const, label: t("settings.pref.balanced"), description: t("settings.pref.balanced.desc") },
  ];

  return (
    <Card variant="outlined" sx={{ borderRadius: 5 }}>
      <CardContent sx={{ display: "flex", flexDirection: "column", gap: 2, p: { xs: 2, sm: 2.5 } }}>
        <SectionHeader icon={<TrendingUp />} title={t("settings.preference")} />
        <RadioCardGroup options={options} value={preference} onChange={setPreference} />
      </CardContent>
    </Card>
  );
}
