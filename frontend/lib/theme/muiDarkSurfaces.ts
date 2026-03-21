import type { Theme } from "@mui/material/styles";
import { alpha } from "@mui/material/styles";

/** 仅增强暗色模式；浅色保持原有圆角与结构，避免改动明亮观感 */
export function gateDialogPaper(theme: Theme) {
  const light = { borderRadius: "20px", overflow: "hidden" as const };
  if (theme.palette.mode !== "dark") return light;
  return {
    ...light,
    borderRadius: "12px",
    bgcolor: theme.palette.background.paper,
    backgroundImage: "none",
    border: `1px solid ${alpha(theme.palette.divider, 0.55)}`,
    boxShadow: "0 24px 48px rgba(0,0,0,0.45)",
  };
}

export function darkElevatedStrip(theme: Theme) {
  if (theme.palette.mode !== "dark") return { bgcolor: "action.hover" };
  return {
    bgcolor: alpha(theme.palette.text.primary, 0.04),
    border: `1px solid ${alpha(theme.palette.divider, 0.4)}`,
  };
}

export function darkDialogHeaderClose(theme: Theme) {
  if (theme.palette.mode !== "dark") return { bgcolor: "action.hover", borderRadius: "10px" };
  return {
    bgcolor: alpha(theme.palette.text.primary, 0.08),
    borderRadius: "10px",
    border: `1px solid ${alpha(theme.palette.divider, 0.35)}`,
  };
}
