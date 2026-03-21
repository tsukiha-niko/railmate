"use client";

import type { LucideIcon } from "lucide-react";
import { MessageSquare, Search, Settings, Ticket } from "lucide-react";

export type NavItem = {
  href: string;
  labelKey: string;
  icon: LucideIcon;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/", labelKey: "nav.ai", icon: MessageSquare },
  { href: "/search", labelKey: "nav.search", icon: Search },
  { href: "/trips", labelKey: "nav.trips", icon: Ticket },
  { href: "/settings", labelKey: "nav.settings", icon: Settings },
];

export function isNavItemActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
