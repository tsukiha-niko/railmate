import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ChatMessage, Conversation } from "@/types/chat";

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  userId: string;
  _hydrated: boolean;
  /** 正在等待 AI 回复的对话 ID（内存态，跨页面导航保留，刷新后清空） */
  pendingConvId: string | null;
  getActiveConversation: () => Conversation | undefined;
  createConversation: () => string;
  setActiveConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  addMessage: (conversationId: string, message: ChatMessage) => void;
  updateConversationId: (oldId: string, newId: string) => void;
  setPendingConvId: (id: string | null) => void;
}

function getUserId(): string {
  if (typeof window === "undefined") return "default";
  let uid = localStorage.getItem("railmate_user_id");
  if (!uid) { uid = `user_${genId()}`; localStorage.setItem("railmate_user_id", uid); }
  return uid;
}

function getDefaultConversationTitle(): string {
  if (typeof window === "undefined") return "New chat";
  const locale = localStorage.getItem("railmate.locale");
  return locale === "en" ? "New chat" : "新对话";
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      conversations: [],
      activeConversationId: null,
      userId: typeof window !== "undefined" ? getUserId() : "default",
      _hydrated: false,
      pendingConvId: null,

      getActiveConversation() {
        const state = get();
        return state.conversations.find((c) => c.id === state.activeConversationId);
      },

      createConversation() {
        const id = genId();
        const conv: Conversation = { id, title: getDefaultConversationTitle(), messages: [], createdAt: Date.now(), updatedAt: Date.now() };
        set((s) => ({ conversations: [conv, ...s.conversations], activeConversationId: id }));
        return id;
      },

      setActiveConversation(id) { set({ activeConversationId: id }); },

      deleteConversation(id) {
        set((s) => {
          const filtered = s.conversations.filter((c) => c.id !== id);
          return { conversations: filtered, activeConversationId: s.activeConversationId === id ? (filtered[0]?.id ?? null) : s.activeConversationId };
        });
      },

      addMessage(conversationId, message) {
        set((s) => ({
          conversations: s.conversations.map((c) => {
            if (c.id !== conversationId) return c;
            const msgs = [...c.messages, message];
            const title = c.messages.length === 0 && message.role === "user" ? message.content.slice(0, 20) : c.title;
            return { ...c, messages: msgs, title, updatedAt: Date.now() };
          }),
        }));
      },

      updateConversationId(oldId, newId) {
        set((s) => ({
          conversations: s.conversations.map((c) => (c.id === oldId ? { ...c, id: newId } : c)),
          activeConversationId: s.activeConversationId === oldId ? newId : s.activeConversationId,
          pendingConvId: s.pendingConvId === oldId ? newId : s.pendingConvId,
        }));
      },

      setPendingConvId(id) {
        set({ pendingConvId: id });
      },
    }),
    {
      name: "railmate-chat",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? localStorage : {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        },
      ),
      partialize: (state) => ({
        conversations: state.conversations,
        activeConversationId: state.activeConversationId,
        userId: state.userId,
        // pendingConvId 不持久化：刷新后 loading 状态应自动清空
      }),
      onRehydrateStorage: () => () => {
        useChatStore.setState({ _hydrated: true });
      },
    },
  ),
);
