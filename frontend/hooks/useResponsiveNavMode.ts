"use client";

import { useSyncExternalStore } from "react";

export type ResponsiveNavMode = {
  showTopbarNav: boolean;
  showBottomNav: boolean;
  aspectRatio: number;
};

const FALLBACK_MODE: ResponsiveNavMode = {
  showTopbarNav: false,
  showBottomNav: true,
  aspectRatio: 0,
};

let cachedSnapshot: ResponsiveNavMode = FALLBACK_MODE;

function readAspectRatio() {
  if (typeof window === "undefined") return 0;
  const width = window.innerWidth || 0;
  const height = window.innerHeight || 1;
  return width / Math.max(height, 1);
}

function getResponsiveNavModeSnapshot(): ResponsiveNavMode {
  if (typeof window === "undefined") return FALLBACK_MODE;

  const aspectRatio = readAspectRatio();
  const showTopbarNav = aspectRatio > 4 / 3;
  const showBottomNav = !showTopbarNav;

  if (
    cachedSnapshot.showTopbarNav === showTopbarNav &&
    cachedSnapshot.showBottomNav === showBottomNav &&
    cachedSnapshot.aspectRatio === aspectRatio
  ) {
    return cachedSnapshot;
  }

  cachedSnapshot = {
    showTopbarNav,
    showBottomNav,
    aspectRatio,
  };

  return cachedSnapshot;
}

function subscribeResponsiveNavMode(callback: () => void) {
  if (typeof window === "undefined") return () => {};

  const handleChange = () => callback();

  window.addEventListener("resize", handleChange);
  window.addEventListener("orientationchange", handleChange);
  callback();

  return () => {
    window.removeEventListener("resize", handleChange);
    window.removeEventListener("orientationchange", handleChange);
  };
}

export function useResponsiveNavMode() {
  return useSyncExternalStore(
    subscribeResponsiveNavMode,
    getResponsiveNavModeSnapshot,
    () => FALLBACK_MODE,
  );
}
