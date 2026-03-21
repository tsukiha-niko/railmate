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
import { extractCards } from "@/utils/parseToolCards";
import { parseQuickRepliesFromContent } from "@/utils/parseQuickReplies";
import { TrainResultCards } from "./TrainResultCards";
import { AssistantQuickReplies } from "./AssistantQuickReplies";
import { useI18n } from "@/lib/i18n/i18n";
import { useChatViewStore } from "@/store/chatViewStore";

const SUGGESTION_RE = /\[\[([^\]]+)\]\]\s*$/;

function parseSuggestions(content: string | undefined): { text: string; suggestions: string[] } {
  if (!content) return { text: "", suggestions: [] };
  const match = content.match(SUGGESTION_RE);
  if (!match) return { text: content, suggestions: [] };
  const suggestions = match[1].split("|").map((s) => s.trim()).filter(Boolean).slice(0, 3);
  return { text: content.replace(SUGGESTION_RE, "").trimEnd(), suggestions };
}

interface Props {
  message: ChatMessage;
  index: number;
  onQueryTransfer?: (from: string, to: string) => void;
  onSuggestionClick?: (text: string) => void;
  disableQuickReplies?: boolean;
}

export function MessageBubble({ message, index, onQueryTransfer, onSuggestionClick, disableQuickReplies }: Props) {
  const isUser = message.role === "user";
  const { t } = useI18n();
  const cards = useMemo(() => (isUser ? [] : extractCards(message.tool_calls)), [isUser, message.tool_calls]);
  const { bodyForMarkdown, replyChips } = useMemo(() => {
    if (isUser) return { bodyForMarkdown: message.content, replyChips: [] as string[] };
    if (message.quick_replies?.length) {
      return { bodyForMarkdown: message.content, replyChips: message.quick_replies };
    }
    const fromActions = parseQuickRepliesFromContent(message.content);
    if (fromActions.replies.length > 0) {
      return { bodyForMarkdown: fromActions.text, replyChips: fromActions.replies };
    }
    const legacy = parseSuggestions(message.content);
    return { bodyForMarkdown: legacy.text, replyChips: legacy.suggestions };
  }, [isUser, message.content, message.quick_replies]);
  /** 已有工具卡片（车次/中转）时不再展示快捷按钮，避免与卡片操作重复 */
  const showQuickReplies =
    !isUser && replyChips.length > 0 && !!onSuggestionClick && cards.length === 0;
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
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.04, 0.25), ease: [0.22, 1, 0.36, 1] }}
    >
      <Box sx={{ display: "flex", width: "100%", gap: 1.5, flexDirection: isUser ? "row-reverse" : "row" }}>
        <Avatar
          sx={{
            width: 34,
            height: 34,
            borderRadius: "10px",
            bgcolor: isUser ? "primary.main" : undefined,
            background: isUser ? undefined : "linear-gradient(135deg, #3B82F6, #06B6D4)",
            fontSize: "0.875rem",
          }}
        >
          {isUser ? <User size={16} /> : <Bot size={16} />}
        </Avatar>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75, minWidth: 0, overflow: "hidden", ...(isUser ? { ml: "auto", maxWidth: "75%", alignItems: "flex-end" } : { width: "100%", alignItems: "flex-start" }) }}>
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
                ? { maxWidth: "min(560px,100%)", borderRadius: "18px 18px 6px 18px", bgcolor: "primary.main", color: "primary.contrastText", px: 2, py: 1.25, whiteSpace: "pre-wrap", boxShadow: "var(--shadow-primary)" }
                : isProgressOnly
                  ? { width: "100%" }
                  : { width: "100%", borderRadius: "18px 18px 18px 6px", border: 1, borderColor: (th: any) => `${th.palette.divider}40`, bgcolor: "background.paper", px: 2.25, py: 1.5, boxShadow: "var(--shadow-xs)" }),
            }}
          >
            {isUser ? (
              message.content
            ) : isProgressOnly ? (
              <Box sx={{ width: "100%" }}>
                <ButtonBase
                  onClick={() => setProgressExpanded(message.id, !progressExpanded)}
                  sx={{ width: "100%", borderRadius: "12px", border: 1, borderColor: "divider", bgcolor: "background.default", p: 2, textAlign: "left", display: "block" }}
                >
                  <Box sx={{ display: "flex", gap: 1.5 }}>
                    <Box sx={{ mt: 0.5, flexShrink: 0 }}>
                      <CircularProgress size={22} />
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
                      <LinearProgress variant="determinate" value={message.progress?.percent ?? 0} sx={{ mt: 1, borderRadius: 1, height: 5 }} />
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
                              sx={{ fontSize: "0.625rem", justifyContent: "center", borderRadius: "6px" }}
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
                      <Box sx={{ mt: 1, display: "flex", flexDirection: "column", gap: 0.75, borderRadius: "12px", border: 1, borderColor: "divider", bgcolor: "background.default", p: 1.5 }}>
                        {recentEvents.map((event: ProgressEvent, ei) => (
                          <Box key={`${event.timestamp || ei}-${ei}`} sx={{ display: "flex", gap: 1, borderRadius: "10px", bgcolor: "background.paper", px: 1.5, py: 1 }}>
                            <Box sx={{ mt: 0.75, width: 7, height: 7, borderRadius: "50%", flexShrink: 0, bgcolor: ei === recentEvents.length - 1 ? "primary.main" : "text.disabled" }} />
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
              <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1.5 prose-p:leading-7 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5 prose-headings:my-2 prose-strong:text-foreground prose-code:text-xs prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded-md prose-pre:bg-muted prose-pre:p-3 prose-pre:rounded-xl">
                <ReactMarkdown>{bodyForMarkdown}</ReactMarkdown>
                {showQuickReplies ? (
                  <AssistantQuickReplies
                    options={replyChips}
                    onSelect={onSuggestionClick!}
                    disabled={disableQuickReplies}
                  />
                ) : null}
              </div>
            )}
          </Box>

          {cards.length > 0 && <TrainResultCards cards={cards} onQueryTransfer={onQueryTransfer} messageId={message.id} />}
        </Box>
      </Box>
    </motion.div>
  );
}
