"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, MicOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import { useI18n } from "@/lib/i18n/i18n";

interface SpeechRecognitionEvent { resultIndex: number; results: SpeechRecognitionResultList; }
interface SpeechRecognitionErrorEvent { error: string; }
interface SpeechRecognition extends EventTarget {
  continuous: boolean; interimResults: boolean; lang: string;
  start(): void; stop(): void; abort(): void;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null; onstart: (() => void) | null;
}
declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }
}

interface Props { onTranscript: (text: string) => void; disabled?: boolean; }

export function VoiceButton({ onTranscript, disabled }: Props) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const { locale } = useI18n();
  const supported = typeof window !== "undefined" && !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  useEffect(() => () => { recognitionRef.current?.abort(); recognitionRef.current = null; }, []);

  const stopRecognition = useCallback(() => { recognitionRef.current?.stop(); }, []);
  const normalizeTranscript = useCallback((raw: string) => raw.replace(/\s+/g, " ").trim(), []);
  const appendTranscript = useCallback((chunk: string) => { const n = normalizeTranscript(chunk); if (n) onTranscript(n); }, [normalizeTranscript, onTranscript]);

  const toggle = useCallback(() => {
    if (disabled) return;
    if (listening) { stopRecognition(); return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = locale === "en" ? "en-US" : "zh-CN";
    recognitionRef.current = recognition;
    let finalText = "";
    setErrorMsg(""); setInterim("");
    recognition.onstart = () => setListening(true);
    recognition.onresult = (e: SpeechRecognitionEvent) => {
      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const transcript = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += transcript;
        else interimText += transcript;
      }
      setInterim(interimText);
      if (finalText) { appendTranscript(finalText); finalText = ""; }
    };
    recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
      setListening(false); setInterim("");
      setErrorMsg(locale === "en" ? `Voice input failed: ${e.error}` : `语音识别失败：${e.error}`);
      recognitionRef.current = null;
    };
    recognition.onend = () => {
      setListening(false); setInterim("");
      if (finalText) { appendTranscript(finalText); finalText = ""; }
      recognitionRef.current = null;
    };
    recognition.start();
  }, [appendTranscript, disabled, listening, locale, stopRecognition]);

  if (!supported) return null;

  return (
    <Box sx={{ position: "relative" }}>
      <AnimatePresence>
        {listening && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 4 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 4 }}
            style={{ position: "absolute", bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)", whiteSpace: "nowrap", zIndex: 10 }}
          >
            <Box
              sx={{
                borderRadius: 3,
                border: 1,
                borderColor: "primary.main",
                bgcolor: "background.paper",
                px: 2,
                py: 0.75,
                boxShadow: "var(--shadow-md)",
                display: "flex",
                alignItems: "center",
                gap: 1,
              }}
            >
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  bgcolor: "error.main",
                  animation: "pulse 1.5s ease-in-out infinite",
                  "@keyframes pulse": {
                    "0%, 100%": { opacity: 1, transform: "scale(1)" },
                    "50%": { opacity: 0.5, transform: "scale(0.85)" },
                  },
                }}
              />
              <Typography variant="caption" fontWeight={600}>
                {interim || (locale === "en" ? "Listening..." : "正在听...")}
              </Typography>
            </Box>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {!listening && errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            style={{ position: "absolute", bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)", maxWidth: 240, zIndex: 10 }}
          >
            <Box sx={{ borderRadius: 3, border: 1, borderColor: "error.main", bgcolor: "background.paper", px: 2, py: 0.75, boxShadow: "var(--shadow-md)" }}>
              <Typography variant="caption" color="error" noWrap>{errorMsg}</Typography>
            </Box>
          </motion.div>
        )}
      </AnimatePresence>

      {listening && (
        <>
          <Box
            sx={{
              position: "absolute",
              inset: -4,
              borderRadius: 4,
              border: 2,
              borderColor: "primary.main",
              opacity: 0.3,
              pointerEvents: "none",
            }}
            className="voice-wave-ring"
          />
          <Box
            sx={{
              position: "absolute",
              inset: -8,
              borderRadius: 4,
              border: 1,
              borderColor: "primary.main",
              opacity: 0.15,
              pointerEvents: "none",
            }}
            className="voice-wave-ring"
            style={{ animationDelay: "0.4s" }}
          />
        </>
      )}

      <IconButton
        onClick={toggle}
        disabled={disabled}
        sx={{
          width: 40,
          height: 40,
          borderRadius: 3,
          border: 1,
          borderColor: listening ? "error.main" : (th) => `${th.palette.divider}80`,
          color: listening ? "error.main" : "text.secondary",
          bgcolor: listening ? (th) => `${th.palette.error.main}0A` : "transparent",
          "&:hover": {
            borderColor: listening ? "error.main" : "primary.main",
            bgcolor: listening ? (th) => `${th.palette.error.main}14` : (th) => `${th.palette.primary.main}0A`,
          },
          transition: "all 0.2s ease",
          position: "relative",
          zIndex: 1,
        }}
        className={listening ? "voice-listening-pulse" : undefined}
      >
        {listening ? <MicOff size={18} /> : <Mic size={18} />}
      </IconButton>
    </Box>
  );
}
