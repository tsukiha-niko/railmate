"use client";

import { MessageSquare, Plus, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useChatStore } from "@/store/chatStore";
import { cn } from "@/utils/cn";
import { useI18n } from "@/lib/i18n/i18n";

interface Props {
  onAction?: () => void;
}

export function ConversationList({ onAction }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const conversations = useChatStore((s) => s.conversations);
  const activeId = useChatStore((s) => s.activeConversationId);
  const setActive = useChatStore((s) => s.setActiveConversation);
  const create = useChatStore((s) => s.createConversation);
  const remove = useChatStore((s) => s.deleteConversation);
  const { t } = useI18n();

  const navigateToAssistantIfNeeded = () => {
    if (pathname !== "/") {
      router.push("/");
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border/70 px-3 py-3.5">
        <div className="mb-2.5 flex items-center justify-between px-1">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground/90">{t("chat.sidebar.subtitle")}</p>
          <span className="rounded-full border border-border/80 px-2 py-0.5 text-[10px] text-muted-foreground">{conversations.length}</span>
        </div>
        <Button
          onClick={() => {
            create();
            navigateToAssistantIfNeeded();
            onAction?.();
          }}
          className="w-full justify-start gap-2"
          variant="outline"
          size="sm"
        >
          <Plus className="h-4 w-4" />
          {t("chat.newConversation")}
        </Button>
      </div>
      <div className="flex-1 space-y-1 overflow-y-auto p-2.5">
        <AnimatePresence initial={false}>
          {conversations.map((conv) => (
            <motion.div key={conv.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.2 }}>
              <div
                role="button" tabIndex={0}
                onClick={() => {
                  setActive(conv.id);
                  navigateToAssistantIfNeeded();
                  onAction?.();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setActive(conv.id);
                    navigateToAssistantIfNeeded();
                    onAction?.();
                  }
                }}
                className={cn(
                  "group flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition-all",
                  activeId === conv.id
                    ? "bg-primary/12 text-primary shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--primary)_30%,transparent)]"
                    : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground",
                )}
              >
                <MessageSquare className="h-4 w-4 shrink-0" />
                <span className="truncate flex-1">{conv.title}</span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); remove(conv.id); }}
                  aria-label={t("chat.deleteConversation")}
                  className="rounded-md p-1 text-muted-foreground/60 opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {conversations.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground text-sm">
            <MessageSquare className="h-8 w-8 mb-2 opacity-40" />
            <p>{t("chat.emptyConversations")}</p>
            <p className="text-xs mt-1">{t("chat.emptyHint")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
