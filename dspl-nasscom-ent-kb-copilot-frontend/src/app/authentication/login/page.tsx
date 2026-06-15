"use client";
import Link from "next/link";
import { Grid, Box, Card, Stack, Typography } from "@mui/material";
// components
import PageContainer from "@/app/(DashboardLayout)/components/container/PageContainer";
import Logo from "@/app/(DashboardLayout)/layout/shared/logo/Logo";
import AuthLogin from "../auth/AuthLogin";
import { alpha } from "@mui/material";
import Image from "next/image";
import theme from "@/utils/theme";

const Login2 = () => {
  return (
    <PageContainer title="Login" description="this is Login page">
      <Box
        sx={{
          position: "relative",
          background: `radial-gradient(circle at 0% 0%, ${alpha(theme.palette.primary.light, 0.4)} 0%, transparent 50%),
                       radial-gradient(circle at 100% 100%, ${alpha(theme.palette.primary.light, 0.4)} 0%, transparent 50%),
                       #F4F6FB`,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Box
          sx={{
            width: "100%",
            maxWidth: "480px",
            position: "relative",
            zIndex: 1,
          }}
        >
          <Card
            elevation={0}
            sx={{
              p: { xs: 4, sm: 6 },
              width: "100%",
              borderRadius: "24px",
              boxShadow: "0 12px 40px rgba(13,78,210,0.12)",
              border: "1px solid rgba(255,255,255,0.7)",
              backgroundColor: "rgba(255,255,255,0.9)",
              backdropFilter: "blur(10px)",
            }}
          >
            <Box sx={{ mb: 4, textAlign: "center" }}>
              <Box
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  mb: 2,
                }}
              >
                <Image
                  src="/images/logos/devangles-logo.png"
                  alt="logo"
                  height={50}
                  width={50}
                  priority
                />
              </Box>
              <Typography
                variant="h3"
                sx={{
                  fontWeight: 800,
                  color: theme.palette.text.primary,
                  mb: 1,
                }}
              >
                Welcome to Enterprise Knowledge Assistant
              </Typography>
              <Typography variant="body1" color="textSecondary">
                Access your enterprise knowledge assistant
              </Typography>
            </Box>
            <AuthLogin />
          </Card>
        </Box>
      </Box>
    </PageContainer>
  );
};
export default Login2;
