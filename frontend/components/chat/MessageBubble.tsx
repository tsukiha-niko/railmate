"use client";

import { useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { Bot, Check, ChevronDown, User, Wrench } from "lucide-react";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import LinearProgress from "@mui/material/LinearProgress";
import CircularProgress from "@mui/material/CircularProgress";
import ButtonBase from "@mui/material/ButtonBase";
import type { ChatMessage, ProgressEvent } from "@/types/chat";
import { cn } from "@/utils/cn";
import { extractCards } from "@/utils/parseToolCards";
import { TrainResultCards } from "./TrainResultCards";
import { useI18n } from "@/lib/i18n/i18n";
import { useChatViewStore } from "@/store/chatViewStore";

interface Props {
  message: ChatMessage;
  index: number;
  onQueryTransfer?: (from: string, to: string) => void;
}

export function MessageBubble({ message, index, onQueryTransfer }: Props) {
  const isUser = message.role === "user";
  const { t } = useI18n();
  const cards = useMemo(() => (isUser ? [] : extractCards(message.tool_calls)), [isUser, message.tool_calls]);
  const progressExpanded = useChatViewStore((s) => s.progressExpandedByMessage[message.id] ?? false);
  const setProgressExpanded = useChatViewStore((s) => s.setProgressExpanded);
  const recentEvents = message.progress?.events?.slice(-6) ?? [];

  const stageDefs = [
    { id: "context", label: t("chat.progress.stage.context") },
    { id: "intent", label: t("chat.progress.stage.intent") },
    { id: "plan", label: t("chat.progress.stage.plan") },
    { id: "tool", label: t("chat.progress.stage.tool") },
    { id: "answer", label: t("chat.progress.stage.answer") },
  ] as const;

  function resolveStageIndex(text?: string | null) {
    const content = text || "";
    if (/最终回复|生成回复|输出推荐|聊天任务完成|任务失败|生成最终回复/i.test(content)) return 4;
    if (/执行第|执行工具|拿到 .*结果|查询|中转方案|查票/i.test(content)) return 3;
    if (/模型规划|整合查询结果|等待模型|规划/i.test(content)) return 2;
    if (/理解|需求|分析/i.test(content)) return 1;
    return 0;
  }

  const currentStageIndex = resolveStageIndex(message.progress?.current_message);
  const latestDetail = recentEvents[recentEvents.length - 1]?.detail || null;
  const isProgressOnly = !isUser && message.status === "pending" && !message.content;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.05, 0.3) }}
    >
      <Box sx={{ display: "flex", width: "100%", gap: 1.5, flexDirection: isUser ? "row-reverse" : "row" }}>
        <Avatar sx={{ width: 32, height: 32, bgcolor: isUser ? "primary.main" : undefined, background: isUser ? undefined : "linear-gradient(135deg, #3B82F6, #06B6D4)" }}>
          {isUser ? <User size={16} /> : <Bot size={16} />}
        </Avatar>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75, minWidth: 0, overflow: "hidden", ...(isUser ? { ml: "auto", maxWidth: "80%", alignItems: "flex-end" } : { width: "100%", alignItems: "flex-start" }) }}>
          {!isUser && message.tool_calls && message.tool_calls.length > 0 && (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mb: 0.5 }}>
              {message.tool_calls.map((tc, i) => (
                <Chip key={i} icon={<Wrench size={10} />} label={tc.tool_name} size="small" variant="outlined" />
              ))}
            </Box>
          )}

          <Box
            sx={{
              fontSize: "0.875rem",
              lineHeight: 1.7,
              ...(isUser
                ? { maxWidth: "min(840px,100%)", borderRadius: "16px 16px 4px 16px", bgcolor: "primary.main", color: "primary.contrastText", px: 2, py: 1.5, whiteSpace: "pre-wrap" }
                : isProgressOnly
                  ? { width: "100%" }
                  : { width: "100%", borderRadius: "16px 16px 16px 4px", border: 1, borderColor: "divider", bgcolor: "background.paper", px: 2, py: 1.5 }),
            }}
          >
            {isUser ? (
              message.content
            ) : isProgressOnly ? (
              <Box sx={{ width: "100%" }}>
                <ButtonBase
                  onClick={() => setProgressExpanded(message.id, !progressExpanded)}
                  sx={{ width: "100%", borderRadius: 4, border: 1, borderColor: "divider", bgcolor: "background.default", p: 1.5, textAlign: "left", display: "block" }}
                >
                  <Box sx={{ display: "flex", gap: 1.5 }}>
                    <Box sx={{ mt: 0.5, flexShrink: 0 }}>
                      <CircularProgress size={24} />
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 1 }}>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="caption" color="text.secondary">{t("chat.progress.current")}</Typography>
                          <Typography variant="body2" fontWeight={700} noWrap>{message.progress?.current_message || t("chat.progress.processing")}</Typography>
                        </Box>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>{message.progress?.percent ?? 0}%</Typography>
                          <ChevronDown size={16} style={{ transform: progressExpanded ? "rotate(180deg)" : undefined, transition: "transform 0.2s" }} />
                        </Box>
                      </Box>
                      <LinearProgress variant="determinate" value={message.progress?.percent ?? 0} sx={{ mt: 1, borderRadius: 1, height: 6 }} />
                      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 0.75, mt: 1.5 }}>
                        {stageDefs.map((stage, si) => {
                          const state = si < currentStageIndex ? "done" : si === currentStageIndex ? "active" : "idle";
                          return (
                            <Chip
                              key={stage.id}
                              label={stage.label}
                              size="small"
                              icon={state === "done" ? <Check size={12} /> : undefined}
                              color={state === "done" ? "success" : state === "active" ? "primary" : "default"}
                              variant={state === "idle" ? "outlined" : "filled"}
                              sx={{ fontSize: "0.625rem", justifyContent: "center" }}
                            />
                          );
                        })}
                      </Box>
                      {latestDetail && <Typography variant="caption" color="text.secondary" noWrap sx={{ mt: 1, display: "block" }}>{latestDetail}</Typography>}
                    </Box>
                  </Box>
                </ButtonBase>

                <AnimatePresence initial={false}>
                  {progressExpanded && recentEvents.length > 0 && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} style={{ overflow: "hidden" }}>
                      <Box sx={{ mt: 1, display: "flex", flexDirection: "column", gap: 1, borderRadius: 4, border: 1, borderColor: "divider", bgcolor: "background.default", p: 1.5 }}>
                        {recentEvents.map((event: ProgressEvent, ei) => (
                          <Box key={`${event.timestamp || ei}-${ei}`} sx={{ display: "flex", gap: 1, borderRadius: 3, bgcolor: "background.paper", px: 1.5, py: 1 }}>
                            <Box sx={{ mt: 0.75, width: 8, height: 8, borderRadius: "50%", flexShrink: 0, bgcolor: ei === recentEvents.length - 1 ? "primary.main" : "text.disabled" }} />
                            <Box sx={{ minWidth: 0 }}>
                              <Typography variant="caption" fontWeight={600}>{event.message}</Typography>
                              {event.detail && <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>{event.detail}</Typography>}
                            </Box>
                          </Box>
                        ))}
                      </Box>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Box>
            ) : (
              <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1.5 prose-p:leading-7 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5 prose-headings:my-2 prose-strong:text-foreground prose-code:text-xs prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-muted prose-pre:p-2 prose-pre:rounded-lg">
                <ReactMarkdown>{message.content}</ReactMarkdown>
              </div>
            )}
          </Box>

          {cards.length > 0 && <TrainResultCards cards={cards} onQueryTransfer={onQueryTransfer} messageId={message.id} />}
        </Box>
      </Box>
    </motion.div>
  );
}
