"use client";

import { useSyncExternalStore } from "react";

/**
 * hydration 首帧与 SSR 一致为 false，挂载后变为 true。
 * 用于避免在首帧使用 Date.now / localStorage / 持久化 store 等与服务器不一致的渲染结果。
 */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}
