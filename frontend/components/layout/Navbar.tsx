"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Train, MapPin } from "lucide-react";
import { useUIStore } from "@/store/uiStore";
import { useUserContextStore } from "@/store/userContextStore";
import { cn } from "@/utils/cn";
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
    <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-border/75 bg-card/70 px-3 backdrop-blur-xl sm:gap-3 sm:px-4 lg:h-[3.75rem] lg:px-6">
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={() => setMobileSidebarOpen(true)}
          aria-label={pathname === "/" ? t("chat.sidebar.open") : `${t("nav.ai")} · ${t("chat.sidebar.open")}`}
          className="group inline-flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/[0.07] px-2.5 py-1.5 font-semibold text-primary transition-colors hover:bg-primary/[0.12]"
        >
          <Train className="h-4.5 w-4.5 transition-transform duration-200 group-hover:translate-x-0.5" />
          <span className="hidden text-sm sm:inline">RailMate</span>
        </button>
      </div>

      <div className="min-w-0 flex-1 px-1 sm:px-2">
        {showTopbarNav ? (
          <nav className="mr-auto inline-flex max-w-full min-w-0 items-center justify-start gap-1 overflow-x-auto rounded-[1.2rem] border border-border/75 bg-card/72 px-1.5 py-1.5 shadow-[0_18px_36px_-28px_rgba(15,23,42,0.72)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {NAV_ITEMS.map((item) => {
              const active = isNavItemActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex shrink-0 min-w-fit items-center gap-2 whitespace-nowrap rounded-[0.95rem] px-3.5 py-2 text-sm font-medium transition-all",
                    active
                      ? "bg-primary/14 text-primary shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--primary)_32%,transparent)]"
                      : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground",
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {t(item.labelKey)}
                </Link>
              );
            })}
          </nav>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {location && (
          <Link
            href="/settings"
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-card/60 text-xs text-muted-foreground transition-colors hover:border-primary/25 hover:text-foreground",
              showTopbarNav ? "max-w-[18vw] px-2.5 py-1.5" : "max-w-[58vw] px-2.5 py-1 sm:max-w-none",
            )}
          >
            <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
            <span className="truncate">{location.city}</span>
            {!showTopbarNav && location.station ? <span className="truncate text-muted-foreground/70">· {location.station}</span> : null}
          </Link>
        )}
      </div>
    </header>
  );
}
