"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  MapPin, Navigation, Satellite, Edit3, TrendingUp, Check,
  Settings, Bot, Eye, EyeOff, Loader2, LogIn, LogOut,
  RefreshCw, ShieldOff, Ticket,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useUserContextStore } from "@/store/userContextStore";
import { useGeoLocation } from "@/hooks/useGeoLocation";
import { setUserLocation } from "@/services/chat";
import { getConfig, updateAIConfig } from "@/services/admin";
import {
  get12306Status, create12306QRCode, poll12306QRCode, logout12306,
  type Auth12306Status,
} from "@/services/auth";
import { useChatStore } from "@/store/chatStore";
import { useTheme } from "@/lib/theme/theme";
import { useI18n } from "@/lib/i18n/i18n";

export default function SettingsPage() {
  const location = useUserContextStore((s) => s.location);
  const preference = useUserContextStore((s) => s.preference);
  const setPreference = useUserContextStore((s) => s.setPreference);
  const planningMode = useUserContextStore((s) => s.planningMode);
  const setPlanningMode = useUserContextStore((s) => s.setPlanningMode);
  const setLocationStore = useUserContextStore((s) => s.setLocation);
  const userId = useChatStore((s) => s.userId);
  const { detectByIP, detectByGPS, loading, error } = useGeoLocation();
  const { theme, setTheme } = useTheme();
  const { locale, setLocale, t } = useI18n();

  const [manualCity, setManualCity] = useState("");
  const [manualStation, setManualStation] = useState("");
  const [saving, setSaving] = useState(false);

  // ── 12306 登录 ──────────────────────────────────────────────────────────────
  const [rail12306, setRail12306] = useState<Auth12306Status | null>(null);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [qrStatus, setQrStatus] = useState<"idle" | "loading" | "waiting" | "scanned" | "confirmed" | "expired" | "error">("idle");
  const [qrMsg, setQrMsg] = useState("");
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [railLoading, setRailLoading] = useState(false);

  const clearQrPoll = useCallback(() => {
    if (pollTimer.current) { clearInterval(pollTimer.current); pollTimer.current = null; }
  }, []);

  const loadRailStatus = useCallback(async () => {
    try {
      const s = await get12306Status();
      setRail12306(s);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadRailStatus(); }, [loadRailStatus]);

  const handleStartQR = useCallback(async () => {
    clearQrPoll();
    setQrStatus("loading");
    setQrMsg("");
    try {
      const res = await create12306QRCode();
      if (!res.success || !res.uuid || !res.image) {
        setQrStatus("error");
        setQrMsg(res.message || (locale === "en" ? "Failed to fetch QR code" : "获取二维码失败"));
        return;
      }
      setQrImage(res.image);
      setQrStatus("waiting");

      // 每 2s 轮询一次
      pollTimer.current = setInterval(async () => {
        try {
          const poll = await poll12306QRCode(res.uuid!);
          if (poll.status === "scanned") {
            setQrStatus("scanned");
          } else if (poll.status === "confirmed") {
            clearQrPoll();
            setQrStatus("confirmed");
            setQrMsg(poll.username ? (locale === "en" ? `Welcome, ${poll.username}` : `欢迎，${poll.username}`) : (locale === "en" ? "Login successful" : "登录成功"));
            setQrImage(null);
            await loadRailStatus();
          } else if (poll.status === "expired") {
            clearQrPoll();
            setQrStatus("expired");
            setQrMsg(locale === "en" ? "QR code expired, please refresh" : "二维码已过期，请重新获取");
          } else if (poll.status === "error") {
            clearQrPoll();
            setQrStatus("error");
            setQrMsg(poll.message || (locale === "en" ? "Polling failed" : "轮询出错"));
          }
        } catch { /* network error, keep polling */ }
      }, 2000);
    } catch (e) {
      setQrStatus("error");
      setQrMsg(e instanceof Error ? e.message : (locale === "en" ? "Network error" : "网络错误"));
    }
  }, [clearQrPoll, loadRailStatus, locale]);

  // QR 展示超时自动取消（3分钟）
  useEffect(() => {
    if (qrStatus === "waiting") {
      const t = setTimeout(() => {
        clearQrPoll();
        setQrStatus("expired");
        setQrMsg(locale === "en" ? "QR code expired, please refresh" : "二维码已过期，请重新获取");
      }, 3 * 60 * 1000);
      return () => clearTimeout(t);
    }
  }, [qrStatus, clearQrPoll, locale]);

  useEffect(() => () => clearQrPoll(), [clearQrPoll]);

  const handleLogout12306 = useCallback(async () => {
    setRailLoading(true);
    try {
      await logout12306();
      setRail12306(null);
      setQrStatus("idle");
      setQrImage(null);
      setQrMsg("");
    } finally { setRailLoading(false); }
  }, []);

  // ── AI config ────────────────────────────────────────────────────────────────
  const [aiKey, setAiKey] = useState("");
  const [aiBaseUrl, setAiBaseUrl] = useState("");
  const [aiModel, setAiModel] = useState("");
  const [aiConfigured, setAiConfigured] = useState(false);
  const [aiKeyMasked, setAiKeyMasked] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [aiSaving, setAiSaving] = useState(false);
  const [aiMsg, setAiMsg] = useState("");

  useEffect(() => {
    getConfig().then((c) => {
      setAiBaseUrl(c.openai_base_url);
      setAiModel(c.openai_model);
      setAiConfigured(c.openai_api_configured);
      setAiKeyMasked(c.openai_api_key_masked);
    }).catch(() => {});
  }, []);

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

  const handleSaveAIConfig = useCallback(async () => {
    setAiSaving(true);
    setAiMsg("");
    try {
      const params: Record<string, string> = {};
      if (aiKey) params.api_key = aiKey;
      if (aiBaseUrl) params.base_url = aiBaseUrl;
      if (aiModel) params.model = aiModel;
      const res = await updateAIConfig(params);
      if (res.success) {
        setAiConfigured(res.openai_api_configured);
        setAiKeyMasked(res.openai_api_key_masked);
        setAiKey("");
        setAiMsg(locale === "en" ? "Saved!" : "已保存！");
        setTimeout(() => setAiMsg(""), 3000);
      }
    } catch (err) {
      setAiMsg(err instanceof Error ? err.message : (locale === "en" ? "Failed" : "保存失败"));
    } finally { setAiSaving(false); }
  }, [aiKey, aiBaseUrl, aiModel, locale]);

  const PREFS: { value: "fast" | "cheap" | "balanced"; label: string; desc: string }[] = [
    { value: "fast", label: t("settings.pref.fast"), desc: t("settings.pref.fast.desc") },
    { value: "cheap", label: t("settings.pref.cheap"), desc: t("settings.pref.cheap.desc") },
    { value: "balanced", label: t("settings.pref.balanced"), desc: t("settings.pref.balanced.desc") },
  ];
  const MODES = [
    { value: "efficient", label: t("settings.tripMode.efficient"), desc: t("settings.tripMode.efficient.desc") },
    { value: "rail_experience", label: t("settings.tripMode.rail"), desc: t("settings.tripMode.rail.desc") },
    { value: "stopover_explore", label: t("settings.tripMode.stopover"), desc: t("settings.tripMode.stopover.desc") },
  ] as const;

  const currentPreferenceLabel = PREFS.find((item) => item.value === preference)?.label ?? "";
  const currentModeLabel = MODES.find((item) => item.value === planningMode)?.label ?? "";
  const currentLocationSourceLabel = location
    ? location.source === "ip"
      ? t("settings.location.ip")
      : location.source === "gps"
        ? t("settings.location.gps")
        : t("settings.location.manual")
    : null;

  return (
    <div className="mx-auto flex w-full max-w-[1320px] flex-1 flex-col overflow-y-auto px-2 pb-24 pt-2 sm:px-4 sm:pb-6 sm:pt-4 lg:px-6">
      <div className="space-y-3 sm:space-y-4">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,1fr)] xl:items-stretch xl:gap-4">
            <Card className="h-full border-border/70 bg-gradient-to-br from-primary/[0.1] via-card/90 to-card/75">
              <CardContent className="flex h-full flex-col justify-center p-4 sm:p-5">
                <h1 className="text-xl font-bold sm:text-2xl">{t("settings.title")}</h1>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">{t("settings.subtitle")}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Badge variant="secondary" className="text-[11px]">{t("settings.currentLocation")}</Badge>
                  <Badge variant="secondary" className="text-[11px]">{t("settings.preference")}</Badge>
                  <Badge variant="secondary" className="text-[11px]">{t("settings.tripMode")}</Badge>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-1 xl:grid-rows-3 xl:gap-3">
              <div className="rounded-xl border border-border/65 bg-card/70 px-3 py-2.5 sm:min-h-[64px] xl:flex xl:min-h-0 xl:flex-col xl:justify-center xl:px-4 xl:py-3">
                <p className="text-[11px] text-muted-foreground">{t("settings.currentLocation")}</p>
                <p className="truncate text-sm font-semibold">{location ? location.city : t("settings.location.unset")}</p>
              </div>
              <div className="rounded-xl border border-border/65 bg-card/70 px-3 py-2.5 sm:min-h-[64px] xl:flex xl:min-h-0 xl:flex-col xl:justify-center xl:px-4 xl:py-3">
                <p className="text-[11px] text-muted-foreground">{t("settings.preference")}</p>
                <p className="truncate text-sm font-semibold">{currentPreferenceLabel}</p>
              </div>
              <div className="col-span-2 rounded-xl border border-border/65 bg-card/70 px-3 py-2.5 sm:col-span-1 sm:min-h-[64px] xl:col-span-1 xl:flex xl:min-h-0 xl:flex-col xl:justify-center xl:px-4 xl:py-3">
                <p className="text-[11px] text-muted-foreground">{t("settings.tripMode")}</p>
                <p className="truncate text-sm font-semibold">{currentModeLabel}</p>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid gap-3 xl:grid-cols-12 xl:items-stretch xl:gap-4">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="xl:col-span-7 xl:h-full"
          >
            <Card className="h-full">
              <CardHeader className="px-4 py-4 sm:px-5 sm:py-4">
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                  <MapPin className="h-4 w-4 text-primary" />
                  {t("settings.currentLocation")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 px-4 pb-4 pt-0 sm:px-5 sm:pb-5">
                {location ? (
                  <div className="flex items-start gap-3 rounded-xl border border-border/70 bg-secondary/30 p-3">
                    <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold sm:text-base">{location.city}</p>
                      {location.station && (
                        <p className="truncate text-xs text-muted-foreground sm:text-sm">
                          {t("settings.recommendStation", { station: location.station })}
                        </p>
                      )}
                      {currentLocationSourceLabel ? (
                        <Badge variant="secondary" className="mt-1.5 text-[11px]">
                          {currentLocationSourceLabel}
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{t("settings.location.unset")}</p>
                )}

                {error && <p className="text-xs text-destructive">{error}</p>}

                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" onClick={() => detectByIP()} disabled={loading} className="gap-1.5">
                    <Navigation className="h-3.5 w-3.5" />
                    {t("settings.btn.ip")}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => detectByGPS()} disabled={loading} className="gap-1.5">
                    <Satellite className="h-3.5 w-3.5" />
                    {t("settings.btn.gps")}
                  </Button>
                </div>

                <Separator />

                <div className="space-y-2.5 rounded-xl border border-border/70 bg-card/55 p-3">
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <Edit3 className="h-4 w-4 text-primary" />
                    {t("settings.manual")}
                  </p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-muted-foreground">{t("settings.city")}</label>
                      <Input
                        value={manualCity}
                        onChange={(e) => setManualCity(e.target.value)}
                        placeholder={t("settings.cityPlaceholder")}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-muted-foreground">{t("settings.stationOptional")}</label>
                      <Input
                        value={manualStation}
                        onChange={(e) => setManualStation(e.target.value)}
                        placeholder={t("settings.stationPlaceholder")}
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>
                  <Button
                    onClick={handleManualSet}
                    disabled={!manualCity.trim() || saving}
                    size="sm"
                    className="w-full gap-1.5 sm:w-auto"
                  >
                    <Check className="h-3.5 w-3.5" />
                    {saving ? t("settings.btn.saving") : t("settings.btn.confirm")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.09 }}
            className="xl:col-span-5 xl:h-full"
          >
            <Card className="h-full">
              <CardHeader className="px-4 py-4 sm:px-5 sm:py-4">
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                  <Settings className="h-4 w-4 text-primary" />
                  {t("settings.appearance")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 px-4 pb-4 pt-0 sm:px-5 sm:pb-5">
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">{t("settings.theme")}</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    <Button variant={theme === "system" ? "default" : "outline"} size="sm" onClick={() => setTheme("system")} className="h-8">
                      {t("settings.theme.system")}
                    </Button>
                    <Button variant={theme === "light" ? "default" : "outline"} size="sm" onClick={() => setTheme("light")} className="h-8">
                      {t("settings.theme.light")}
                    </Button>
                    <Button variant={theme === "dark" ? "default" : "outline"} size="sm" onClick={() => setTheme("dark")} className="h-8">
                      {t("settings.theme.dark")}
                    </Button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">{t("settings.language")}</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    <Button variant={locale === "zh-CN" ? "default" : "outline"} size="sm" onClick={() => setLocale("zh-CN")} className="h-8">
                      {t("settings.lang.zh")}
                    </Button>
                    <Button variant={locale === "en" ? "default" : "outline"} size="sm" onClick={() => setLocale("en")} className="h-8">
                      {t("settings.lang.en")}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <div className="grid gap-3 xl:grid-cols-2 xl:items-stretch xl:gap-4">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="xl:h-full">
            <Card className="h-full">
              <CardHeader className="px-4 py-4 sm:px-5 sm:py-4">
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  {t("settings.preference")}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-0 sm:px-5 sm:pb-5">
                <div className="grid gap-1.5">
                  {PREFS.map((p) => (
                    <button
                      key={p.value}
                      onClick={() => setPreference(p.value)}
                      className={`flex min-h-[56px] items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition-all ${preference === p.value ? "border-primary bg-primary/7" : "border-border hover:border-primary/20 hover:bg-secondary/45"}`}
                    >
                      <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${preference === p.value ? "border-primary bg-primary" : "border-border"}`}>
                        {preference === p.value && <Check className="h-3 w-3 text-primary-foreground" />}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{p.label}</p>
                        <p className="line-clamp-2 text-xs leading-4 text-muted-foreground">{p.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }} className="xl:h-full">
            <Card className="h-full">
              <CardHeader className="px-4 py-4 sm:px-5 sm:py-4">
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                  <Bot className="h-4 w-4 text-primary" />
                  {t("settings.tripMode")}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-0 sm:px-5 sm:pb-5">
                <div className="grid gap-1.5">
                  {MODES.map((mode) => (
                    <button
                      key={mode.value}
                      onClick={() => setPlanningMode(mode.value)}
                      className={`flex min-h-[56px] items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition-all ${planningMode === mode.value ? "border-primary bg-primary/7" : "border-border hover:border-primary/20 hover:bg-secondary/45"}`}
                    >
                      <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${planningMode === mode.value ? "border-primary bg-primary" : "border-border"}`}>
                        {planningMode === mode.value && <Check className="h-3 w-3 text-primary-foreground" />}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{mode.label}</p>
                        <p className="line-clamp-2 text-xs leading-4 text-muted-foreground">{mode.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <Separator className="my-1" />

        <div className="grid gap-3 2xl:grid-cols-12 2xl:items-stretch 2xl:gap-4">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16 }}
            className="2xl:col-span-7 2xl:h-full"
          >
            <Card className="h-full">
              <CardHeader className="px-4 py-4 sm:px-5 sm:py-4">
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                  <Ticket className="h-4 w-4 text-primary" />
                  {locale === "en" ? "12306 Account" : "12306 账户登录"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 px-4 pb-4 pt-0 sm:px-5 sm:pb-5">
                <p className="text-xs leading-relaxed text-muted-foreground">{t("settings.railAccount.desc")}</p>

                {rail12306?.logged_in ? (
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/8 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {rail12306.username || (locale === "en" ? "Logged in" : "已登录")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {locale === "en"
                          ? `Cookie valid for ${rail12306.remaining_days} day(s)`
                          : `Cookie 剩余有效期 ${rail12306.remaining_days} 天`}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleLogout12306} disabled={railLoading} className="shrink-0 gap-1.5">
                      {railLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />}
                      {locale === "en" ? "Log out" : "退出"}
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-muted/35 px-3 py-2.5 text-xs text-muted-foreground sm:text-sm">
                    <ShieldOff className="h-4 w-4 shrink-0" />
                    {locale === "en" ? "Not logged in — ticket prices may be unavailable." : "未登录 — 票价查询可能无法正常显示。"}
                  </div>
                )}

                {!rail12306?.logged_in && (
                  <div className="space-y-2.5">
                    {(qrStatus === "waiting" || qrStatus === "scanned") && qrImage && (
                      <div className="flex flex-col items-center gap-2">
                        <div className={`relative overflow-hidden rounded-xl border-2 transition-colors ${qrStatus === "scanned" ? "border-amber-400" : "border-border"}`}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={`data:image/png;base64,${qrImage}`}
                            alt="12306 登录二维码"
                            className="block h-40 w-40 object-contain sm:h-48 sm:w-48"
                          />
                          {qrStatus === "scanned" && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm">
                              <Loader2 className="mb-1 h-7 w-7 animate-spin text-white" />
                              <span className="text-xs font-medium text-white">{locale === "en" ? "Confirming…" : "请在手机上确认登录"}</span>
                            </div>
                          )}
                        </div>
                        <p className="text-center text-xs text-muted-foreground">
                          {qrStatus === "scanned"
                            ? (locale === "en" ? "Scanned — confirm on your phone" : "已扫描，请在 12306 App 确认")
                            : (locale === "en" ? "Open 12306 App → scan QR to log in" : "打开 12306 App → 扫一扫 登录")}
                        </p>
                      </div>
                    )}

                    {qrStatus === "confirmed" && (
                      <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-600 dark:text-emerald-400">
                        <Check className="h-4 w-4 shrink-0" />
                        {qrMsg || (locale === "en" ? "Login successful!" : "登录成功！")}
                      </div>
                    )}
                    {(qrStatus === "expired" || qrStatus === "error") && (
                      <p className="text-center text-xs text-destructive">{qrMsg}</p>
                    )}

                    <div className="grid gap-2 sm:flex sm:flex-wrap">
                      {(qrStatus === "idle" || qrStatus === "expired" || qrStatus === "error" || qrStatus === "confirmed") && (
                        <Button size="sm" onClick={handleStartQR} className="w-full gap-1.5 sm:w-auto">
                          <LogIn className="h-3.5 w-3.5" />
                          {locale === "en" ? "Scan QR to log in" : "扫码登录"}
                        </Button>
                      )}
                      {(qrStatus === "waiting" || qrStatus === "scanned" || qrStatus === "loading") && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleStartQR}
                          disabled={qrStatus === "loading"}
                          className="w-full gap-1.5 sm:w-auto"
                        >
                          {qrStatus === "loading"
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <RefreshCw className="h-3.5 w-3.5" />}
                          {locale === "en" ? "Refresh QR" : "刷新二维码"}
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            className="2xl:col-span-5 2xl:h-full"
          >
            <Card className="h-full">
              <CardHeader className="px-4 py-4 sm:px-5 sm:py-4">
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                  <Bot className="h-4 w-4 text-primary" />
                  {locale === "en" ? "AI Configuration" : "AI 模型配置"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 px-4 pb-4 pt-0 sm:px-5 sm:pb-5">
                <div className="rounded-xl border border-border/70 bg-card/55 px-3 py-2.5">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-muted-foreground">{locale === "en" ? "Status:" : "状态："}</span>
                    <Badge variant={aiConfigured ? "success" : "destructive"}>
                      {aiConfigured ? (locale === "en" ? "Configured" : "已配置") : (locale === "en" ? "Not configured" : "未配置")}
                    </Badge>
                    {aiKeyMasked && <span className="font-mono text-[11px] text-muted-foreground">{aiKeyMasked}</span>}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-muted-foreground">API Key</label>
                  <div className="relative">
                    <Input
                      type={showKey ? "text" : "password"}
                      value={aiKey}
                      onChange={(e) => setAiKey(e.target.value)}
                      placeholder={aiConfigured ? (locale === "en" ? "Enter new key to replace" : "输入新 Key 替换") : "sk-..."}
                      className="h-9 pr-10 font-mono text-xs"
                    />
                    <button onClick={() => setShowKey(!showKey)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-muted-foreground">Base URL</label>
                    <Input
                      value={aiBaseUrl}
                      onChange={(e) => setAiBaseUrl(e.target.value)}
                      placeholder="https://api.openai.com/v1"
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-muted-foreground">{locale === "en" ? "Model" : "模型"}</label>
                    <Input
                      value={aiModel}
                      onChange={(e) => setAiModel(e.target.value)}
                      placeholder="gpt-4-turbo-preview"
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Button onClick={handleSaveAIConfig} disabled={aiSaving} size="sm" className="w-full gap-1.5 sm:w-auto">
                    {aiSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    {locale === "en" ? "Save" : "保存"}
                  </Button>
                  {aiMsg && <span className="text-xs text-emerald-600 dark:text-emerald-400">{aiMsg}</span>}
                </div>

                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  {locale === "en"
                    ? "Configuration is runtime-only. Restart the backend to reset to .env values."
                    : "配置仅在运行时生效，重启后端后恢复为 .env 的值。"}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
