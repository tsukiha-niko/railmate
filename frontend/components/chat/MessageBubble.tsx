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
  const isProgressOnly = !isUser && message.status === "pending" && !message.content;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.05, 0.3) }}
      className={cn("flex w-full gap-2.5 sm:gap-3", isUser ? "flex-row-reverse" : "flex-row")}
    >
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white shadow-sm",
          isUser ? "bg-primary" : "bg-gradient-to-br from-blue-500 to-cyan-500",
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      <div
        className={cn(
          "flex min-w-0 flex-col gap-1.5 overflow-x-hidden",
          isUser
            ? "ml-auto max-w-[82%] items-end sm:max-w-[74%]"
            : "w-full max-w-[980px] items-start",
        )}
      >
        {!isUser && message.tool_calls && message.tool_calls.length > 0 && (
          <div className="mb-1 flex flex-wrap gap-1.5">
            {message.tool_calls.map((tc, i) => (
              <Badge key={i} variant="secondary" className="gap-1 bg-card/70 text-[11px]">
                <Wrench className="h-2.5 w-2.5" />
                {tc.tool_name}
              </Badge>
            ))}
          </div>
        )}

        <div
          className={cn(
            "text-sm leading-relaxed",
            isUser
              ? "max-w-[min(840px,100%)] rounded-2xl rounded-br-md bg-gradient-to-br from-primary to-primary/85 px-3.5 py-2.5 text-primary-foreground whitespace-pre-wrap shadow-[0_8px_22px_-18px_color-mix(in_oklab,var(--primary)_80%,transparent)] sm:px-4"
              : isProgressOnly
                ? "w-full max-w-full"
                : "max-w-[min(840px,100%)] rounded-2xl rounded-bl-md border border-border/70 bg-card/75 px-3.5 py-2.5 text-secondary-foreground sm:px-4",
          )}
        >
          {isUser ? (
            message.content
          ) : isProgressOnly ? (
            <div className="w-full max-w-[620px] min-w-0">
              <button
                type="button"
                onClick={() => setProgressExpanded(message.id, !progressExpanded)}
                className="w-full rounded-2xl border border-border/60 bg-gradient-to-b from-background/85 to-background/55 p-3 text-left transition-colors hover:border-primary/25"
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
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-background/90">
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
                              state === "idle" && "border-border/60 bg-background/70 text-muted-foreground",
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
                          className="flex gap-2 rounded-xl bg-background/70 px-3 py-2.5"
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
            <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1.5 prose-p:leading-7 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5 prose-headings:my-2 prose-strong:text-foreground prose-code:text-xs prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-muted prose-pre:p-2 prose-pre:rounded-lg">
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
