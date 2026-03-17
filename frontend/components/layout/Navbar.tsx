"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquare, Search, Settings, Train, Menu, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/store/uiStore";
import { useUserContextStore } from "@/store/userContextStore";
import { cn } from "@/utils/cn";
import { useI18n } from "@/lib/i18n/i18n";

const NAV_ITEMS = [
  { href: "/", labelKey: "nav.ai", icon: MessageSquare },
  { href: "/search", labelKey: "nav.search", icon: Search },
  { href: "/settings", labelKey: "nav.settings", icon: Settings },
];

export function Navbar() {
  const pathname = usePathname();
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const location = useUserContextStore((s) => s.location);
  const { t } = useI18n();

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b border-border bg-card/80 backdrop-blur-md px-4 lg:px-6">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={toggleSidebar}>
        <Menu className="h-5 w-5" />
      </Button>

      <Link href="/" className="flex items-center gap-2 font-bold text-primary">
        <Train className="h-5 w-5" />
        <span className="hidden sm:inline">RailMate</span>
      </Link>

      <nav className="hidden md:flex items-center gap-1 ml-6">
        {NAV_ITEMS.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary",
              )}
            >
              <item.icon className="h-4 w-4" />
              {t(item.labelKey)}
            </Link>
          );
        })}
      </nav>

      <div className="ml-auto flex items-center gap-3">
        {location && (
          <Link href="/settings" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <MapPin className="h-3.5 w-3.5 text-primary" />
            <span>{location.city}</span>
            {location.station && <span className="text-muted-foreground/60">· {location.station}</span>}
          </Link>
        )}
      </div>
    </header>
  );
}
