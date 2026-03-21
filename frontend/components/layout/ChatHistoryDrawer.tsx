"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import MuiDrawer from "@mui/material/Drawer";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import { PanelLeftClose } from "lucide-react";
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
    <MuiDrawer
      anchor="left"
      open={mobileSidebarOpen}
      onClose={() => setMobileSidebarOpen(false)}
      sx={{
        zIndex: 50,
        "& .MuiDrawer-paper": {
          width: "min(22rem, calc(100vw - 2.5rem))",
          top: { xs: 56, lg: 60 },
          height: { xs: "calc(100% - 56px)", lg: "calc(100% - 60px)" },
          bgcolor: (th) => `${th.palette.background.paper}F2`,
          backdropFilter: "blur(16px)",
        },
        "& .MuiBackdrop-root": { bgcolor: "rgba(0,0,0,0.45)" },
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: 1, borderColor: "divider", px: 2, py: 1.5 }}>
        <Box>
          <Typography variant="body2" fontWeight={700}>RailMate</Typography>
          <Typography variant="caption" color="text.secondary">{t("chat.sidebar.subtitle")}</Typography>
        </Box>
        <IconButton
          onClick={() => setMobileSidebarOpen(false)}
          aria-label={t("chat.sidebar.close")}
          size="small"
        >
          <PanelLeftClose size={18} />
        </IconButton>
      </Box>
      <ConversationList onAction={() => setMobileSidebarOpen(false)} />
    </MuiDrawer>
  );
}
