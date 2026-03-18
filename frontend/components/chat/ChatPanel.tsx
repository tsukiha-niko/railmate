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

export function ChatPanel() {
  const activeConv = useChatStore((s) =>
    s.conversations.find((c) => c.id === s.activeConversationId),
  );
  const { sendMessage, loading } = useChat();
  const bottomRef = useRef<HTMLDivElement>(null);
  const { t } = useI18n();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConv?.messages.length]);

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
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex h-full w-full flex-col items-center justify-center px-4 sm:px-6 lg:px-8 2xl:mx-auto 2xl:max-w-6xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center gap-4 max-w-md text-center"
            >
              <RobotAnimation className="w-36 h-36 md:w-44 md:h-44" />
              <h2 className="text-xl font-semibold text-foreground">
                {t("chat.welcome.title")}
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t("chat.welcome.body").split("\n").map((line, idx) => (
                  <span key={idx}>{line}{idx === 0 ? <br /> : null}</span>
                ))}
              </p>
              <QuickActions onSelect={sendMessage} />
            </motion.div>
          </div>
        ) : (
          <div className="w-full space-y-4 px-4 py-4 sm:px-6 lg:px-8 2xl:mx-auto 2xl:max-w-6xl">
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
      <div className="border-t border-border bg-background/85 px-4 py-4 backdrop-blur-sm sm:px-6 lg:px-8">
        <div className="w-full 2xl:mx-auto 2xl:max-w-6xl">
          <ChatInput onSend={sendMessage} loading={loading} />
        </div>
      </div>
    </div>
  );
}
