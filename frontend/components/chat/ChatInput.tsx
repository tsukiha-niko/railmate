"use client";

import { useState, useRef, useCallback, useEffect, type KeyboardEvent } from "react";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";
import { useI18n } from "@/lib/i18n/i18n";
import { VoiceButton } from "./VoiceButton";
import { useChatViewStore } from "@/store/chatViewStore";

interface Props {
  onSend: (text: string) => void;
  loading: boolean;
  conversationId?: string | null;
}

export function ChatInput({ onSend, loading, conversationId }: Props) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { t, locale } = useI18n();
  const draft = useChatViewStore((s) => (conversationId ? s.drafts[conversationId] : ""));
  const setDraft = useChatViewStore((s) => s.setDraft);
  const clearDraft = useChatViewStore((s) => s.clearDraft);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setText(draft || "");
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (el) {
        el.style.height = "auto";
        el.style.height = Math.min(el.scrollHeight, 160) + "px";
      }
    });
  }, [draft, conversationId]);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    onSend(trimmed);
    setText("");
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
    setText((prev) => {
      const next = prev + transcript;
      if (conversationId) setDraft(conversationId, next);
      return next;
    });
    textareaRef.current?.focus();
  }, [conversationId, setDraft]);

  return (
    <div className="rounded-2xl border border-border/75 bg-card/90 p-2 shadow-[0_14px_35px_-28px_rgba(15,23,42,0.6)] backdrop-blur-sm">
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef} value={text}
          onChange={(e) => {
            const next = e.target.value;
            setText(next);
            if (conversationId) setDraft(conversationId, next);
          }}
          onKeyDown={handleKeyDown} onInput={handleInput}
          placeholder={t("chat.inputPlaceholder")} rows={1}
          className={cn(
            "flex-1 resize-none rounded-xl border border-input/80 bg-background/85 px-4 py-2.5 text-sm",
            "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70",
            "max-h-40",
          )}
        />
        <VoiceButton onTranscript={handleVoiceTranscript} disabled={loading} />
        <Button onClick={handleSend} disabled={!text.trim() || loading} size="icon" className="shrink-0 h-10 w-10 rounded-xl">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
      <div className="mt-1.5 flex items-center justify-between px-1 text-[11px] text-muted-foreground">
        <span>{locale === "en" ? "Enter to send · Shift+Enter newline" : "Enter 发送 · Shift+Enter 换行"}</span>
        <span className="tabular-nums">{text.trim().length}</span>
      </div>
    </div>
  );
}
