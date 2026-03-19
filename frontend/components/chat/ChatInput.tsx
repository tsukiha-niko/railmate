"use client";

import { useState, useRef, useCallback, useEffect, type KeyboardEvent } from "react";
import { Send, Loader2 } from "lucide-react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";
import { useI18n } from "@/lib/i18n/i18n";
import { useChatViewStore } from "@/store/chatViewStore";

const VoiceButton = dynamic(
  () => import("./VoiceButton").then((mod) => mod.VoiceButton),
  {
    ssr: false,
    loading: () => <span className="h-10 w-10 shrink-0" aria-hidden />,
  },
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setText(draft || "");
    textRef.current = draft || "";
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
      if (el) {
        el.style.height = "auto";
        el.style.height = Math.min(el.scrollHeight, 160) + "px";
      }
    });
  }, [conversationId, setDraft]);

  return (
    <div className="rounded-2xl border border-border/70 bg-card/95 p-2 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.45)]">
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef} value={text}
          onChange={(e) => {
            const next = e.target.value;
            textRef.current = next;
            setText(next);
            if (conversationId) setDraft(conversationId, next);
          }}
          onKeyDown={handleKeyDown} onInput={handleInput}
          placeholder={t("chat.inputPlaceholder")} rows={1}
          className={cn(
            "chat-input-textarea flex-1 resize-none overflow-y-hidden rounded-xl border border-transparent bg-background/70 px-4 py-2.5 text-sm",
            "placeholder:text-muted-foreground focus-visible:border-input/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/65",
            "max-h-40",
          )}
        />
        <VoiceButton onTranscript={handleVoiceTranscript} disabled={loading} />
        <Button
          onClick={handleSend}
          disabled={!text.trim() || loading}
          size="icon"
          className="h-10 w-10 shrink-0 rounded-xl"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
