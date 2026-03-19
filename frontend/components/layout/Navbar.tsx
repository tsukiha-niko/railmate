"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquare, Search, Settings, Train, Menu, MapPin, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/store/uiStore";
import { useUserContextStore } from "@/store/userContextStore";
import { cn } from "@/utils/cn";
import { useI18n } from "@/lib/i18n/i18n";

const NAV_ITEMS = [
  { href: "/", labelKey: "nav.ai", icon: MessageSquare },
  { href: "/search", labelKey: "nav.search", icon: Search },
  { href: "/trips", labelKey: "nav.trips", icon: Ticket },
  { href: "/settings", labelKey: "nav.settings", icon: Settings },
];

export function Navbar() {
  const pathname = usePathname();
  const toggleMobileSidebar = useUIStore((s) => s.toggleMobileSidebar);
  const location = useUserContextStore((s) => s.location);
  const { t } = useI18n();
  const showAssistantMenu = pathname === "/";

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-border/75 bg-card/70 px-3 backdrop-blur-xl sm:gap-3 sm:px-4 lg:h-[3.75rem] lg:px-6">
      {showAssistantMenu ? (
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={toggleMobileSidebar} aria-label={t("chat.sidebar.open")}>
          <Menu className="h-5 w-5" />
        </Button>
      ) : null}

      <Link
        href="/"
        className="group inline-flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/[0.07] px-2.5 py-1.5 font-semibold text-primary transition-colors hover:bg-primary/[0.12]"
      >
        <Train className="h-4.5 w-4.5 transition-transform duration-200 group-hover:translate-x-0.5" />
        <span className="hidden text-sm sm:inline">RailMate</span>
      </Link>

      <nav className="ml-3 hidden items-center gap-1 md:flex lg:ml-5">
        {NAV_ITEMS.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-all",
                active
                  ? "bg-primary/12 text-primary shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--primary)_35%,transparent)]"
                  : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground",
              )}
            >
              <item.icon className="h-4 w-4" />
              {t(item.labelKey)}
            </Link>
          );
        })}
      </nav>

      <div className="ml-auto flex items-center gap-2">
        {location && (
          <Link
            href="/settings"
            className="inline-flex max-w-[58vw] items-center gap-1.5 rounded-full border border-border/80 bg-card/60 px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/25 hover:text-foreground sm:max-w-none"
          >
            <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
            <span>{location.city}</span>
            {location.station && <span className="truncate text-muted-foreground/70">· {location.station}</span>}
          </Link>
        )}
      </div>
    </header>
  );
}
