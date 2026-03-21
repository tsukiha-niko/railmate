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

  const activeIndex = NAV_ITEMS.findIndex((item) => isNavItemActive(pathname, item.href));

  return (
    <Paper
      elevation={0}
      sx={{
        position: "sticky",
        bottom: 0,
        zIndex: 40,
        borderTop: 1,
        borderColor: "divider",
        bgcolor: (th) => `${th.palette.background.paper}D8`,
        backdropFilter: "blur(20px) saturate(1.3)",
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
            "&.Mui-selected": { color: "primary.main" },
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
