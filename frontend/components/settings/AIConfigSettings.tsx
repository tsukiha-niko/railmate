"use client";

import { useState, useCallback, useEffect } from "react";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import { Bot, Eye, EyeOff, Check } from "lucide-react";
import { SectionHeader } from "@/components/common/SectionHeader";
import { getConfig, updateAIConfig } from "@/services/admin";
import { useI18n } from "@/lib/i18n/i18n";

export function AIConfigSettings() {
  const { locale, t } = useI18n();
  const [aiKey, setAiKey] = useState("");
  const [aiBaseUrl, setAiBaseUrl] = useState("");
  const [aiModel, setAiModel] = useState("");
  const [aiConfigured, setAiConfigured] = useState(false);
  const [aiKeyMasked, setAiKeyMasked] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    getConfig().then((c) => {
      setAiBaseUrl(c.openai_base_url);
      setAiModel(c.openai_model);
      setAiConfigured(c.openai_api_configured);
      setAiKeyMasked(c.openai_api_key_masked);
    }).catch(() => {});
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setMsg("");
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
        setMsg(locale === "en" ? "Saved!" : "已保存！");
        setTimeout(() => setMsg(""), 3000);
      }
    } catch (err) {
      setMsg(err instanceof Error ? err.message : (locale === "en" ? "Failed" : "保存失败"));
    } finally { setSaving(false); }
  }, [aiKey, aiBaseUrl, aiModel, locale]);

  return (
    <Card variant="outlined" sx={{ borderRadius: "16px" }}>
      <CardContent sx={{ display: "flex", flexDirection: "column", gap: 2, p: { xs: 2, sm: 2.5 } }}>
        <SectionHeader icon={<Bot />} title={locale === "en" ? "AI Configuration" : "AI 模型配置"} />

        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", borderRadius: "16px", border: 1, borderColor: "divider", bgcolor: "background.paper", px: 1.5, py: 1 }}>
          <Typography variant="caption" color="text.secondary">{locale === "en" ? "Status:" : "状态："}</Typography>
          <Chip
            label={aiConfigured ? (locale === "en" ? "Configured" : "已配置") : (locale === "en" ? "Not configured" : "未配置")}
            size="small"
            color={aiConfigured ? "success" : "error"}
          />
          {aiKeyMasked && <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace" }}>{aiKeyMasked}</Typography>}
        </Box>

        <TextField
          label="API Key"
          type={showKey ? "text" : "password"}
          value={aiKey}
          onChange={(e) => setAiKey(e.target.value)}
          placeholder={aiConfigured ? (locale === "en" ? "Enter new key to replace" : "输入新 Key 替换") : "sk-..."}
          fullWidth
          slotProps={{
            input: {
              sx: { fontFamily: "monospace", fontSize: "0.75rem" },
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowKey(!showKey)} edge="end" size="small">
                    {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
        />

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5 }}>
          <TextField label="Base URL" value={aiBaseUrl} onChange={(e) => setAiBaseUrl(e.target.value)} placeholder="https://api.openai.com/v1" fullWidth />
          <TextField label={locale === "en" ? "Model" : "模型"} value={aiModel} onChange={(e) => setAiModel(e.target.value)} placeholder="gpt-4-turbo-preview" fullWidth />
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Button variant="contained" size="small" onClick={handleSave} disabled={saving} startIcon={saving ? <CircularProgress size={14} /> : <Check size={14} />}>
            {locale === "en" ? "Save" : "保存"}
          </Button>
          {msg && <Typography variant="caption" color="success.main">{msg}</Typography>}
        </Box>

        <Typography variant="caption" color="text.secondary">
          {locale === "en"
            ? "Configuration is runtime-only. Restart the backend to reset to .env values."
            : "配置仅在运行时生效，重启后端后恢复为 .env 的值。"}
        </Typography>
      </CardContent>
    </Card>
  );
}
