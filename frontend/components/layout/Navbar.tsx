"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import { Menu, Train, MapPin } from "lucide-react";
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
        bgcolor: (th) => `${th.palette.background.paper}C8`,
        backdropFilter: "blur(20px) saturate(1.3)",
        boxShadow:
          "0 1px 0 0 var(--border), 0 4px 12px -4px rgba(0,0,0,0.05)",
        zIndex: 40,
      }}
    >
      <Toolbar
        sx={{
          minHeight: { xs: 56, lg: 60 },
          gap: { xs: 1, sm: 1.5 },
          px: { xs: 1.5, sm: 2, lg: 3 },
        }}
      >
        {/* Left: menu button + logo */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <IconButton
            onClick={() => setMobileSidebarOpen(true)}
            aria-label={
              pathname === "/"
                ? t("chat.sidebar.open")
                : `${t("nav.ai")} · ${t("chat.sidebar.open")}`
            }
            size="small"
            sx={{
              color: "text.secondary",
              borderRadius: 2,
              "&:hover": { bgcolor: "action.hover" },
            }}
          >
            <Menu size={20} />
          </IconButton>

          <Box
            sx={{
              width: 32,
              height: 32,
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

          <Typography
            variant="body2"
            fontWeight={700}
            sx={{
              display: { xs: "none", sm: "block" },
              color: "text.primary",
              lineHeight: 1,
            }}
          >
            RailMate
          </Typography>
        </Box>

        {/* Center: nav buttons group */}
        <Box sx={{ flex: 1, minWidth: 0, px: { xs: 0.5, sm: 1 } }}>
          {showTopbarNav && (
            <Box
              component="nav"
              sx={{
                display: "inline-flex",
                gap: 0.5,
                alignItems: "center",
                borderRadius: "10px",
                border: 1,
                borderColor: "divider",
                bgcolor: (th) =>
                  th.palette.mode === "dark"
                    ? `${th.palette.background.default}80`
                    : `${th.palette.background.default}B0`,
                px: 0.5,
                py: 0.375,
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
                      borderRadius: "8px",
                      px: 2,
                      py: 0.625,
                      fontWeight: 600,
                      fontSize: "0.8125rem",
                      whiteSpace: "nowrap",
                      minWidth: "fit-content",
                      color: active ? "primary.main" : "text.secondary",
                      bgcolor: active
                        ? (th) => `${th.palette.primary.main}14`
                        : "transparent",
                      boxShadow: active ? "var(--shadow-sm)" : "none",
                      "&:hover": {
                        bgcolor: active
                          ? (th) => `${th.palette.primary.main}1A`
                          : "action.hover",
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

        {/* Right: location chip */}
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
              borderColor: "divider",
              borderRadius: "6px",
              color: "text.secondary",
              "& .MuiChip-icon": { color: "primary.main" },
              "&:hover": {
                borderColor: "primary.main",
                bgcolor: (th) => `${th.palette.primary.main}0A`,
              },
              transition: "all 0.2s ease",
            }}
          />
        )}
      </Toolbar>
    </AppBar>
  );
}
