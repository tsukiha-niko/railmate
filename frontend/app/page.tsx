"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { PanelLeftClose } from "lucide-react";
import { ConversationList } from "@/components/chat/ConversationList";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { ContextSidebar } from "@/components/chat/ContextSidebar";
import { useUIStore } from "@/store/uiStore";
import { useChatStore } from "@/store/chatStore";
import { useGeoLocation } from "@/hooks/useGeoLocation";
import { useUserContextStore } from "@/store/userContextStore";
import { setUserLocation } from "@/services/chat";
import { cn } from "@/utils/cn";
import { useI18n } from "@/lib/i18n/i18n";

export default function HomePage() {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const mobileSidebarOpen = useUIStore((s) => s.mobileSidebarOpen);
  const contextOpen = useUIStore((s) => s.contextPanelOpen);
  const setMobileSidebarOpen = useUIStore((s) => s.setMobileSidebarOpen);
  const conversations = useChatStore((s) => s.conversations);
  const activeId = useChatStore((s) => s.activeConversationId);
  const hydrated = useChatStore((s) => s._hydrated);
  const createConv = useChatStore((s) => s.createConversation);
  const location = useUserContextStore((s) => s.location);
  const locationHydrated = useUserContextStore((s) => s._hasHydrated);
  const userId = useChatStore((s) => s.userId);
  const { detectByIP } = useGeoLocation();
  const { t } = useI18n();

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

  useEffect(() => () => setMobileSidebarOpen(false), [setMobileSidebarOpen]);

  return (
    <div className="relative flex min-h-0 flex-1 overflow-hidden bg-transparent">
      <AnimatePresence>
        {mobileSidebarOpen ? (
          <>
            <motion.button
              type="button"
              aria-label={t("chat.sidebar.close")}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-40 bg-black/45 lg:hidden"
              onClick={() => setMobileSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed inset-y-14 left-0 z-50 flex w-[min(22rem,calc(100vw-2.5rem))] flex-col border-r border-border/70 bg-card/95 shadow-2xl backdrop-blur-xl lg:hidden"
            >
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">RailMate</p>
                  <p className="text-xs text-muted-foreground">{t("chat.sidebar.subtitle")}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileSidebarOpen(false)}
                  aria-label={t("chat.sidebar.close")}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  <PanelLeftClose className="h-4.5 w-4.5" />
                </button>
              </div>
              <ConversationList onAction={() => setMobileSidebarOpen(false)} />
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>

      <aside
        className={cn(
          "hidden w-[19.5rem] shrink-0 border-r border-border/75 bg-card/55 backdrop-blur-lg transition-all duration-300 lg:flex",
          !sidebarOpen && "lg:hidden",
        )}
      >
        <ConversationList />
      </aside>

      <section className="flex min-h-0 min-w-0 flex-1 flex-col px-0 pb-0 lg:px-3 lg:pb-3 xl:px-4">
        <div className="flex min-h-0 flex-1 flex-col border-x border-border/60 bg-gradient-to-b from-card/30 via-card/10 to-card/30 lg:rounded-2xl lg:border">
          <ChatPanel />
        </div>
      </section>

      <aside
        className={cn(
          "hidden w-[19.5rem] shrink-0 border-l border-border/75 bg-card/55 backdrop-blur-lg transition-all duration-300 xl:flex",
          !contextOpen && "xl:hidden",
        )}
      >
        <ContextSidebar />
      </aside>
    </div>
  );
}
