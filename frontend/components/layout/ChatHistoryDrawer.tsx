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
          width: "min(18rem, calc(100vw - 3rem))",
          top: 0,
          height: "100%",
          borderRight: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
          borderTopRightRadius: 0,
          borderBottomRightRadius: 0,
        },
        "& .MuiBackdrop-root": { bgcolor: "rgba(0,0,0,0.4)" },
      }}
    >
      {/* Header with gradient */}
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
            `linear-gradient(135deg, ${th.palette.primary.main}12 5%, ${th.palette.background.paper} 100%)`,
        }}
      >
        <Box
          sx={{
            width: 34,
            height: 34,
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: (th) =>
              `linear-gradient(135deg, ${th.palette.primary.main}, ${th.palette.secondary.main})`,
            color: "#fff",
            flexShrink: 0,
          }}
        >
          <Train size={16} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" fontWeight={700}>
            RailMate
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t("chat.sidebar.subtitle")}
          </Typography>
        </Box>
        <IconButton
          onClick={() => setMobileSidebarOpen(false)}
          aria-label={t("chat.sidebar.close")}
          size="small"
          sx={{ borderRadius: 2 }}
        >
          <PanelLeftClose size={18} />
        </IconButton>
      </Box>

      <ConversationList onAction={() => setMobileSidebarOpen(false)} />
    </MuiDrawer>
  );
}
