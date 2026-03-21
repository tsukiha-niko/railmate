"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import MuiDrawer from "@mui/material/Drawer";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import { PanelLeftClose, Train } from "lucide-react";
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
        zIndex: 1300,
        "& .MuiDrawer-paper": {
          width: "min(22rem, calc(100vw - 2rem))",
          top: 0,
          height: "100%",
          borderRight: "1px solid",
          borderColor: "divider",
          bgcolor: (th) => `${th.palette.background.paper}F5`,
          backdropFilter: "blur(24px) saturate(1.4)",
          borderTopRightRadius: 24,
          borderBottomRightRadius: 24,
        },
        "& .MuiBackdrop-root": { bgcolor: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" },
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          borderBottom: 1,
          borderColor: "divider",
          px: 2.5,
          py: 2,
          background: (th) =>
            `linear-gradient(135deg, ${th.palette.primary.main}0A 0%, transparent 60%)`,
        }}
      >
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 3,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: (th) => `${th.palette.primary.main}14`,
            color: "primary.main",
          }}
        >
          <Train size={18} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" fontWeight={700}>RailMate</Typography>
          <Typography variant="caption" color="text.secondary">{t("chat.sidebar.subtitle")}</Typography>
        </Box>
        <IconButton
          onClick={() => setMobileSidebarOpen(false)}
          aria-label={t("chat.sidebar.close")}
          size="small"
          sx={{ borderRadius: 3 }}
        >
          <PanelLeftClose size={18} />
        </IconButton>
      </Box>
      <ConversationList onAction={() => setMobileSidebarOpen(false)} />
    </MuiDrawer>
  );
}
