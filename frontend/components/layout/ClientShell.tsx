"use client";

import { type ReactNode } from "react";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { Navbar } from "./Navbar";
import { MobileNav } from "./MobileNav";
import { ChatHistoryDrawer } from "./ChatHistoryDrawer";
import { ThemeProvider } from "@/lib/theme/theme";
import { I18nProvider } from "@/lib/i18n/i18n";
import { messages } from "@/lib/i18n/messages";

export function ClientShell({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <ThemeProvider>
        <I18nProvider messages={messages}>
          <div className="relative flex h-dvh flex-col overflow-hidden bg-transparent">
            <Navbar />
            <ChatHistoryDrawer />
            <main className="relative z-10 flex min-h-0 flex-1 flex-col">{children}</main>
            <MobileNav />
          </div>
        </I18nProvider>
      </ThemeProvider>
    </QueryProvider>
  );
}
