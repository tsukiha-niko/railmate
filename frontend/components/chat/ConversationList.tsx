"use client";

import { MessageSquare, Plus, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useChatStore } from "@/store/chatStore";
import { cn } from "@/utils/cn";
import { useI18n } from "@/lib/i18n/i18n";

interface Props {
  onAction?: () => void;
}

export function ConversationList({ onAction }: Props) {
  const conversations = useChatStore((s) => s.conversations);
  const activeId = useChatStore((s) => s.activeConversationId);
  const setActive = useChatStore((s) => s.setActiveConversation);
  const create = useChatStore((s) => s.createConversation);
  const remove = useChatStore((s) => s.deleteConversation);
  const { t } = useI18n();

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border">
        <Button
          onClick={() => {
            create();
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
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        <AnimatePresence initial={false}>
          {conversations.map((conv) => (
            <motion.div key={conv.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.2 }}>
              <div
                role="button" tabIndex={0}
                onClick={() => {
                  setActive(conv.id);
                  onAction?.();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setActive(conv.id);
                    onAction?.();
                  }
                }}
                className={cn(
                  "group w-full flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm transition-colors text-left",
                  activeId === conv.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                <MessageSquare className="h-4 w-4 shrink-0" />
                <span className="truncate flex-1">{conv.title}</span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); remove(conv.id); }}
                  aria-label={t("chat.deleteConversation")}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:text-destructive"
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
