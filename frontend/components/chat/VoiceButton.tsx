"use client";

import { useState, useRef, useCallback } from "react";
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
  const [supported] = useState(
    () => typeof window !== "undefined" && !!(window.SpeechRecognition || window.webkitSpeechRecognition),
  );
  const [interim, setInterim] = useState("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const { locale } = useI18n();

  const toggle = useCallback(() => {
    if (listening) {
      recognitionRef.current?.stop();
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
        onTranscript(finalText);
        finalText = "";
      }
    };

    recognition.onerror = () => {
      setListening(false);
      setInterim("");
    };

    recognition.onend = () => {
      setListening(false);
      setInterim("");
      if (finalText) {
        onTranscript(finalText);
      }
    };

    recognition.start();
  }, [listening, locale, onTranscript]);

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
