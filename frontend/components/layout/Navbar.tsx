"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import { Train, MapPin } from "lucide-react";
import { useUIStore } from "@/store/uiStore";
import { useUserContextStore } from "@/store/userContextStore";
import { useI18n } from "@/lib/i18n/i18n";
import { NAV_ITEMS, isNavItemActive } from "./nav-config";
import { useResponsiveNavMode } from "@/hooks/useResponsiveNavMode";

export function Navbar() {
  const pathname = usePathname();
  const setMobileSidebarOpen = useUIStore((s) => s.setMobileSidebarOpen);
  const location = useUserContextStore((s) => s.location);
  const { t } = useI18n();
  const { showTopbarNav } = useResponsiveNavMode();

  return (
    <AppBar
      position="sticky"
      sx={{
        borderBottom: 1,
        borderColor: "divider",
        bgcolor: (th) => `${th.palette.background.paper}C8`,
        backdropFilter: "blur(20px) saturate(1.3)",
        zIndex: 40,
      }}
    >
      <Toolbar sx={{ minHeight: { xs: 56, lg: 60 }, gap: { xs: 1, sm: 1.5 }, px: { xs: 1.5, sm: 2, lg: 3 } }}>
        <Button
          onClick={() => setMobileSidebarOpen(true)}
          aria-label={pathname === "/" ? t("chat.sidebar.open") : `${t("nav.ai")} · ${t("chat.sidebar.open")}`}
          startIcon={<Train size={17} />}
          size="small"
          variant="outlined"
          sx={{
            borderColor: (th) => `${th.palette.primary.main}40`,
            borderRadius: 3,
            fontWeight: 700,
            px: 1.5,
            color: "primary.main",
            bgcolor: (th) => `${th.palette.primary.main}0A`,
            "&:hover": {
              bgcolor: (th) => `${th.palette.primary.main}18`,
              borderColor: "primary.main",
            },
            transition: "all 0.2s ease",
          }}
        >
          <Box component="span" sx={{ display: { xs: "none", sm: "inline" }, fontSize: "0.875rem" }}>
            RailMate
          </Box>
        </Button>

        <Box sx={{ flex: 1, minWidth: 0, px: { xs: 0.5, sm: 1 } }}>
          {showTopbarNav && (
            <Box
              component="nav"
              sx={{
                display: "inline-flex",
                gap: 0.5,
                alignItems: "center",
                borderRadius: 4,
                border: 1,
                borderColor: (th) => `${th.palette.divider}80`,
                bgcolor: (th) => `${th.palette.background.paper}90`,
                px: 0.75,
                py: 0.5,
                boxShadow: "var(--shadow-sm)",
                overflowX: "auto",
                "&::-webkit-scrollbar": { display: "none" },
                scrollbarWidth: "none",
              }}
            >
              {NAV_ITEMS.map((item) => {
                const active = isNavItemActive(pathname, item.href);
                return (
                  <Button
                    key={item.href}
                    component={Link}
                    href={item.href}
                    startIcon={<item.icon size={15} />}
                    size="small"
                    sx={{
                      borderRadius: 3,
                      px: 2,
                      py: 0.75,
                      fontWeight: 600,
                      fontSize: "0.8125rem",
                      whiteSpace: "nowrap",
                      minWidth: "fit-content",
                      color: active ? "primary.main" : "text.secondary",
                      bgcolor: active ? (th) => `${th.palette.primary.main}14` : "transparent",
                      "&:hover": {
                        bgcolor: active ? (th) => `${th.palette.primary.main}1A` : "action.hover",
                      },
                      transition: "all 0.2s ease",
                    }}
                  >
                    {t(item.labelKey)}
                  </Button>
                );
              })}
            </Box>
          )}
        </Box>

        {location && (
          <Chip
            component={Link}
            href="/settings"
            icon={<MapPin size={13} />}
            label={location.city}
            variant="outlined"
            size="small"
            clickable
            sx={{
              maxWidth: showTopbarNav ? "18vw" : "58vw",
              borderColor: (th) => `${th.palette.divider}80`,
              borderRadius: 3,
              color: "text.secondary",
              "& .MuiChip-icon": { color: "primary.main" },
              "&:hover": { borderColor: "primary.main", bgcolor: (th) => `${th.palette.primary.main}0A` },
              transition: "all 0.2s ease",
            }}
          />
        )}
      </Toolbar>
    </AppBar>
  );
}
