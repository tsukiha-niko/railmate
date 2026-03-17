"use client";

import { useState, useCallback } from "react";
import { useChatStore } from "@/store/chatStore";
import { useUserContextStore } from "@/store/userContextStore";
import { postChat } from "@/services/chat";
import type { ChatMessage } from "@/types/chat";
import { useI18n } from "@/lib/i18n/i18n";

export function useChat() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useI18n();
  const store = useChatStore();
  const location = useUserContextStore((s) => s.location);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || loading) return;
      setError(null);
      let convId = store.activeConversationId;
      if (!convId) convId = store.createConversation();

      const userMsg: ChatMessage = { id: `u_${Date.now()}`, role: "user", content: text, timestamp: Date.now() };
      store.addMessage(convId, userMsg);
      setLoading(true);
      try {
        const res = await postChat({
          message: text, conversation_id: convId, user_id: store.userId,
          location: location ? { city: location.city, station: location.station } : undefined,
        });
        if (res.conversation_id !== convId) { store.updateConversationId(convId, res.conversation_id); convId = res.conversation_id; }
        const aiMsg: ChatMessage = { id: `a_${Date.now()}`, role: "assistant", content: res.answer, tool_calls: res.tool_calls, timestamp: Date.now() };
        store.addMessage(convId, aiMsg);
      } catch (err) {
        const message = err instanceof Error ? err.message : t("errors.requestFailed");
        setError(message);
        const errMsg: ChatMessage = { id: `e_${Date.now()}`, role: "assistant", content: t("errors.chatApology", { message }), timestamp: Date.now() };
        store.addMessage(convId!, errMsg);
      } finally {
        setLoading(false);
      }
    },
    [loading, store, location, t],
  );

  return { sendMessage, loading, error };
}
