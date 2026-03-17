import { create } from "zustand";
import type { ChatMessage, Conversation } from "@/types/chat";

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  userId: string;
  getActiveConversation: () => Conversation | undefined;
  createConversation: () => string;
  setActiveConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  addMessage: (conversationId: string, message: ChatMessage) => void;
  updateConversationId: (oldId: string, newId: string) => void;
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

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  userId: typeof window !== "undefined" ? getUserId() : "default",

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
    }));
  },
}));
