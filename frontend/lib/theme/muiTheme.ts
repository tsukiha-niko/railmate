"use client";

import { createTheme, type ThemeOptions } from "@mui/material/styles";

const shared: ThemeOptions = {
  typography: {
    fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif',
  },
  shape: { borderRadius: 14 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { WebkitFontSmoothing: "antialiased", MozOsxFontSmoothing: "grayscale" },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { textTransform: "none", fontWeight: 600, borderRadius: 12 },
        sizeSmall: { fontSize: "0.8125rem", padding: "4px 14px", minHeight: 32, borderRadius: 10 },
        sizeLarge: { borderRadius: 16, fontSize: "0.9375rem" },
      },
    },
    MuiCard: {
      defaultProps: { variant: "outlined" },
      styleOverrides: {
        root: { backgroundImage: "none", borderRadius: 20 },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600, borderRadius: 10 },
        sizeSmall: { fontSize: "0.6875rem", height: 24 },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: { borderRadius: 24 },
      },
    },
    MuiTextField: {
      defaultProps: { size: "small", variant: "outlined" },
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": { borderRadius: 14 },
        },
      },
    },
    MuiAppBar: {
      defaultProps: { elevation: 0, color: "transparent" },
      styleOverrides: {
        root: { backdropFilter: "blur(16px)" },
      },
    },
    MuiBottomNavigation: {
      styleOverrides: {
        root: { backdropFilter: "blur(16px)", height: 64 },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: { backgroundImage: "none" },
      },
    },
    MuiSkeleton: {
      defaultProps: { animation: "wave" },
      styleOverrides: { root: { borderRadius: 10 } },
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 16 },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: { borderRadius: 12 },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: { borderRadius: 12 },
      },
    },
  },
};

export const lightTheme = createTheme({
  ...shared,
  palette: {
    mode: "light",
    background: { default: "#F5F7FB", paper: "#FFFFFF" },
    primary: { main: "#3B82F6", contrastText: "#FFFFFF" },
    secondary: { main: "#6366F1", contrastText: "#FFFFFF" },
    text: { primary: "#0F172A", secondary: "#64748B" },
    divider: "#E2E8F0",
    success: { main: "#10B981" },
    warning: { main: "#F59E0B" },
    error: { main: "#EF4444" },
  },
});

export const darkTheme = createTheme({
  ...shared,
  palette: {
    mode: "dark",
    background: { default: "#060D1D", paper: "#0B152E" },
    primary: { main: "#6EA8FF", contrastText: "#0B1220" },
    secondary: { main: "#818CF8", contrastText: "#0B1220" },
    text: { primary: "#E5E7EB", secondary: "#9CA3AF" },
    divider: "#1E2D4A",
    success: { main: "#34D399" },
    warning: { main: "#FBBF24" },
    error: { main: "#F87171" },
  },
});
