"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { Bot, User, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ChatMessage } from "@/types/chat";
import { cn } from "@/utils/cn";
import { extractCards } from "@/utils/parseToolCards";
import { TrainResultCards } from "./TrainResultCards";

interface Props {
  message: ChatMessage;
  index: number;
  onQueryTransfer?: (from: string, to: string) => void;
}

export function MessageBubble({ message, index, onQueryTransfer }: Props) {
  const isUser = message.role === "user";
  const cards = useMemo(
    () => (isUser ? [] : extractCards(message.tool_calls)),
    [isUser, message.tool_calls],
  );

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
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-headings:my-2 prose-strong:text-foreground prose-code:text-xs prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-muted prose-pre:p-2 prose-pre:rounded-lg">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )}
        </div>

        {cards.length > 0 && (
          <TrainResultCards cards={cards} onQueryTransfer={onQueryTransfer} />
        )}
      </div>
    </motion.div>
  );
}
