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
  const [supported, setSupported] = useState(false);
  useEffect(() => {
    setSupported(!!(window.SpeechRecognition || window.webkitSpeechRecognition));
  }, []);

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
                borderRadius: "10px",
                borderLeft: "3px solid",
                borderLeftColor: "primary.main",
                border: 1,
                borderColor: (th) => `${th.palette.divider}80`,
                bgcolor: "background.paper",
                px: 2,
                py: 0.75,
                boxShadow: "var(--shadow-card-hover)",
                display: "flex",
                alignItems: "center",
                gap: 1,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, height: 16 }}>
                {[0, 1, 2, 3].map((barIdx) => (
                  <Box
                    key={barIdx}
                    sx={{
                      width: 3,
                      borderRadius: 1,
                      bgcolor: "primary.main",
                      animation: "voiceBar 0.8s ease-in-out infinite alternate",
                      animationDelay: `${barIdx * 0.15}s`,
                      "@keyframes voiceBar": {
                        "0%": { height: 4 },
                        "100%": { height: 14 },
                      },
                    }}
                  />
                ))}
              </Box>
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
            <Box sx={{ borderRadius: "10px", border: 1, borderColor: "error.main", bgcolor: "background.paper", px: 2, py: 0.75, boxShadow: "var(--shadow-card-hover)" }}>
              <Typography variant="caption" color="error" noWrap>{errorMsg}</Typography>
            </Box>
          </motion.div>
        )}
      </AnimatePresence>

      <IconButton
        onClick={toggle}
        disabled={disabled}
        sx={{
          width: 40,
          height: 40,
          borderRadius: "8px",
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
