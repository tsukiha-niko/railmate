"use client";

import Chip from "@mui/material/Chip";

type StatusVariant = "success" | "warning" | "error" | "info" | "default";

interface StatusChipProps {
  label: string;
  status?: StatusVariant;
  size?: "small" | "medium";
}

const colorMap: Record<StatusVariant, { bg: string; fg: string }> = {
  success: { bg: "rgba(16,185,129,0.12)", fg: "#10B981" },
  warning: { bg: "rgba(245,158,11,0.12)", fg: "#F59E0B" },
  error: { bg: "rgba(239,68,68,0.12)", fg: "#EF4444" },
  info: { bg: "rgba(59,130,246,0.12)", fg: "#3B82F6" },
  default: { bg: "rgba(100,116,139,0.10)", fg: "#64748B" },
};

export function StatusChip({ label, status = "default", size = "small" }: StatusChipProps) {
  const { bg, fg } = colorMap[status];
  return (
    <Chip
      label={label}
      size={size}
      sx={{ bgcolor: bg, color: fg, fontWeight: 600, borderRadius: 2 }}
    />
  );
}
