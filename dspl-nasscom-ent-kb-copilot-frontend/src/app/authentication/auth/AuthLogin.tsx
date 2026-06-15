"use client";

import React, { useState } from "react";
import {
  Box,
  Typography,
  FormGroup,
  FormControlLabel,
  Button,
  Stack,
  Checkbox,
  Alert,
  alpha,
  useTheme,
} from "@mui/material";
import Link from "next/link";

import CustomTextField from "@/app/(DashboardLayout)/components/forms/theme-elements/CustomTextField";
import { useAuth } from "../../../../contexts/AuthContext";
import { useRouter } from "next/navigation";

interface loginType {
  title?: string;
  subtitle?: React.ReactNode;
  subtext?: React.ReactNode;
}

const AuthLogin = ({ title, subtitle, subtext }: loginType) => {
  const { googleSignIn, loginError } = useAuth();
  const theme = useTheme();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleGoogleSignIn(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const user = await googleSignIn();
      //console.log("Login Response:", user);       
      router.push("/chat");       
    } catch (err: any) {
      console.error("Google Sign In Error:", err);
      
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {title && <Typography fontWeight="700" variant="h2" mb={1}>{title}</Typography>}
      {subtext}

      {loginError && (
        <Box mb={2}>
          <Alert severity="error">{loginError}</Alert>
        </Box>
      )}    
     

      {/* Google Sign In */}
      <Box mt={2}>
        <Button
          variant="outlined"
          size="large"
          fullWidth
          onClick={handleGoogleSignIn}
          disabled={loading}
          startIcon={<img src="/images/logos/google.svg" alt="Google" width={20} height={20} />}
          sx={{ 
            borderColor: "#E2E8F0",
            color: "text.primary",
            fontWeight: 700,
            fontSize: "0.95rem",
            py: 1.5,
            borderRadius: "12px",
            background: "#fff",
            boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
            textTransform: "none",
            "&:hover": {
              borderColor: "primary.main",
              backgroundColor: alpha(theme.palette.primary.main, 0.02),
              transform: "translateY(-2px)",
              boxShadow: "0 4px 12px rgba(13,78,210,0.12)"
            }
          }}
        >
          {loading ? "Signing in..." : "Continue with Google"}
        </Button>
      </Box>

      {subtitle}
    </>
  );
};

export default AuthLogin;
