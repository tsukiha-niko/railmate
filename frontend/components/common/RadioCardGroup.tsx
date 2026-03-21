"use client";

import { type ReactNode } from "react";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";

export interface RadioCardOption<T extends string = string> {
  value: T;
  label: string;
  description?: string;
  icon?: ReactNode;
}

interface RadioCardGroupProps<T extends string = string> {
  options: RadioCardOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function RadioCardGroup<T extends string = string>({
  options,
  value,
  onChange,
}: RadioCardGroupProps<T>) {
  return (
    <Box sx={{ display: "grid", gap: 1 }}>
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <Card
            key={opt.value}
            variant="outlined"
            sx={{
              borderRadius: selected ? "0 14px 14px 0" : "14px",
              borderColor: selected ? "primary.main" : (th) => `${th.palette.divider}80`,
              ...(selected && { borderLeft: 3, borderLeftColor: "primary.main" }),
              bgcolor: selected ? (th) => `${th.palette.primary.main}08` : "transparent",
              boxShadow: "none",
              transition: "all 0.2s ease",
              "&:hover": {
                borderColor: selected ? "primary.main" : "primary.light",
                boxShadow: "var(--shadow-card)",
              },
            }}
          >
            <CardActionArea
              onClick={() => onChange(opt.value)}
              sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 2, py: 1.5, justifyContent: "flex-start" }}
            >
              {selected ? (
                <CheckCircleIcon sx={{ fontSize: 22, color: "primary.main", flexShrink: 0 }} />
              ) : (
                <RadioButtonUncheckedIcon sx={{ fontSize: 22, color: "text.disabled", flexShrink: 0 }} />
              )}
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" fontWeight={600} noWrap>
                  {opt.label}
                </Typography>
                {opt.description && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {opt.description}
                  </Typography>
                )}
              </Box>
            </CardActionArea>
          </Card>
        );
      })}
    </Box>
  );
}
