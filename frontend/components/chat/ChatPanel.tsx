"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Train } from "lucide-react";
import { useChatStore } from "@/store/chatStore";
import { useChat } from "@/hooks/useChat";
import { MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";
import { QuickActions } from "./QuickActions";
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

  const messages = activeConv?.messages ?? [];

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center gap-4 max-w-md text-center"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-lg">
                <Train className="h-8 w-8" />
              </div>
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
          <div className="space-y-4 p-4">
            {messages.map((msg, i) => (
              <MessageBubble key={msg.id} message={msg} index={i} />
            ))}
            {loading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-white">
                  <Train className="h-4 w-4" />
                </div>
                <div className="rounded-2xl rounded-bl-md bg-secondary px-4 py-3">
                  <div className="flex gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" />
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:0.15s]" />
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:0.3s]" />
                  </div>
                </div>
              </motion.div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>
      <ChatInput onSend={sendMessage} loading={loading} />
    </div>
  );
}
