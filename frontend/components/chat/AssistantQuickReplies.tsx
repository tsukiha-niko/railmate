"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";

interface Props {
  options: string[];
  onSelect: (text: string) => void;
  disabled?: boolean;
}

/** 窄屏纵向堆叠（最多三行），≥600px 单行等分 */
export function AssistantQuickReplies({ options, onSelect, disabled }: Props) {
  if (options.length === 0) return null;
  return (
    <Box
      sx={{
        mt: 1.25,
        display: "flex",
        flexDirection: { xs: "column", sm: "row" },
        alignItems: "stretch",
        gap: 1,
        width: "100%",
        maxWidth: "100%",
      }}
    >
      {options.map((label) => (
        <Button
          key={label}
          type="button"
          variant="outlined"
          color="primary"
          disabled={disabled}
          onClick={() => onSelect(label)}
          sx={{
            flex: { sm: "1 1 0" },
            minWidth: { sm: 0 },
            borderRadius: "12px",
            py: 1.125,
            px: 1.5,
            fontSize: "0.875rem",
            fontWeight: 600,
            textTransform: "none",
            lineHeight: 1.35,
            whiteSpace: { xs: "normal", sm: "nowrap" },
            overflow: "hidden",
            textOverflow: "ellipsis",
            borderColor: (th) => `${th.palette.primary.main}55`,
            bgcolor: (th) => `${th.palette.primary.main}08`,
            "&:hover": {
              borderColor: "primary.main",
              bgcolor: (th) => `${th.palette.primary.main}12`,
            },
          }}
        >
          {label}
        </Button>
      ))}
    </Box>
  );
}
