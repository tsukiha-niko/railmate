"use client";

import { useState, useCallback } from "react";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import { MapPin, Navigation, Satellite, Edit3, Check } from "lucide-react";
import { SectionHeader } from "@/components/common/SectionHeader";
import { useUserContextStore } from "@/store/userContextStore";
import { useGeoLocation } from "@/hooks/useGeoLocation";
import { useChatStore } from "@/store/chatStore";
import { setUserLocation } from "@/services/chat";
import { useI18n } from "@/lib/i18n/i18n";

export function LocationSettings() {
  const location = useUserContextStore((s) => s.location);
  const setLocationStore = useUserContextStore((s) => s.setLocation);
  const userId = useChatStore((s) => s.userId);
  const { detectByIP, detectByGPS, loading, error } = useGeoLocation();
  const { t } = useI18n();

  const [manualCity, setManualCity] = useState("");
  const [manualStation, setManualStation] = useState("");
  const [saving, setSaving] = useState(false);

  const currentSourceLabel = location
    ? location.source === "ip" ? t("settings.location.ip")
      : location.source === "gps" ? t("settings.location.gps")
      : t("settings.location.manual")
    : null;

  const handleManualSet = useCallback(async () => {
    if (!manualCity.trim()) return;
    setSaving(true);
    try {
      const res = await setUserLocation({ city: manualCity.trim(), station: manualStation.trim() || undefined }, userId);
      if (res.success) {
        setLocationStore({ city: manualCity.trim(), station: manualStation.trim() || null, source: "manual" });
        setManualCity("");
        setManualStation("");
      }
    } finally {
      setSaving(false);
    }
  }, [manualCity, manualStation, userId, setLocationStore]);

  return (
    <Card variant="outlined">
      <CardContent sx={{ display: "flex", flexDirection: "column", gap: 2, p: { xs: 2, sm: 2.5 } }}>
        <SectionHeader icon={<MapPin />} title={t("settings.currentLocation")} />

        {location ? (
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, borderRadius: 3, border: 1, borderColor: "divider", bgcolor: "action.hover", p: 1.5 }}>
            <MapPin size={20} style={{ marginTop: 2, flexShrink: 0, color: "var(--primary)" }} />
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" fontWeight={700} noWrap>{location.city}</Typography>
              {location.station && (
                <Typography variant="caption" color="text.secondary" noWrap>
                  {t("settings.recommendStation", { station: location.station })}
                </Typography>
              )}
              {currentSourceLabel && <Chip label={currentSourceLabel} size="small" sx={{ mt: 0.75 }} />}
            </Box>
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary">{t("settings.location.unset")}</Typography>
        )}

        {error && <Alert severity="error" variant="outlined" sx={{ py: 0.5 }}>{error}</Alert>}

        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 }}>
          <Button variant="outlined" size="small" onClick={() => detectByIP()} disabled={loading} startIcon={<Navigation size={14} />}>
            {t("settings.btn.ip")}
          </Button>
          <Button variant="outlined" size="small" onClick={() => detectByGPS()} disabled={loading} startIcon={<Satellite size={14} />}>
            {t("settings.btn.gps")}
          </Button>
        </Box>

        <Divider />

        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, borderRadius: 3, border: 1, borderColor: "divider", bgcolor: "background.paper", p: 1.5 }}>
          <SectionHeader icon={<Edit3 />} title={t("settings.manual")} />
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5 }}>
            <TextField label={t("settings.city")} value={manualCity} onChange={(e) => setManualCity(e.target.value)} placeholder={t("settings.cityPlaceholder")} fullWidth />
            <TextField label={t("settings.stationOptional")} value={manualStation} onChange={(e) => setManualStation(e.target.value)} placeholder={t("settings.stationPlaceholder")} fullWidth />
          </Box>
          <Button variant="contained" size="small" onClick={handleManualSet} disabled={!manualCity.trim() || saving} startIcon={<Check size={14} />} sx={{ alignSelf: "flex-start" }}>
            {saving ? t("settings.btn.saving") : t("settings.btn.confirm")}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}
