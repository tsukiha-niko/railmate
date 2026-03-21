"use client";

import { type ReactNode } from "react";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <Card variant="outlined" sx={{ borderStyle: "dashed" }}>
      <CardContent sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, py: 6, px: 4, textAlign: "center", minHeight: 320 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", width: 64, height: 64, borderRadius: 4, bgcolor: "primary.main", color: "primary.contrastText", opacity: 0.15, "& svg": { fontSize: 28, opacity: 1 } }}>
          <Box sx={{ opacity: 1, color: "primary.main" }}>{icon}</Box>
        </Box>
        <Box>
          <Typography variant="subtitle1" fontWeight={700}>{title}</Typography>
          {description && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, maxWidth: 400, mx: "auto" }}>
              {description}
            </Typography>
          )}
        </Box>
        {action}
      </CardContent>
    </Card>
  );
}
