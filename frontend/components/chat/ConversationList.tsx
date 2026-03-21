"use client";

import { MessageSquare, Plus, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import { useChatStore } from "@/store/chatStore";
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

  const nav = () => { if (pathname !== "/") router.push("/"); };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Box sx={{ borderBottom: 1, borderColor: "divider", px: 1.5, py: 1.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1, px: 0.5 }}>
          <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ letterSpacing: 0.5 }}>{t("chat.sidebar.subtitle")}</Typography>
          <Chip label={conversations.length} size="small" variant="outlined" />
        </Box>
        <Button variant="outlined" size="small" fullWidth startIcon={<Plus size={16} />} onClick={() => { create(); nav(); onAction?.(); }} sx={{ justifyContent: "flex-start" }}>
          {t("chat.newConversation")}
        </Button>
      </Box>

      <List sx={{ flex: 1, overflow: "auto", px: 1, py: 1 }} dense>
        <AnimatePresence initial={false}>
          {conversations.map((conv) => (
            <motion.div key={conv.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.2 }}>
              <ListItemButton
                selected={activeId === conv.id}
                onClick={() => { setActive(conv.id); nav(); onAction?.(); }}
                sx={{ borderRadius: 3, mb: 0.5, pr: 1 }}
              >
                <ListItemIcon sx={{ minWidth: 32 }}><MessageSquare size={16} /></ListItemIcon>
                <ListItemText primary={conv.title} primaryTypographyProps={{ noWrap: true, variant: "body2" }} />
                <IconButton
                  size="small"
                  onClick={(e) => { e.stopPropagation(); remove(conv.id); }}
                  aria-label={t("chat.deleteConversation")}
                  sx={{ opacity: 0, ".MuiListItemButton-root:hover &": { opacity: 1 }, color: "error.main" }}
                >
                  <Trash2 size={14} />
                </IconButton>
              </ListItemButton>
            </motion.div>
          ))}
        </AnimatePresence>
        {conversations.length === 0 && (
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 6, color: "text.secondary" }}>
            <MessageSquare size={32} style={{ opacity: 0.4, marginBottom: 8 }} />
            <Typography variant="body2">{t("chat.emptyConversations")}</Typography>
            <Typography variant="caption" sx={{ mt: 0.5 }}>{t("chat.emptyHint")}</Typography>
          </Box>
        )}
      </List>
    </Box>
  );
}
