"use client";

import { useState, useCallback } from "react";
import { useChatStore } from "@/store/chatStore";
import { useUserContextStore } from "@/store/userContextStore";
import { postChat } from "@/services/chat";
import type { ChatMessage } from "@/types/chat";
import { useI18n } from "@/lib/i18n/i18n";

export function useChat() {
  const [error, setError] = useState<string | null>(null);
  const { t } = useI18n();
  const store = useChatStore();
  const location = useUserContextStore((s) => s.location);

  // loading 状态存入 store，跨页面导航不丢失
  const pendingConvId = useChatStore((s) => s.pendingConvId);
  const setPendingConvId = useChatStore((s) => s.setPendingConvId);
  const activeId = useChatStore((s) => s.activeConversationId);
  const loading = pendingConvId !== null && pendingConvId === activeId;

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || pendingConvId !== null) return;
      setError(null);
      let convId = store.activeConversationId;
      if (!convId) convId = store.createConversation();

      const userMsg: ChatMessage = {
        id: `u_${Date.now()}`,
        role: "user",
        content: text,
        timestamp: Date.now(),
      };
      store.addMessage(convId, userMsg);
      setPendingConvId(convId);
      try {
        const res = await postChat({
          message: text,
          conversation_id: convId,
          user_id: store.userId,
          location: location ? { city: location.city, station: location.station } : undefined,
        });
        if (res.conversation_id !== convId) {
          store.updateConversationId(convId, res.conversation_id);
          convId = res.conversation_id;
        }
        const aiMsg: ChatMessage = {
          id: `a_${Date.now()}`,
          role: "assistant",
          content: res.answer,
          tool_calls: res.tool_calls,
          timestamp: Date.now(),
        };
        store.addMessage(convId, aiMsg);
      } catch (err) {
        const message = err instanceof Error ? err.message : t("errors.requestFailed");
        setError(message);
        const errMsg: ChatMessage = {
          id: `e_${Date.now()}`,
          role: "assistant",
          content: t("errors.chatApology", { message }),
          timestamp: Date.now(),
        };
        store.addMessage(convId!, errMsg);
      } finally {
        setPendingConvId(null);
      }
    },
    [pendingConvId, store, location, t, setPendingConvId],
  );

  return { sendMessage, loading, error };
}
