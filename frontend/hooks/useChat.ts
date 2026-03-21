"use client";

import { useState, useCallback, useRef } from "react";
import { useChatStore } from "@/store/chatStore";
import { useUserContextStore } from "@/store/userContextStore";
import { streamChat, createChatJob, getChatJob } from "@/services/chat";
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
  const pendingConvId = useChatStore((s) => s.pendingConvId);
  const setPendingConvId = useChatStore((s) => s.setPendingConvId);
  const activeId = useChatStore((s) => s.activeConversationId);
  const loading = pendingConvId !== null && pendingConvId === activeId;
  const abortRef = useRef<AbortController | null>(null);

  const sendViaSSE = useCallback(
    async (text: string, convId: string, pendingMessageId: string) => {
      let resolvedConvId = convId;

      await streamChat(
        {
          message: text,
          conversation_id: resolvedConvId,
          user_id: store.userId,
          location: location ? { city: location.city, station: location.station } : undefined,
          planning_mode: planningMode,
        },
        {
          onStart: (data) => {
            if (data.conversation_id !== resolvedConvId) {
              store.updateConversationId(resolvedConvId, data.conversation_id);
              resolvedConvId = data.conversation_id;
            }
          },
          onProgress: (data) => {
            store.updateMessage(resolvedConvId, pendingMessageId, {
              status: "pending",
              progress: {
                percent: data.percent,
                current_message: data.message,
                events: [],
              },
            });
          },
          onDone: (data) => {
            if (data.conversation_id !== resolvedConvId) {
              store.updateConversationId(resolvedConvId, data.conversation_id);
              resolvedConvId = data.conversation_id;
            }
            store.updateMessage(resolvedConvId, pendingMessageId, {
              content: data.answer,
              tool_calls: data.tool_calls,
              quick_replies: data.quick_replies?.length ? data.quick_replies : undefined,
              timestamp: Date.now(),
              status: "complete",
              progress: null,
            });
          },
          onError: (data) => {
            throw new Error(data.message || t("errors.requestFailed"));
          },
        },
      );
    },
    [store, location, planningMode, t],
  );

  const sendViaPolling = useCallback(
    async (text: string, convId: string, pendingMessageId: string) => {
      let resolvedConvId = convId;

      const job = await createChatJob({
        message: text,
        conversation_id: resolvedConvId,
        user_id: store.userId,
        location: location ? { city: location.city, station: location.station } : undefined,
        planning_mode: planningMode,
      });

      if (job.conversation_id !== resolvedConvId) {
        store.updateConversationId(resolvedConvId, job.conversation_id);
        resolvedConvId = job.conversation_id;
      }

      let finished = false;
      while (!finished) {
        const snapshot = await getChatJob(job.job_id);
        if (snapshot.conversation_id !== resolvedConvId) {
          store.updateConversationId(resolvedConvId, snapshot.conversation_id);
          resolvedConvId = snapshot.conversation_id;
        }

        store.updateMessage(resolvedConvId, pendingMessageId, {
          status: snapshot.status === "failed" ? "error" : snapshot.status === "completed" ? "complete" : "pending",
          progress: {
            percent: snapshot.progress_percent,
            current_message: snapshot.current_message,
            events: snapshot.events,
          },
        });

        if (snapshot.status === "completed" && snapshot.result) {
          store.updateMessage(resolvedConvId, pendingMessageId, {
            content: snapshot.result.answer,
            tool_calls: snapshot.result.tool_calls,
            quick_replies: snapshot.result.quick_replies?.length ? snapshot.result.quick_replies : undefined,
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
    },
    [store, location, planningMode, t],
  );

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
        try {
          await sendViaSSE(text, convId, pendingMessageId);
        } catch (sseErr) {
          console.warn("[useChat] SSE failed, falling back to polling:", sseErr);
          await sendViaPolling(text, convId, pendingMessageId);
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
    [pendingConvId, store, t, setPendingConvId, sendViaSSE, sendViaPolling],
  );

  return { sendMessage, loading, error };
}
