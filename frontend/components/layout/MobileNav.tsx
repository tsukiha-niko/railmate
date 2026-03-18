"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquare, Search, Settings } from "lucide-react";
import { cn } from "@/utils/cn";
import { useI18n } from "@/lib/i18n/i18n";

const TABS = [
  { href: "/", labelKey: "nav.ai", icon: MessageSquare },
  { href: "/search", labelKey: "nav.search", icon: Search },
  { href: "/settings", labelKey: "nav.settings", icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();
  const { t } = useI18n();

  return (
    <nav className="z-40 flex shrink-0 md:hidden items-center justify-around border-t border-border bg-card/95 px-2 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] backdrop-blur-md">
      {TABS.map((tab) => {
        const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex min-w-0 flex-1 flex-col items-center gap-0.5 px-3 py-1 text-xs transition-colors",
              active ? "text-primary" : "text-muted-foreground",
            )}
          >
            <tab.icon className="h-5 w-5" />
            <span>{t(tab.labelKey)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
