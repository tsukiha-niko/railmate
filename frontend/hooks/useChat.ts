"use client";

import { useState, useCallback } from "react";
import { useChatStore } from "@/store/chatStore";
import { useUserContextStore } from "@/store/userContextStore";
import { createChatJob, getChatJob } from "@/services/chat";
import type { ChatMessage } from "@/types/chat";
import { useI18n } from "@/lib/i18n/i18n";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function useChat() {
  const [error, setError] = useState<string | null>(null);
  const { t } = useI18n();
  const store = useChatStore();
  const location = useUserContextStore((s) => s.location);
  const planningMode = useUserContextStore((s) => s.planningMode);

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
      const pendingMessageId = `a_${Date.now()}`;
      const pendingMessage: ChatMessage = {
        id: pendingMessageId,
        role: "assistant",
        content: "",
        timestamp: Date.now(),
        status: "pending",
        progress: {
          percent: 0,
          current_message: t("chat.progress.created"),
          events: [],
        },
      };
      store.addMessage(convId, pendingMessage);
      try {
        const job = await createChatJob({
          message: text,
          conversation_id: convId,
          user_id: store.userId,
          location: location ? { city: location.city, station: location.station } : undefined,
          planning_mode: planningMode,
        });

        if (job.conversation_id !== convId) {
          store.updateConversationId(convId, job.conversation_id);
          convId = job.conversation_id;
        }

        let finished = false;
        while (!finished) {
          const snapshot = await getChatJob(job.job_id);
          if (snapshot.conversation_id !== convId) {
            store.updateConversationId(convId, snapshot.conversation_id);
            convId = snapshot.conversation_id;
          }

          store.updateMessage(convId, pendingMessageId, {
            status: snapshot.status === "failed" ? "error" : snapshot.status === "completed" ? "complete" : "pending",
            progress: {
              percent: snapshot.progress_percent,
              current_message: snapshot.current_message,
              events: snapshot.events,
            },
          });

          if (snapshot.status === "completed" && snapshot.result) {
            store.updateMessage(convId, pendingMessageId, {
              content: snapshot.result.answer,
              tool_calls: snapshot.result.tool_calls,
              timestamp: Date.now(),
              status: "complete",
              progress: null,
            });
            finished = true;
            break;
          }

          if (snapshot.status === "failed") {
            throw new Error(snapshot.error || t("errors.requestFailed"));
          }

          await sleep(1200);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : t("errors.requestFailed");
        setError(message);
        store.updateMessage(convId!, pendingMessageId, {
          content: t("errors.chatApology", { message }),
          timestamp: Date.now(),
          status: "error",
          progress: null,
        });
      } finally {
        setPendingConvId(null);
      }
    },
    [pendingConvId, store, location, planningMode, t, setPendingConvId],
  );

  return { sendMessage, loading, error };
}
