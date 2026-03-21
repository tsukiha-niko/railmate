"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  handleHome = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100dvh",
            px: 3,
            py: 6,
            bgcolor: "background.default",
            textAlign: "center",
            gap: 2.5,
          }}
        >
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: "12px",
              bgcolor: "error.main",
              opacity: 0.12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            <AlertTriangle
              size={32}
              style={{ color: "var(--error, #ef4444)", position: "absolute" }}
            />
          </Box>

          <Typography variant="h6" fontWeight={700}>
            页面出了点问题
          </Typography>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ maxWidth: 400 }}
          >
            {this.state.error?.message || "发生了一个未知错误"}
          </Typography>

          <Box sx={{ display: "flex", gap: 1.5, mt: 1 }}>
            <Button
              variant="contained"
              startIcon={<RefreshCw size={16} />}
              onClick={this.handleRetry}
              sx={{ borderRadius: "10px" }}
            >
              重试
            </Button>
            <Button
              variant="outlined"
              startIcon={<Home size={16} />}
              onClick={this.handleHome}
              sx={{ borderRadius: "10px" }}
            >
              回到首页
            </Button>
          </Box>
        </Box>
      );
    }

    return this.props.children;
  }
}
