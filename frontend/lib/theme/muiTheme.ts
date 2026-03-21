"use client";

import { createTheme, type ThemeOptions } from "@mui/material/styles";

const shared: ThemeOptions = {
  typography: {
    fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif',
  },
  shape: { borderRadius: 10 },
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
        sizeSmall: { fontSize: "0.8125rem", padding: "4px 12px", minHeight: 32 },
      },
    },
    MuiCard: {
      defaultProps: { variant: "outlined" },
      styleOverrides: {
        root: { backgroundImage: "none", borderRadius: 16 },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600 },
        sizeSmall: { fontSize: "0.6875rem", height: 22 },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: { borderRadius: 20 },
      },
    },
    MuiTextField: {
      defaultProps: { size: "small", variant: "outlined" },
    },
    MuiAppBar: {
      defaultProps: { elevation: 0, color: "transparent" },
      styleOverrides: {
        root: { backdropFilter: "blur(12px)" },
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
      styleOverrides: { root: { borderRadius: 8 } },
    },
  },
};

export const lightTheme = createTheme({
  ...shared,
  palette: {
    mode: "light",
    background: { default: "#F6F8FC", paper: "#FFFFFF" },
    primary: { main: "#3B82F6", contrastText: "#FFFFFF" },
    secondary: { main: "#6366F1", contrastText: "#FFFFFF" },
    text: { primary: "#0F172A", secondary: "#64748B" },
    divider: "#DEE6F2",
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
    divider: "#203153",
    success: { main: "#34D399" },
    warning: { main: "#FBBF24" },
    error: { main: "#F87171" },
  },
});
