"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import BottomNavigation from "@mui/material/BottomNavigation";
import BottomNavigationAction from "@mui/material/BottomNavigationAction";
import Paper from "@mui/material/Paper";
import { useI18n } from "@/lib/i18n/i18n";
import { NAV_ITEMS, isNavItemActive } from "./nav-config";
import { useResponsiveNavMode } from "@/hooks/useResponsiveNavMode";

export function MobileNav() {
  const pathname = usePathname();
  const { t } = useI18n();
  const { showBottomNav } = useResponsiveNavMode();

  if (!showBottomNav) return null;

  const activeIndex = NAV_ITEMS.findIndex((item) =>
    isNavItemActive(pathname, item.href),
  );

  return (
    <Paper
      elevation={0}
      sx={{
        position: "sticky",
        bottom: 0,
        zIndex: 40,
        borderRadius: 0,
        bgcolor: (th) => `${th.palette.background.paper}D8`,
        backdropFilter: "blur(20px) saturate(1.3)",
        boxShadow:
          "0 -1px 0 0 var(--border), 0 -4px 12px -4px rgba(0,0,0,0.05)",
        pb: "env(safe-area-inset-bottom)",
      }}
    >
      <BottomNavigation
        value={activeIndex}
        showLabels
        sx={{
          bgcolor: "transparent",
          height: 64,
          "& .MuiBottomNavigationAction-root": {
            minWidth: 0,
            color: "text.secondary",
            transition: "color 0.2s ease",
            position: "relative",
            "&.Mui-selected": {
              color: "primary.main",
              "&::after": {
                content: '""',
                position: "absolute",
                bottom: 6,
                left: "50%",
                transform: "translateX(-50%)",
                width: 3,
                height: 3,
                borderRadius: "50%",
                bgcolor: "primary.main",
              },
            },
            "& .MuiBottomNavigationAction-label": {
              fontSize: "0.6875rem",
              "&.Mui-selected": { fontSize: "0.6875rem" },
            },
          },
        }}
      >
        {NAV_ITEMS.map((item) => (
          <BottomNavigationAction
            key={item.href}
            component={Link}
            href={item.href}
            label={t(item.labelKey)}
            icon={<item.icon size={20} />}
          />
        ))}
      </BottomNavigation>
    </Paper>
  );
}
