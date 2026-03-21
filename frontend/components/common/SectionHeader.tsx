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
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 28,
            height: 28,
            borderRadius: 2,
            bgcolor: (th) => `${th.palette.primary.main}12`,
            color: "primary.main",
            "& svg": { width: 16, height: 16 },
          }}
        >
          {icon}
        </Box>
      )}
      <Typography variant="subtitle2" fontWeight={700}>
        {title}
      </Typography>
    </Box>
  );
}
