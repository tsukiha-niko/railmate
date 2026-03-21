"use client";

import { useEffect, useRef, useCallback } from "react";
import { useReminderStore } from "@/store/reminderStore";

function requestPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission === "default") {
    Notification.requestPermission();
  }
}

function sendNotification(title: string, body: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission === "granted") {
    new Notification(title, { body, icon: "/favicon.ico" });
  }
}

export function useNotification() {
  const reminders = useReminderStore((s) => s.reminders);
  const markNotified = useReminderStore((s) => s.markNotified);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    requestPermission();
  }, []);

  const checkReminders = useCallback(() => {
    const now = new Date();
    for (const rem of reminders) {
      if (!rem.enabled || rem.notified) continue;
      const [h, m] = rem.departureTime.split(":").map(Number);
      const dep = new Date(`${rem.runDate}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`);
      const diff = (dep.getTime() - now.getTime()) / 60000;
      if (diff <= rem.minutesBefore && diff > -5) {
        sendNotification(
          `🚄 ${rem.trainNo} 出行提醒`,
          `${rem.fromStation} → ${rem.toStation}，发车时间 ${rem.departureTime}，请做好出行准备！`,
        );
        markNotified(rem.id);
      }
    }
  }, [reminders, markNotified]);

  useEffect(() => {
    intervalRef.current = setInterval(checkReminders, 30_000);
    return () => clearInterval(intervalRef.current);
  }, [checkReminders]);

  return { requestPermission };
}
