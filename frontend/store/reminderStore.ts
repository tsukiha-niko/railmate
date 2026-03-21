import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface TravelReminder {
  id: string;
  orderId: number;
  trainNo: string;
  fromStation: string;
  toStation: string;
  departureTime: string;
  runDate: string;
  minutesBefore: number;
  enabled: boolean;
  notified: boolean;
}

interface ReminderState {
  reminders: TravelReminder[];
  addReminder: (r: Omit<TravelReminder, "id" | "notified">) => void;
  removeReminder: (id: string) => void;
  toggleReminder: (id: string) => void;
  markNotified: (id: string) => void;
  getReminderByOrder: (orderId: number) => TravelReminder | undefined;
}

export const useReminderStore = create<ReminderState>()(
  persist(
    (set, get) => ({
      reminders: [],

      addReminder: (r) =>
        set((s) => ({
          reminders: [
            ...s.reminders.filter((x) => x.orderId !== r.orderId),
            { ...r, id: `rem_${r.orderId}_${Date.now()}`, notified: false },
          ],
        })),

      removeReminder: (id) =>
        set((s) => ({ reminders: s.reminders.filter((x) => x.id !== id) })),

      toggleReminder: (id) =>
        set((s) => ({
          reminders: s.reminders.map((x) =>
            x.id === id ? { ...x, enabled: !x.enabled } : x,
          ),
        })),

      markNotified: (id) =>
        set((s) => ({
          reminders: s.reminders.map((x) =>
            x.id === id ? { ...x, notified: true } : x,
          ),
        })),

      getReminderByOrder: (orderId) =>
        get().reminders.find((x) => x.orderId === orderId),
    }),
    {
      name: "railmate-reminders",
      storage: createJSONStorage(() =>
        typeof window !== "undefined"
          ? localStorage
          : { getItem: () => null, setItem: () => {}, removeItem: () => {} },
      ),
    },
  ),
);
