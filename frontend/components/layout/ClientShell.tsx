"use client";

import { type ReactNode, useState, useEffect } from "react";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { ErrorBoundary } from "@/components/common/ErrorFallback";
import { Navbar } from "./Navbar";
import { MobileNav } from "./MobileNav";
import { ChatHistoryDrawer } from "./ChatHistoryDrawer";
import { NotificationWatcher } from "./NotificationWatcher";
import { ThemeProvider } from "@/lib/theme/theme";
import { I18nProvider } from "@/lib/i18n/i18n";
import { messages } from "@/lib/i18n/messages";

function ShellSkeleton() {
  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-background" />
  );
}

export function ClientShell({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  return (
    <QueryProvider>
      <ThemeProvider>
        <I18nProvider messages={messages}>
          {!mounted ? (
            <ShellSkeleton />
          ) : (
            <ErrorBoundary>
              <NotificationWatcher />
              <div className="relative flex h-dvh flex-col overflow-hidden bg-background">
                <Navbar />
                <ChatHistoryDrawer />
                <main className="relative z-10 flex min-h-0 flex-1 flex-col">
                  {children}
                </main>
                <MobileNav />
              </div>
            </ErrorBoundary>
          )}
        </I18nProvider>
      </ThemeProvider>
    </QueryProvider>
  );
}
