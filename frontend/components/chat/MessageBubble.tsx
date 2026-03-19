"use client";

import { useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { Bot, Check, ChevronDown, Loader2, User, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
  const cards = useMemo(
    () => (isUser ? [] : extractCards(message.tool_calls)),
    [isUser, message.tool_calls],
  );
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.05, 0.3) }}
      className={cn("flex gap-3 max-w-full", isUser ? "flex-row-reverse" : "flex-row")}
    >
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white",
          isUser ? "bg-primary" : "bg-gradient-to-br from-blue-500 to-cyan-500",
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      <div className={cn("flex flex-col gap-1.5 max-w-[80%]", isUser ? "items-end" : "items-start")}>
        {!isUser && message.tool_calls && message.tool_calls.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-1">
            {message.tool_calls.map((tc, i) => (
              <Badge key={i} variant="secondary" className="gap-1 text-[11px]">
                <Wrench className="h-2.5 w-2.5" />
                {tc.tool_name}
              </Badge>
            ))}
          </div>
        )}

        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
            isUser
              ? "bg-primary text-primary-foreground rounded-br-md whitespace-pre-wrap"
              : "bg-secondary text-secondary-foreground rounded-bl-md",
          )}
        >
          {isUser ? (
            message.content
          ) : message.status === "pending" && !message.content ? (
            <div className="min-w-[290px] max-w-[420px]">
              <button
                type="button"
                onClick={() => setProgressExpanded(message.id, !progressExpanded)}
                className="w-full rounded-2xl border border-white/5 bg-gradient-to-b from-background/70 to-background/40 p-3 text-left transition-colors hover:border-primary/20"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Loader2 className="h-4.5 w-4.5 animate-spin" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[11px] font-medium tracking-wide text-muted-foreground">
                          {t("chat.progress.current")}
                        </p>
                        <p className="truncate text-sm font-semibold text-foreground">
                          {message.progress?.current_message || t("chat.progress.processing")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-medium tabular-nums text-muted-foreground">
                          {message.progress?.percent ?? 0}%
                        </span>
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 text-muted-foreground transition-transform",
                            progressExpanded && "rotate-180",
                          )}
                        />
                      </div>
                    </div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-background/80">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-500"
                        style={{ width: `${message.progress?.percent ?? 0}%` }}
                      />
                    </div>
                    <div className="mt-3 grid grid-cols-5 gap-1.5">
                      {stageDefs.map((stage, stageIndex) => {
                        const state =
                          stageIndex < currentStageIndex ? "done" :
                          stageIndex === currentStageIndex ? "active" : "idle";
                        return (
                          <div
                            key={stage.id}
                            className={cn(
                              "flex items-center justify-center rounded-xl border px-1.5 py-1.5 text-[10px] font-medium",
                              state === "done" && "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
                              state === "active" && "border-primary/30 bg-primary/10 text-primary",
                              state === "idle" && "border-white/5 bg-background/50 text-muted-foreground",
                            )}
                          >
                            {state === "done" ? <Check className="mr-1 h-3 w-3" /> : null}
                            <span className="truncate">{stage.label}</span>
                          </div>
                        );
                      })}
                    </div>
                    {latestDetail ? (
                      <p className="mt-2 truncate text-[11px] text-muted-foreground">
                        {latestDetail}
                      </p>
                    ) : null}
                  </div>
                </div>
              </button>

              <AnimatePresence initial={false}>
                {progressExpanded && recentEvents.length > 0 ? (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-2 space-y-2 rounded-2xl border border-white/5 bg-background/30 p-3">
                      {recentEvents.map((event: ProgressEvent, eventIndex) => (
                        <div
                          key={`${event.timestamp || eventIndex}-${eventIndex}`}
                          className="flex gap-2 rounded-xl bg-background/60 px-3 py-2.5"
                        >
                          <div className={cn(
                            "mt-1 h-2 w-2 shrink-0 rounded-full",
                            eventIndex === recentEvents.length - 1 ? "bg-primary" : "bg-muted-foreground/40",
                          )} />
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-foreground/90">{event.message}</p>
                            {event.detail ? (
                              <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{event.detail}</p>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-headings:my-2 prose-strong:text-foreground prose-code:text-xs prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-muted prose-pre:p-2 prose-pre:rounded-lg">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )}
        </div>

        {cards.length > 0 && (
          <TrainResultCards cards={cards} onQueryTransfer={onQueryTransfer} messageId={message.id} />
        )}
      </div>
    </motion.div>
  );
}
