"use client";

import { type ReactNode } from "react";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { Navbar } from "./Navbar";
import { MobileNav } from "./MobileNav";
import { ThemeProvider } from "@/lib/theme/theme";
import { I18nProvider } from "@/lib/i18n/i18n";
import { messages } from "@/lib/i18n/messages";

export function ClientShell({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <ThemeProvider>
        <I18nProvider messages={messages}>
          <div className="flex flex-col h-dvh overflow-hidden">
            <Navbar />
            <main className="flex-1 flex flex-col min-h-0">{children}</main>
            <MobileNav />
          </div>
        </I18nProvider>
      </ThemeProvider>
    </QueryProvider>
  );
}
