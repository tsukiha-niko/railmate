"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, MicOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";
import { useI18n } from "@/lib/i18n/i18n";

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }
}

interface Props {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

export function VoiceButton({ onTranscript, disabled }: Props) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const { locale } = useI18n();
  const supported = typeof window !== "undefined" && !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    };
  }, []);

  const stopRecognition = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const normalizeTranscript = useCallback((raw: string) => {
    return raw.replace(/\s+/g, " ").trim();
  }, []);

  const appendTranscript = useCallback((chunk: string) => {
    const normalized = normalizeTranscript(chunk);
    if (!normalized) return;
    onTranscript(normalized);
  }, [normalizeTranscript, onTranscript]);

  const toggle = useCallback(() => {
    if (disabled) return;

    if (listening) {
      stopRecognition();
      return;
    }

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = locale === "en" ? "en-US" : "zh-CN";
    recognitionRef.current = recognition;

    let finalText = "";
    setErrorMsg("");
    setInterim("");

    recognition.onstart = () => setListening(true);

    recognition.onresult = (e: SpeechRecognitionEvent) => {
      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const transcript = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          finalText += transcript;
        } else {
          interimText += transcript;
        }
      }
      setInterim(interimText);
      if (finalText) {
        appendTranscript(finalText);
        finalText = "";
      }
    };

    recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
      setListening(false);
      setInterim("");
      setErrorMsg(
        locale === "en"
          ? `Voice input failed: ${e.error}`
          : `语音识别失败：${e.error}`,
      );
      recognitionRef.current = null;
    };

    recognition.onend = () => {
      setListening(false);
      setInterim("");
      if (finalText) {
        appendTranscript(finalText);
        finalText = "";
      }
      recognitionRef.current = null;
    };

    recognition.start();
  }, [appendTranscript, disabled, listening, locale, stopRecognition]);

  if (!supported) return null;

  return (
    <div className="relative">
      <AnimatePresence>
        {listening && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-border/70 bg-card px-2.5 py-1 text-xs text-muted-foreground shadow-md"
          >
            {interim || (locale === "en" ? "Listening..." : "正在听...")}
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {!listening && errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -3 }}
            className="absolute -top-10 left-1/2 max-w-[220px] -translate-x-1/2 truncate rounded-lg border border-destructive/40 bg-card px-2.5 py-1 text-xs text-destructive shadow-md"
          >
            {errorMsg}
          </motion.div>
        )}
      </AnimatePresence>

      <Button
        type="button"
        variant={listening ? "destructive" : "outline"}
        size="icon"
        disabled={disabled}
        onClick={toggle}
        className={cn(
          "relative h-10 w-10 shrink-0 rounded-xl border-border/70 bg-background/70 hover:bg-secondary/70",
          listening && "animate-pulse",
        )}
      >
        {listening ? (
          <>
            <motion.div
              className="absolute inset-0 rounded-xl border-2 border-destructive"
              animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0, 0.6] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <MicOff className="h-4 w-4" />
          </>
        ) : (
          <Mic className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}
