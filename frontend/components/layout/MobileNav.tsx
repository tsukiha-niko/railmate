"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/utils/cn";
import { useI18n } from "@/lib/i18n/i18n";
import { NAV_ITEMS, isNavItemActive } from "./nav-config";
import { useResponsiveNavMode } from "@/hooks/useResponsiveNavMode";

export function MobileNav() {
  const pathname = usePathname();
  const { t } = useI18n();
  const { showBottomNav } = useResponsiveNavMode();

  if (!showBottomNav) return null;

  return (
    <nav className="z-40 border-t border-border/65 bg-card/86 px-3 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.55rem)] backdrop-blur-xl">
      <div className="grid w-full grid-cols-4 gap-1 rounded-[1.35rem] border border-border/70 bg-background/70 p-1.5 shadow-[0_18px_36px_-28px_rgba(15,23,42,0.68)]">
        {NAV_ITEMS.map((tab) => {
          const active = isNavItemActive(pathname, tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex min-w-0 flex-col items-center justify-center gap-1 rounded-[1rem] px-2 py-2 text-[11px] font-medium transition-all",
                active
                  ? "bg-primary/14 text-primary shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--primary)_32%,transparent)]"
                  : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
              )}
            >
              <tab.icon className={cn("h-[18px] w-[18px] shrink-0", active && "scale-105")} />
              <span className="truncate">{t(tab.labelKey)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
