"use client";

import { useState, useRef, useCallback, type KeyboardEvent } from "react";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";
import { useI18n } from "@/lib/i18n/i18n";
import { VoiceButton } from "./VoiceButton";

interface Props {
  onSend: (text: string) => void;
  loading: boolean;
}

export function ChatInput({ onSend, loading }: Props) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { t } = useI18n();

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    onSend(trimmed);
    setText("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }, [text, loading, onSend]);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (el) { el.style.height = "auto"; el.style.height = Math.min(el.scrollHeight, 160) + "px"; }
  };

  const handleVoiceTranscript = useCallback((transcript: string) => {
    setText((prev) => prev + transcript);
    textareaRef.current?.focus();
  }, []);

  return (
    <div className="flex items-end gap-2 p-4 border-t border-border bg-card">
      <textarea
        ref={textareaRef} value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown} onInput={handleInput}
        placeholder={t("chat.inputPlaceholder")} rows={1}
        className={cn(
          "flex-1 resize-none rounded-xl border border-input bg-background px-4 py-2.5 text-sm",
          "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "max-h-40",
        )}
      />
      <VoiceButton onTranscript={handleVoiceTranscript} disabled={loading} />
      <Button onClick={handleSend} disabled={!text.trim() || loading} size="icon" className="shrink-0 h-10 w-10 rounded-xl">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
      </Button>
    </div>
  );
}
