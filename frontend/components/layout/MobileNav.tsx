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
    <nav className="z-40 flex shrink-0 items-center justify-around border-t border-border/70 bg-card/88 px-2 pt-1 pb-[calc(env(safe-area-inset-bottom)+0.3rem)] backdrop-blur-xl md:hidden">
      {TABS.map((tab) => {
        const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-2 py-1 text-[10px] transition-all",
              active ? "bg-primary/12 text-primary" : "text-muted-foreground",
            )}
          >
            <tab.icon className={cn("h-[18px] w-[18px]", active && "scale-105")} />
            <span>{t(tab.labelKey)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
