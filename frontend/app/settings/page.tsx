"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  MapPin, Navigation, Satellite, Edit3, TrendingUp, Check,
  Settings, Bot, Eye, EyeOff, Loader2, LogIn, LogOut,
  RefreshCw, ShieldCheck, ShieldOff, Ticket,
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
  const [qrUuid, setQrUuid] = useState<string | null>(null);
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
        setQrMsg(res.message || "获取二维码失败");
        return;
      }
      setQrUuid(res.uuid);
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
            setQrMsg(poll.username ? `欢迎，${poll.username}` : "登录成功");
            setQrImage(null);
            await loadRailStatus();
          } else if (poll.status === "expired") {
            clearQrPoll();
            setQrStatus("expired");
            setQrMsg("二维码已过期，请重新获取");
          } else if (poll.status === "error") {
            clearQrPoll();
            setQrStatus("error");
            setQrMsg(poll.message || "轮询出错");
          }
        } catch { /* network error, keep polling */ }
      }, 2000);
    } catch (e) {
      setQrStatus("error");
      setQrMsg(e instanceof Error ? e.message : "网络错误");
    }
  }, [clearQrPoll, loadRailStatus]);

  // QR 展示超时自动取消（3分钟）
  useEffect(() => {
    if (qrStatus === "waiting") {
      const t = setTimeout(() => {
        clearQrPoll();
        setQrStatus("expired");
        setQrMsg("二维码已过期，请重新获取");
      }, 3 * 60 * 1000);
      return () => clearTimeout(t);
    }
  }, [qrStatus, clearQrPoll]);

  useEffect(() => () => clearQrPoll(), [clearQrPoll]);

  const handleLogout12306 = useCallback(async () => {
    setRailLoading(true);
    try {
      await logout12306();
      setRail12306(null);
      setQrStatus("idle");
      setQrImage(null);
      setQrUuid(null);
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
      setAiMsg(err instanceof Error ? err.message : "Failed");
    } finally { setAiSaving(false); }
  }, [aiKey, aiBaseUrl, aiModel, locale]);

  const PREFS: { value: "fast" | "cheap" | "balanced"; label: string; desc: string }[] = [
    { value: "fast", label: t("settings.pref.fast"), desc: t("settings.pref.fast.desc") },
    { value: "cheap", label: t("settings.pref.cheap"), desc: t("settings.pref.cheap.desc") },
    { value: "balanced", label: t("settings.pref.balanced"), desc: t("settings.pref.balanced.desc") },
  ];

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-5 overflow-y-auto flex-1">
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

      <Separator />

      {/* ── 12306 登录 ── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.165 }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Ticket className="h-4 w-4 text-primary" />
              {locale === "en" ? "12306 Account" : "12306 账户登录"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 说明 */}
            <p className="text-xs text-muted-foreground leading-relaxed">
              {locale === "en"
                ? "Log in with your 12306 account to enable real-time ticket prices (no extra configuration needed)."
                : "登录 12306 账户后，票价查询将自动生效，无需任何额外配置。"}
            </p>

            {/* 状态 */}
            {rail12306?.logged_in ? (
              <div className="flex items-center justify-between gap-3 rounded-lg bg-secondary/50 px-4 py-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <ShieldCheck className="h-5 w-5 text-emerald-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{rail12306.username || locale === "en" ? "Logged in" : "已登录"}</p>
                    <p className="text-xs text-muted-foreground">
                      {locale === "en"
                        ? `Cookie valid for ${rail12306.remaining_days} day(s)`
                        : `Cookie 剩余有效期 ${rail12306.remaining_days} 天`}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline" size="sm"
                  onClick={handleLogout12306}
                  disabled={railLoading}
                  className="gap-1.5 shrink-0"
                >
                  {railLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />}
                  {locale === "en" ? "Log out" : "退出"}
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-lg bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                <ShieldOff className="h-4 w-4 shrink-0" />
                {locale === "en" ? "Not logged in — ticket prices may be unavailable." : "未登录 — 票价查询可能无法正常显示。"}
              </div>
            )}

            {/* 扫码区域 */}
            {!rail12306?.logged_in && (
              <div className="space-y-3">
                {/* 二维码展示 */}
                {(qrStatus === "waiting" || qrStatus === "scanned") && qrImage && (
                  <div className="flex flex-col items-center gap-2">
                    <div className={`relative rounded-xl overflow-hidden border-2 transition-colors ${qrStatus === "scanned" ? "border-amber-400" : "border-border"}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`data:image/png;base64,${qrImage}`}
                        alt="12306 登录二维码"
                        className="w-48 h-48 object-contain block"
                      />
                      {qrStatus === "scanned" && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm">
                          <Loader2 className="h-8 w-8 animate-spin text-white mb-1" />
                          <span className="text-white text-xs font-medium">{locale === "en" ? "Confirming…" : "请在手机上确认登录"}</span>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-center text-muted-foreground">
                      {qrStatus === "scanned"
                        ? (locale === "en" ? "Scanned — confirm on your phone" : "已扫描，请在 12306 App 确认")
                        : (locale === "en" ? "Open 12306 App → scan QR to log in" : "打开 12306 App → 扫一扫 登录")}
                    </p>
                  </div>
                )}

                {/* 成功/过期/错误提示 */}
                {qrStatus === "confirmed" && (
                  <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600 dark:text-emerald-400">
                    <Check className="h-4 w-4 shrink-0" />
                    {qrMsg || (locale === "en" ? "Login successful!" : "登录成功！")}
                  </div>
                )}
                {(qrStatus === "expired" || qrStatus === "error") && (
                  <p className="text-xs text-destructive text-center">{qrMsg}</p>
                )}

                {/* 操作按钮 */}
                <div className="flex gap-2">
                  {(qrStatus === "idle" || qrStatus === "expired" || qrStatus === "error" || qrStatus === "confirmed") && (
                    <Button
                      size="sm"
                      onClick={handleStartQR}
                      className="gap-1.5"
                    >
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
                      className="gap-1.5"
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

      <Separator />

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.175 }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Bot className="h-4 w-4 text-primary" />
              {locale === "en" ? "AI Configuration" : "AI 模型配置"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">{locale === "en" ? "Status:" : "状态："}</span>
              <Badge variant={aiConfigured ? "success" : "destructive"}>
                {aiConfigured ? (locale === "en" ? "Configured" : "已配置") : (locale === "en" ? "Not configured" : "未配置")}
              </Badge>
              {aiKeyMasked && <span className="text-muted-foreground font-mono">{aiKeyMasked}</span>}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">API Key</label>
              <div className="relative">
                <Input
                  type={showKey ? "text" : "password"}
                  value={aiKey}
                  onChange={(e) => setAiKey(e.target.value)}
                  placeholder={aiConfigured ? (locale === "en" ? "Enter new key to replace" : "输入新 Key 替换") : "sk-..."}
                  className="pr-10 font-mono text-xs"
                />
                <button onClick={() => setShowKey(!showKey)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Base URL</label>
                <Input value={aiBaseUrl} onChange={(e) => setAiBaseUrl(e.target.value)} placeholder="https://api.openai.com/v1" className="text-xs" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">{locale === "en" ? "Model" : "模型"}</label>
                <Input value={aiModel} onChange={(e) => setAiModel(e.target.value)} placeholder="gpt-4-turbo-preview" className="text-xs" />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button onClick={handleSaveAIConfig} disabled={aiSaving} size="sm" className="gap-1.5">
                {aiSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                {locale === "en" ? "Save" : "保存"}
              </Button>
              {aiMsg && <span className="text-xs text-success">{aiMsg}</span>}
            </div>

            <p className="text-[11px] text-muted-foreground">
              {locale === "en"
                ? "Configuration is runtime-only. Restart the backend to reset to .env values."
                : "配置仅在运行时生效，重启后端后恢复为 .env 的值。"}
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
