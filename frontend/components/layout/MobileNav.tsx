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
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex md:hidden items-center justify-around border-t border-border bg-card/95 backdrop-blur-md h-14 pb-safe">
      {TABS.map((tab) => {
        const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex flex-col items-center gap-0.5 px-3 py-1.5 text-xs transition-colors",
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
