import { create } from "zustand";

interface UIState {
  sidebarOpen: boolean;
  mobileSidebarOpen: boolean;
  contextPanelOpen: boolean;
  mobileTab: "chat" | "search" | "settings";

  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleMobileSidebar: () => void;
  setMobileSidebarOpen: (open: boolean) => void;
  toggleContextPanel: () => void;
  setContextPanelOpen: (open: boolean) => void;
  setMobileTab: (tab: "chat" | "search" | "settings") => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  mobileSidebarOpen: false,
  contextPanelOpen: true,
  mobileTab: "chat",

  toggleSidebar() {
    set((s) => ({ sidebarOpen: !s.sidebarOpen }));
  },
  setSidebarOpen(open) {
    set({ sidebarOpen: open });
  },
  toggleMobileSidebar() {
    set((s) => ({ mobileSidebarOpen: !s.mobileSidebarOpen }));
  },
  setMobileSidebarOpen(open) {
    set({ mobileSidebarOpen: open });
  },
  toggleContextPanel() {
    set((s) => ({ contextPanelOpen: !s.contextPanelOpen }));
  },
  setContextPanelOpen(open) {
    set({ contextPanelOpen: open });
  },
  setMobileTab(tab) {
    set({ mobileTab: tab });
  },
}));
