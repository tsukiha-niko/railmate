"use client";

import { type ReactNode } from "react";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";

interface SectionHeaderProps {
  icon?: ReactNode;
  title: string;
}

export function SectionHeader({ icon, title }: SectionHeaderProps) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      {icon && (
        <Box sx={{ color: "primary.main", display: "flex", alignItems: "center", "& svg": { fontSize: 18 } }}>
          {icon}
        </Box>
      )}
      <Typography variant="subtitle2" fontWeight={700}>
        {title}
      </Typography>
    </Box>
  );
}
