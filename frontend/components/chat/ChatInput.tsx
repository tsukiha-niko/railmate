"use client";

import { useState, useRef, useCallback, useEffect, type KeyboardEvent } from "react";
import { Send, Loader2 } from "lucide-react";
import dynamic from "next/dynamic";
import Card from "@mui/material/Card";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import CircularProgress from "@mui/material/CircularProgress";
import { useI18n } from "@/lib/i18n/i18n";
import { useChatViewStore } from "@/store/chatViewStore";

const VoiceButton = dynamic(
  () => import("./VoiceButton").then((mod) => mod.VoiceButton),
  { ssr: false, loading: () => <span style={{ width: 40, height: 40, display: "inline-block" }} /> },
);

interface Props {
  onSend: (text: string) => void;
  loading: boolean;
  conversationId?: string | null;
}

export function ChatInput({ onSend, loading, conversationId }: Props) {
  const [text, setText] = useState("");
  const textRef = useRef("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { t } = useI18n();
  const draft = useChatViewStore((s) => (conversationId ? s.drafts[conversationId] : ""));
  const setDraft = useChatViewStore((s) => s.setDraft);
  const clearDraft = useChatViewStore((s) => s.clearDraft);

  useEffect(() => {
    setText(draft || "");
    textRef.current = draft || "";
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (el) { el.style.height = "auto"; el.style.height = Math.min(el.scrollHeight, 160) + "px"; }
    });
  }, [draft, conversationId]);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    onSend(trimmed);
    setText("");
    textRef.current = "";
    if (conversationId) clearDraft(conversationId);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }, [text, loading, onSend, clearDraft, conversationId]);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (el) { el.style.height = "auto"; el.style.height = Math.min(el.scrollHeight, 160) + "px"; }
  };

  const handleVoiceTranscript = useCallback((transcript: string) => {
    const normalized = transcript.replace(/\s+/g, " ").trim();
    if (!normalized) return;
    const current = textRef.current;
    const needsSpace = current.length > 0 && !/[\s，。！？,.!?、]$/.test(current);
    const next = `${current}${needsSpace ? " " : ""}${normalized}`;
    textRef.current = next;
    setText(next);
    if (conversationId) setDraft(conversationId, next);
    textareaRef.current?.focus();
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (el) { el.style.height = "auto"; el.style.height = Math.min(el.scrollHeight, 160) + "px"; }
    });
  }, [conversationId, setDraft]);

  return (
    <Card
      variant="outlined"
      sx={{
        p: 1,
        borderRadius: 5,
        bgcolor: "background.paper",
        boxShadow: "var(--shadow-sm)",
        borderColor: (th) => `${th.palette.divider}80`,
        transition: "box-shadow 0.2s ease, border-color 0.2s ease",
        "&:focus-within": {
          borderColor: "primary.main",
          boxShadow: (th) => `0 0 0 3px ${th.palette.primary.main}18`,
        },
      }}
    >
      <Box sx={{ display: "flex", alignItems: "flex-end", gap: 0.75 }}>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => {
            const next = e.target.value;
            textRef.current = next;
            setText(next);
            if (conversationId) setDraft(conversationId, next);
          }}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          placeholder={t("chat.inputPlaceholder")}
          rows={1}
          className="chat-input-textarea"
          style={{
            flex: 1,
            resize: "none",
            border: "none",
            outline: "none",
            background: "transparent",
            padding: "10px 16px",
            fontSize: "0.875rem",
            lineHeight: 1.6,
            maxHeight: 160,
            overflowY: "hidden",
            fontFamily: "inherit",
            color: "inherit",
          }}
        />
        <VoiceButton onTranscript={handleVoiceTranscript} disabled={loading} />
        <IconButton
          onClick={handleSend}
          disabled={!text.trim() || loading}
          color="primary"
          sx={{
            width: 40,
            height: 40,
            borderRadius: 3,
            bgcolor: "primary.main",
            color: "primary.contrastText",
            "&:hover": { bgcolor: "primary.dark", transform: "scale(1.04)" },
            "&.Mui-disabled": { bgcolor: "action.disabledBackground" },
            transition: "all 0.2s ease",
          }}
        >
          {loading ? <CircularProgress size={18} color="inherit" /> : <Send size={18} />}
        </IconButton>
      </Box>
    </Card>
  );
}
