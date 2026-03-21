"use client";

import { useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { useChatStore } from "@/store/chatStore";
import { useChat } from "@/hooks/useChat";
import { MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";
import { QuickActions } from "./QuickActions";
import { RobotAnimation } from "./RobotAnimation";
import { useI18n } from "@/lib/i18n/i18n";
import { useChatViewStore } from "@/store/chatViewStore";

export function ChatPanel() {
  const activeConv = useChatStore((s) =>
    s.conversations.find((c) => c.id === s.activeConversationId),
  );
  const { sendMessage, loading } = useChat();
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastMessageCountRef = useRef<number | null>(null);
  const { t } = useI18n();
  const savedScrollTop = useChatViewStore((s) =>
    activeConv?.id ? s.scrollTopByConversation[activeConv.id] : undefined,
  );
  const setScrollTop = useChatViewStore((s) => s.setScrollTop);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const currentCount = activeConv?.messages.length ?? 0;
    if (lastMessageCountRef.current == null) {
      if (typeof savedScrollTop === "number") {
        container.scrollTop = savedScrollTop;
      } else {
        container.scrollTop = container.scrollHeight;
      }
    } else if (currentCount > lastMessageCountRef.current) {
      const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
      if (distanceFromBottom < 140) {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    }
    lastMessageCountRef.current = currentCount;
  }, [activeConv?.id, activeConv?.messages.length, savedScrollTop]);

  useEffect(() => {
    lastMessageCountRef.current = null;
  }, [activeConv?.id]);

  const handleQueryTransfer = useCallback(
    (from: string, to: string) => {
      const msg = t("chat.card.queryTransferFor", { from, to });
      sendMessage(msg);
    },
    [sendMessage, t],
  );

  const messages = activeConv?.messages ?? [];

  return (
    <div className="flex h-full w-full flex-col">
      <div
        ref={scrollRef}
        className="flex-1 overflow-x-hidden overflow-y-auto"
        onScroll={() => {
          if (activeConv?.id && scrollRef.current) {
            setScrollTop(activeConv.id, scrollRef.current.scrollTop);
          }
        }}
      >
        {messages.length === 0 ? (
          <div className="flex h-full w-full flex-col items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="flex w-full max-w-2xl flex-col items-center gap-5 rounded-3xl border border-border/50 bg-card/60 p-6 text-center shadow-[0_12px_48px_-16px_rgba(15,23,42,0.12)] backdrop-blur-sm sm:p-10"
            >
              <RobotAnimation className="w-32 h-32 md:w-40 md:h-40" />
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                {t("chat.welcome.title")}
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-md">
                {t("chat.welcome.body").split("\n").map((line, idx) => (
                  <span key={idx}>{line}{idx === 0 ? <br /> : null}</span>
                ))}
              </p>
              <QuickActions onSelect={sendMessage} />
            </motion.div>
          </div>
        ) : (
          <div className="mx-auto w-full max-w-6xl space-y-4 px-4 py-4 sm:px-5 lg:px-7">
            {messages.map((msg, i) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                index={i}
                onQueryTransfer={handleQueryTransfer}
              />
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>
      <div className="border-t border-border/40 bg-background/80 px-3 py-2.5 backdrop-blur-lg sm:px-5 sm:py-3 lg:px-7">
        <div className="mx-auto w-full max-w-4xl">
          <ChatInput onSend={sendMessage} loading={loading} conversationId={activeConv?.id} />
        </div>
      </div>
    </div>
  );
}
