"use client";

import { createTheme, type ThemeOptions } from "@mui/material/styles";

const shared: ThemeOptions = {
  typography: {
    fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif',
  },
  shape: { borderRadius: 12 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { WebkitFontSmoothing: "antialiased", MozOsxFontSmoothing: "grayscale" },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { textTransform: "none", fontWeight: 600, borderRadius: 10 },
        sizeSmall: { fontSize: "0.8125rem", padding: "5px 14px", minHeight: 34, borderRadius: 8 },
        sizeLarge: { borderRadius: 12, fontSize: "0.9375rem", fontWeight: 700 },
        contained: { boxShadow: "var(--shadow-primary)" },
      },
    },
    MuiCard: {
      defaultProps: { variant: "outlined" },
      styleOverrides: {
        root: {
          backgroundImage: "none",
          borderRadius: 16,
          boxShadow: "var(--shadow-card)",
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600, borderRadius: 8 },
        sizeSmall: { fontSize: "0.6875rem", height: 24, borderRadius: 6 },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: { borderRadius: 20, boxShadow: "var(--shadow-elevated)" },
      },
    },
    MuiTextField: {
      defaultProps: { size: "small", variant: "outlined" },
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            borderRadius: 10,
          },
        },
      },
    },
    MuiAppBar: {
      defaultProps: { elevation: 0, color: "transparent" },
      styleOverrides: {
        root: { backdropFilter: "blur(16px) saturate(1.2)" },
      },
    },
    MuiBottomNavigation: {
      styleOverrides: {
        root: { backdropFilter: "blur(16px) saturate(1.2)", height: 64 },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: { backgroundImage: "none" },
      },
    },
    MuiSkeleton: {
      defaultProps: { animation: "wave" },
      styleOverrides: { root: { borderRadius: 8 } },
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 12 },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: { borderRadius: 10 },
      },
    },
  },
};

export const lightTheme = createTheme({
  ...shared,
  palette: {
    mode: "light",
    background: { default: "#F4F6FA", paper: "#FFFFFF" },
    primary: { main: "#2563EB", contrastText: "#FFFFFF" },
    secondary: { main: "#7C3AED", contrastText: "#FFFFFF" },
    text: { primary: "#0F172A", secondary: "#64748B" },
    divider: "#E2E8F0",
    success: { main: "#059669" },
    warning: { main: "#D97706" },
    error: { main: "#DC2626" },
  },
});

export const darkTheme = createTheme({
  ...shared,
  palette: {
    mode: "dark",
    background: { default: "#0A0F1C", paper: "#111827" },
    primary: { main: "#60A5FA", contrastText: "#0A0F1C" },
    secondary: { main: "#A78BFA", contrastText: "#0A0F1C" },
    text: { primary: "#E2E8F0", secondary: "#94A3B8" },
    divider: "#1E293B",
    success: { main: "#34D399" },
    warning: { main: "#FBBF24" },
    error: { main: "#F87171" },
  },
});
