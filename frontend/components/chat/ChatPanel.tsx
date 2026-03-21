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
          <div className="flex h-full w-full items-center justify-center px-4 py-6 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="w-full max-w-3xl"
            >
              {/* Portrait: vertical stack */}
              <div className="flex flex-col items-center gap-4 text-center md:hidden p-4">
                <RobotAnimation className="w-28 h-28" />
                <h2 className="text-xl font-bold tracking-tight text-foreground">
                  {t("chat.welcome.title")}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
                  {t("chat.welcome.body").split("\n").map((line, idx) => (
                    <span key={idx}>{line}{idx === 0 ? <br /> : null}</span>
                  ))}
                </p>
                <QuickActions onSelect={sendMessage} />
              </div>

              {/* Landscape: horizontal layout */}
              <div className="hidden md:flex items-center gap-8 p-6">
                <div className="flex-shrink-0">
                  <RobotAnimation className="w-36 h-36 lg:w-44 lg:h-44" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-2xl font-bold tracking-tight text-foreground">
                    {t("chat.welcome.title")}
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed mt-2 max-w-lg">
                    {t("chat.welcome.body").split("\n").map((line, idx) => (
                      <span key={idx}>{line}{idx === 0 ? <br /> : null}</span>
                    ))}
                  </p>
                  <div className="mt-4">
                    <QuickActions onSelect={sendMessage} />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        ) : (
          <div className="mx-auto w-full max-w-5xl space-y-2.5 px-3 py-3 sm:space-y-3 sm:px-5 sm:py-4 lg:px-6">
            {messages.map((msg, i) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                index={i}
                onQueryTransfer={handleQueryTransfer}
                onSuggestionClick={sendMessage}
                disableQuickReplies={loading}
              />
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>
      <div className="border-t border-border/40 bg-card/60 backdrop-blur-md px-3 py-2 sm:px-5 sm:py-2.5 lg:px-6 lg:rounded-b-[1.25rem]">
        <div className="mx-auto w-full max-w-3xl">
          <ChatInput onSend={sendMessage} loading={loading} conversationId={activeConv?.id} />
        </div>
      </div>
    </div>
  );
}
