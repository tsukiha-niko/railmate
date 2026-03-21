"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { PanelLeftClose } from "lucide-react";
import { usePathname } from "next/navigation";
import { ConversationList } from "@/components/chat/ConversationList";
import { useUIStore } from "@/store/uiStore";
import { useI18n } from "@/lib/i18n/i18n";

export function ChatHistoryDrawer() {
  const pathname = usePathname();
  const mobileSidebarOpen = useUIStore((s) => s.mobileSidebarOpen);
  const setMobileSidebarOpen = useUIStore((s) => s.setMobileSidebarOpen);
  const { t } = useI18n();

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname, setMobileSidebarOpen]);

  return (
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
            className="fixed inset-0 z-40 bg-black/45"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed top-14 bottom-0 left-0 z-50 flex w-[min(22rem,calc(100vw-2.5rem))] flex-col border-r border-border/70 bg-card/95 shadow-2xl backdrop-blur-xl lg:top-[3.75rem]"
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
  );
}
