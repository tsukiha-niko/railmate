"use client";

import { useNotification } from "@/hooks/useNotification";

export function NotificationWatcher() {
  useNotification();
  return null;
}
