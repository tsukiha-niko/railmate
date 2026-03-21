"use client";

import { useEffect } from "react";
import { ConversationList } from "@/components/chat/ConversationList";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { ContextSidebar } from "@/components/chat/ContextSidebar";
import { useUIStore } from "@/store/uiStore";
import { useChatStore } from "@/store/chatStore";
import { useGeoLocation } from "@/hooks/useGeoLocation";
import { useUserContextStore } from "@/store/userContextStore";
import { setUserLocation } from "@/services/chat";
import { cn } from "@/utils/cn";

export default function HomePage() {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const contextOpen = useUIStore((s) => s.contextPanelOpen);
  const conversations = useChatStore((s) => s.conversations);
  const activeId = useChatStore((s) => s.activeConversationId);
  const hydrated = useChatStore((s) => s._hydrated);
  const createConv = useChatStore((s) => s.createConversation);
  const location = useUserContextStore((s) => s.location);
  const locationHydrated = useUserContextStore((s) => s._hasHydrated);
  const userId = useChatStore((s) => s.userId);
  const { detectByIP } = useGeoLocation();

  useEffect(() => {
    if (!locationHydrated) return;
    if (location) {
      setUserLocation({ city: location.city, station: location.station || undefined }, userId).catch(() => {});
    } else {
      detectByIP();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationHydrated]);

  useEffect(() => {
    if (!hydrated) return;
    if (conversations.length === 0 || !activeId) {
      createConv();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  return (
    <div className="relative flex min-h-0 flex-1 overflow-hidden bg-transparent">
      <aside
        className={cn(
          "hidden w-[19.5rem] shrink-0 border-r border-border/60 bg-card/50 backdrop-blur-xl transition-all duration-300 lg:flex",
          !sidebarOpen && "lg:hidden",
        )}
      >
        <ConversationList />
      </aside>

      <section className="flex min-h-0 min-w-0 flex-1 flex-col px-0 pb-0 lg:px-2 lg:pb-2 xl:px-3">
        <div className="flex min-h-0 flex-1 flex-col bg-transparent lg:rounded-[1.25rem] lg:border lg:border-border/30 lg:bg-card/[0.12] lg:shadow-[var(--shadow-xs)]">
          <ChatPanel />
        </div>
      </section>

      <aside
        className={cn(
          "hidden w-[19.5rem] shrink-0 border-l border-border/60 bg-card/50 backdrop-blur-xl transition-all duration-300 xl:flex",
          !contextOpen && "xl:hidden",
        )}
      >
        <ContextSidebar />
      </aside>
    </div>
  );
}
