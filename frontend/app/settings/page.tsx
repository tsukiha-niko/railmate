"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { MapPin, Navigation, Satellite, Edit3, TrendingUp, Check, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useUserContextStore } from "@/store/userContextStore";
import { useGeoLocation } from "@/hooks/useGeoLocation";
import { setUserLocation } from "@/services/chat";
import { useChatStore } from "@/store/chatStore";
import { useTheme } from "@/lib/theme/theme";
import { useI18n } from "@/lib/i18n/i18n";

export default function SettingsPage() {
  const location = useUserContextStore((s) => s.location);
  const preference = useUserContextStore((s) => s.preference);
  const setPreference = useUserContextStore((s) => s.setPreference);
  const setLocationStore = useUserContextStore((s) => s.setLocation);
  const userId = useChatStore((s) => s.userId);
  const { detectByIP, detectByGPS, loading, error } = useGeoLocation();
  const { theme, setTheme } = useTheme();
  const { locale, setLocale, t } = useI18n();

  const [manualCity, setManualCity] = useState("");
  const [manualStation, setManualStation] = useState("");
  const [saving, setSaving] = useState(false);

  const handleManualSet = useCallback(async () => {
    if (!manualCity.trim()) return;
    setSaving(true);
    try {
      const res = await setUserLocation({ city: manualCity.trim(), station: manualStation.trim() || undefined }, userId);
      if (res.success) {
        setLocationStore({ city: manualCity.trim(), station: manualStation.trim() || null, source: "manual" });
        setManualCity(""); setManualStation("");
      }
    } finally { setSaving(false); }
  }, [manualCity, manualStation, userId, setLocationStore]);

  const PREFS: { value: "fast" | "cheap" | "balanced"; label: string; desc: string }[] = [
    { value: "fast", label: t("settings.pref.fast"), desc: t("settings.pref.fast.desc") },
    { value: "cheap", label: t("settings.pref.cheap"), desc: t("settings.pref.cheap.desc") },
    { value: "balanced", label: t("settings.pref.balanced"), desc: t("settings.pref.balanced.desc") },
  ];

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-5">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-xl font-bold mb-1">{t("settings.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("settings.subtitle")}</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" />{t("settings.currentLocation")}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {location ? (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                <MapPin className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium">{location.city}</p>
                  {location.station && <p className="text-sm text-muted-foreground">{t("settings.recommendStation", { station: location.station })}</p>}
                  <Badge variant="secondary" className="mt-1.5 text-xs">
                    {location.source === "ip" ? t("settings.location.ip") : location.source === "gps" ? t("settings.location.gps") : t("settings.location.manual")}
                  </Badge>
                </div>
              </div>
            ) : (<p className="text-sm text-muted-foreground">{t("settings.location.unset")}</p>)}
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => detectByIP()} disabled={loading} className="gap-1.5"><Navigation className="h-3.5 w-3.5" />{t("settings.btn.ip")}</Button>
              <Button variant="outline" size="sm" onClick={() => detectByGPS()} disabled={loading} className="gap-1.5"><Satellite className="h-3.5 w-3.5" />{t("settings.btn.gps")}</Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Edit3 className="h-4 w-4 text-primary" />{t("settings.manual")}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">{t("settings.city")}</label>
                <Input value={manualCity} onChange={(e) => setManualCity(e.target.value)} placeholder={t("settings.cityPlaceholder")} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">{t("settings.stationOptional")}</label>
                <Input value={manualStation} onChange={(e) => setManualStation(e.target.value)} placeholder={t("settings.stationPlaceholder")} />
              </div>
            </div>
            <Button onClick={handleManualSet} disabled={!manualCity.trim() || saving} size="sm" className="gap-1.5">
              <Check className="h-3.5 w-3.5" />{saving ? t("settings.btn.saving") : t("settings.btn.confirm")}
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      <Separator />

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.125 }}>
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Settings className="h-4 w-4 text-primary" />{t("settings.appearance")}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium">{t("settings.theme")}</p>
              <div className="flex gap-2">
                <Button variant={theme === "system" ? "default" : "outline"} size="sm" onClick={() => setTheme("system")}>{t("settings.theme.system")}</Button>
                <Button variant={theme === "light" ? "default" : "outline"} size="sm" onClick={() => setTheme("light")}>{t("settings.theme.light")}</Button>
                <Button variant={theme === "dark" ? "default" : "outline"} size="sm" onClick={() => setTheme("dark")}>{t("settings.theme.dark")}</Button>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium">{t("settings.language")}</p>
              <div className="flex gap-2">
                <Button variant={locale === "zh-CN" ? "default" : "outline"} size="sm" onClick={() => setLocale("zh-CN")}>{t("settings.lang.zh")}</Button>
                <Button variant={locale === "en" ? "default" : "outline"} size="sm" onClick={() => setLocale("en")}>{t("settings.lang.en")}</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" />{t("settings.preference")}</CardTitle></CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {PREFS.map((p) => (
                <button key={p.value} onClick={() => setPreference(p.value)}
                  className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-all ${preference === p.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/20 hover:bg-secondary/50"}`}>
                  <div className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors ${preference === p.value ? "border-primary bg-primary" : "border-border"}`}>
                    {preference === p.value && <Check className="h-3 w-3 text-primary-foreground" />}
                  </div>
                  <div><p className="text-sm font-medium">{p.label}</p><p className="text-xs text-muted-foreground">{p.desc}</p></div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
