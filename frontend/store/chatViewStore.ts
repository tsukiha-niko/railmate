import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface ChatViewState {
  drafts: Record<string, string>;
  scrollTopByConversation: Record<string, number>;
  progressExpandedByMessage: Record<string, boolean>;
  cardExpandedByMessage: Record<string, Record<number, boolean>>;

  setDraft: (conversationId: string, text: string) => void;
  clearDraft: (conversationId: string) => void;
  setScrollTop: (conversationId: string, top: number) => void;
  setProgressExpanded: (messageId: string, expanded: boolean) => void;
  setCardExpanded: (messageId: string, cardIndex: number, expanded: boolean) => void;
}

export const useChatViewStore = create<ChatViewState>()(
  persist(
    (set) => ({
      drafts: {},
      scrollTopByConversation: {},
      progressExpandedByMessage: {},
      cardExpandedByMessage: {},

      setDraft(conversationId, text) {
        set((state) => ({
          drafts: { ...state.drafts, [conversationId]: text },
        }));
      },
      clearDraft(conversationId) {
        set((state) => {
          const next = { ...state.drafts };
          delete next[conversationId];
          return { drafts: next };
        });
      },
      setScrollTop(conversationId, top) {
        set((state) => ({
          scrollTopByConversation: {
            ...state.scrollTopByConversation,
            [conversationId]: top,
          },
        }));
      },
      setProgressExpanded(messageId, expanded) {
        set((state) => ({
          progressExpandedByMessage: {
            ...state.progressExpandedByMessage,
            [messageId]: expanded,
          },
        }));
      },
      setCardExpanded(messageId, cardIndex, expanded) {
        set((state) => ({
          cardExpandedByMessage: {
            ...state.cardExpandedByMessage,
            [messageId]: {
              ...(state.cardExpandedByMessage[messageId] || {}),
              [cardIndex]: expanded,
            },
          },
        }));
      },
    }),
    {
      name: "railmate-chat-view",
      storage: createJSONStorage(() =>
        typeof window !== "undefined"
          ? sessionStorage
          : {
              getItem: () => null,
              setItem: () => {},
              removeItem: () => {},
            },
      ),
    },
  ),
);
