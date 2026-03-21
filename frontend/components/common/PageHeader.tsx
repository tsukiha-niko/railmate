"use client";

import { type ReactNode } from "react";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  badges?: string[];
  action?: ReactNode;
  children?: ReactNode;
}

export function PageHeader({ title, subtitle, badges, action, children }: PageHeaderProps) {
  return (
    <Card
      variant="outlined"
      sx={{
        borderColor: "divider",
        background: (t) =>
          `linear-gradient(135deg, ${t.palette.primary.main}14 0%, ${t.palette.background.paper}E8 50%, ${t.palette.background.paper}C0 100%)`,
      }}
    >
      <CardContent sx={{ p: { xs: 2, sm: 2.5 }, "&:last-child": { pb: { xs: 2, sm: 2.5 } } }}>
        <Box sx={{ display: "flex", flexDirection: { xs: "column", lg: "row" }, gap: 2, justifyContent: "space-between", alignItems: { lg: "flex-start" } }}>
          <Box>
            <Typography variant="h5" fontWeight={800}>{title}</Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {subtitle}
              </Typography>
            )}
            {badges && badges.length > 0 && (
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mt: 1.5 }}>
                {badges.map((b) => (
                  <Chip key={b} label={b} size="small" variant="outlined" />
                ))}
              </Box>
            )}
          </Box>
          {action}
        </Box>
        {children}
      </CardContent>
    </Card>
  );
}
