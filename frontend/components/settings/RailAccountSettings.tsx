"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import { Ticket, LogIn, LogOut, RefreshCw, ShieldOff } from "lucide-react";
import { SectionHeader } from "@/components/common/SectionHeader";
import {
  get12306Status, create12306QRCode, poll12306QRCode, logout12306,
  type Auth12306Status,
} from "@/services/auth";
import { useI18n } from "@/lib/i18n/i18n";

export function RailAccountSettings() {
  const { locale, t } = useI18n();
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
    try { setRail12306(await get12306Status()); } catch { /* ignore */ }
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
      pollTimer.current = setInterval(async () => {
        try {
          const poll = await poll12306QRCode(res.uuid!);
          if (poll.status === "scanned") setQrStatus("scanned");
          else if (poll.status === "confirmed") {
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
        } catch { /* keep polling */ }
      }, 2000);
    } catch (e) {
      setQrStatus("error");
      setQrMsg(e instanceof Error ? e.message : (locale === "en" ? "Network error" : "网络错误"));
    }
  }, [clearQrPoll, loadRailStatus, locale]);

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

  const handleLogout = useCallback(async () => {
    setRailLoading(true);
    try {
      await logout12306();
      setRail12306(null);
      setQrStatus("idle");
      setQrImage(null);
      setQrMsg("");
    } finally { setRailLoading(false); }
  }, []);

  return (
    <Card variant="outlined" sx={{ borderRadius: 5 }}>
      <CardContent sx={{ display: "flex", flexDirection: "column", gap: 2, p: { xs: 2, sm: 2.5 } }}>
        <SectionHeader icon={<Ticket />} title={locale === "en" ? "12306 Account" : "12306 账户登录"} />
        <Typography variant="caption" color="text.secondary">{t("settings.railAccount.desc")}</Typography>

        {rail12306?.logged_in ? (
          <Alert
            severity="success"
            variant="outlined"
            action={
              <Button size="small" variant="outlined" onClick={handleLogout} disabled={railLoading} startIcon={railLoading ? <CircularProgress size={14} /> : <LogOut size={14} />}>
                {locale === "en" ? "Log out" : "退出"}
              </Button>
            }
          >
            <Typography variant="body2" fontWeight={700}>
              {rail12306.username || (locale === "en" ? "Logged in" : "已登录")}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {locale === "en" ? `Cookie valid for ${rail12306.remaining_days} day(s)` : `Cookie 剩余有效期 ${rail12306.remaining_days} 天`}
            </Typography>
          </Alert>
        ) : (
          <Alert severity="warning" variant="outlined" icon={<ShieldOff size={18} />}>
            {locale === "en" ? "Not logged in — ticket prices may be unavailable." : "未登录 — 票价查询可能无法正常显示。"}
          </Alert>
        )}

        {!rail12306?.logged_in && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {(qrStatus === "waiting" || qrStatus === "scanned") && qrImage && (
              <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1.5 }}>
                <Box sx={{ position: "relative", borderRadius: 3.5, overflow: "hidden", border: 2, borderColor: qrStatus === "scanned" ? "warning.main" : "divider" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`data:image/png;base64,${qrImage}`} alt="12306 QR" style={{ display: "block", width: 180, height: 180, objectFit: "contain" }} />
                  {qrStatus === "scanned" && (
                    <Box sx={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", bgcolor: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}>
                      <CircularProgress size={28} sx={{ color: "white", mb: 0.5 }} />
                      <Typography variant="caption" sx={{ color: "white" }}>{locale === "en" ? "Confirming…" : "请在手机上确认登录"}</Typography>
                    </Box>
                  )}
                </Box>
                <Typography variant="caption" color="text.secondary" align="center">
                  {qrStatus === "scanned"
                    ? (locale === "en" ? "Scanned — confirm on your phone" : "已扫描，请在 12306 App 确认")
                    : (locale === "en" ? "Open 12306 App → scan QR to log in" : "打开 12306 App → 扫一扫 登录")}
                </Typography>
              </Box>
            )}

            {qrStatus === "confirmed" && <Alert severity="success" variant="outlined">{qrMsg || (locale === "en" ? "Login successful!" : "登录成功！")}</Alert>}
            {(qrStatus === "expired" || qrStatus === "error") && qrMsg && <Alert severity="error" variant="outlined">{qrMsg}</Alert>}

            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              {(qrStatus === "idle" || qrStatus === "expired" || qrStatus === "error" || qrStatus === "confirmed") && (
                <Button variant="contained" size="small" onClick={handleStartQR} startIcon={<LogIn size={14} />}>
                  {locale === "en" ? "Scan QR to log in" : "扫码登录"}
                </Button>
              )}
              {(qrStatus === "waiting" || qrStatus === "scanned" || qrStatus === "loading") && (
                <Button variant="outlined" size="small" onClick={handleStartQR} disabled={qrStatus === "loading"} startIcon={qrStatus === "loading" ? <CircularProgress size={14} /> : <RefreshCw size={14} />}>
                  {locale === "en" ? "Refresh QR" : "刷新二维码"}
                </Button>
              )}
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
