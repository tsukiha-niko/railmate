"use client";

import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Button from "@mui/material/Button";
import ButtonGroup from "@mui/material/ButtonGroup";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { Settings } from "lucide-react";
import { SectionHeader } from "@/components/common/SectionHeader";
import { useTheme } from "@/lib/theme/theme";
import { useI18n } from "@/lib/i18n/i18n";

export function AppearanceSettings() {
  const { theme, setTheme } = useTheme();
  const { locale, setLocale, t } = useI18n();

  return (
    <Card variant="outlined" sx={{ borderRadius: "16px" }}>
      <CardContent sx={{ display: "flex", flexDirection: "column", gap: 2, p: { xs: 2, sm: 2.5 } }}>
        <SectionHeader icon={<Settings />} title={t("settings.appearance")} />

        <Box>
          <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: "uppercase", letterSpacing: 1 }}>
            {t("settings.theme")}
          </Typography>
          <ButtonGroup fullWidth size="small" sx={{ mt: 0.75 }}>
            <Button variant={theme === "system" ? "contained" : "outlined"} onClick={() => setTheme("system")}>{t("settings.theme.system")}</Button>
            <Button variant={theme === "light" ? "contained" : "outlined"} onClick={() => setTheme("light")}>{t("settings.theme.light")}</Button>
            <Button variant={theme === "dark" ? "contained" : "outlined"} onClick={() => setTheme("dark")}>{t("settings.theme.dark")}</Button>
          </ButtonGroup>
        </Box>

        <Box>
          <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: "uppercase", letterSpacing: 1 }}>
            {t("settings.language")}
          </Typography>
          <ButtonGroup fullWidth size="small" sx={{ mt: 0.75 }}>
            <Button variant={locale === "zh-CN" ? "contained" : "outlined"} onClick={() => setLocale("zh-CN")}>{t("settings.lang.zh")}</Button>
            <Button variant={locale === "en" ? "contained" : "outlined"} onClick={() => setLocale("en")}>{t("settings.lang.en")}</Button>
          </ButtonGroup>
        </Box>
      </CardContent>
    </Card>
  );
}
