"use client";

import { useEffect } from "react";
import { ConversationList } from "@/components/chat/ConversationList";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { ContextSidebar } from "@/components/chat/ContextSidebar";
import { useUIStore } from "@/store/uiStore";
import { useChatStore } from "@/store/chatStore";
import { useGeoLocation } from "@/hooks/useGeoLocation";
import { useUserContextStore } from "@/store/userContextStore";
import { cn } from "@/utils/cn";

export default function HomePage() {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const contextOpen = useUIStore((s) => s.contextPanelOpen);
  const conversations = useChatStore((s) => s.conversations);
  const activeId = useChatStore((s) => s.activeConversationId);
  const createConv = useChatStore((s) => s.createConversation);
  const location = useUserContextStore((s) => s.location);
  const { detectByIP } = useGeoLocation();

  useEffect(() => {
    if (!location) {
      detectByIP();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (conversations.length === 0 || !activeId) {
      createConv();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Left: conversation list */}
      <aside
        className={cn(
          "hidden lg:flex flex-col border-r border-border bg-card w-64 shrink-0 transition-all duration-300",
          !sidebarOpen && "lg:hidden",
        )}
      >
        <ConversationList />
      </aside>

      {/* Center: chat */}
      <section className="flex-1 flex flex-col min-w-0">
        <ChatPanel />
      </section>

      {/* Right: context sidebar */}
      <aside
        className={cn(
          "hidden xl:flex flex-col border-l border-border bg-card w-72 shrink-0 transition-all duration-300",
          !contextOpen && "xl:hidden",
        )}
      >
        <ContextSidebar />
      </aside>
    </div>
  );
}
