"use client";

import React, { useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Slider,
  TextField,
  Button,
  Alert,
  Skeleton,
  Chip,
  Divider,
  Tooltip,
  IconButton,
  Snackbar,
  useTheme,
  alpha,
  Switch,
} from "@mui/material";
import {
  IconRefresh,
  IconDeviceFloppy,
  IconRotate,
  IconInfoCircle,
  IconSettings,
  IconAdjustmentsHorizontal,
} from "@tabler/icons-react";
import { ConfigProvider, useConfigContext, RetrievalConfig } from "../../../../contexts/ConfigContext";

function ConfigPageContent() {
  const theme = useTheme();
  const { config, configSource, loadingConfig, savingConfig, error, updateConfig, resetConfig, fetchConfig } =
    useConfigContext();

  const [draft, setDraft] = useState<RetrievalConfig | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({
    open: false,
    message: "",
    severity: "success",
  });

  const current = draft ?? config;

  const handleChange = (key: keyof RetrievalConfig, value: number | boolean) => {
    setDraft((prev) => ({
      ...(prev ?? config ?? { 
        confidence_threshold: 0, 
        top_n_rerank: 1, 
        top_k_retrieve: 5,
        pii_masking_enabled: false 
      }),
      [key]: value,
    }));
  };

  const handleSave = async () => {
    if (!draft) return;
    try {
      await updateConfig(draft);
      setDraft(null);
      setSnackbar({ open: true, message: "Configuration saved successfully!", severity: "success" });
    } catch {
      setSnackbar({ open: true, message: "Failed to save configuration.", severity: "error" });
    }
  };

  const handleReset = async () => {
    try {
      await resetConfig();
      setDraft(null);
      setSnackbar({ open: true, message: "Configuration reset to defaults.", severity: "success" });
    } catch {
      setSnackbar({ open: true, message: "Failed to reset configuration.", severity: "error" });
    }
  };

  const hasChanges = draft !== null;

  const configFields: Array<{
    key: keyof RetrievalConfig;
    label: string;
    description: string;
    min: number;
    max: number;
    step: number;
    isFloat?: boolean;
  }> = [
    {
      key: "confidence_threshold",
      label: "Confidence Threshold",
      description: "Minimum confidence score required to return a result without escalating to a support ticket.",
      min: 0,
      max: 1,
      step: 0.01,
      isFloat: true,
    },
    {
      key: "top_n_rerank",
      label: "Top N Rerank",
      description: "Number of top results to retain after the reranking step.",
      min: 1,
      max: 20,
      step: 1,
    },
    {
      key: "top_k_retrieve",
      label: "Top K Retrieve",
      description: "Number of candidate documents to retrieve from the vector store before reranking.",
      min: 1,
      max: 50,
      step: 1,
    },
  ];

  const booleanFields: Array<{
    key: keyof RetrievalConfig;
    label: string;
    description: string;
  }> = [
    {
      key: "pii_masking_enabled",
      label: "PII Masking",
      description: "Enable or disable PII (Personally Identifiable Information) masking during generating response to protect sensitive data.",
    },
  ];

  return (
    <Box sx={{ maxWidth: 900, mx: "auto", py: 2 }}>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 4, flexWrap: "wrap", gap: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: "12px",
              background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <IconAdjustmentsHorizontal size={22} color="#fff" />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700} color="text.primary">
              Retrieval Configuration
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Tune the knowledge base search and confidence parameters
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: "flex", gap: 1 }}>
          <Tooltip title="Refresh">
            <IconButton onClick={fetchConfig} size="small" sx={{ border: "1px solid", borderColor: "divider" }}>
              <IconRefresh size={18} />
            </IconButton>
          </Tooltip>
          <Button
            variant="outlined"
            startIcon={<IconRotate size={16} />}
            onClick={handleReset}
            disabled={savingConfig || loadingConfig}
            color="inherit"
            sx={{ textTransform: "none", borderColor: "divider" }}
          >
            Reset to Defaults
          </Button>
          <Button
            variant="contained"
            startIcon={<IconDeviceFloppy size={16} />}
            onClick={handleSave}
            disabled={!hasChanges || savingConfig || loadingConfig}
            sx={{
              textTransform: "none",
              background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
              boxShadow: `0 4px 14px ${alpha(theme.palette.primary.dark, 0.3)}`,
              color: "#fff",
              "& .MuiButton-startIcon": { color: "#fff" },
              "&.Mui-disabled": {
                background: theme.palette.grey[300],
                color: theme.palette.grey[500],
                boxShadow: "none",
                "& .MuiButton-startIcon": { color: theme.palette.grey[500] },
              },
            }}
          >
            {savingConfig ? "Saving..." : "Save Changes"}
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => {}}>
          {error}
        </Alert>
      )}
{/* 
      {/* Source chip */}
      {/* {configSource && !loadingConfig && (
        <Box sx={{ mb: 3 }}>
          <Chip
            icon={<IconSettings size={14} />}
            label={`Source: ${configSource}`}
            size="small"
            sx={{
              backgroundColor: alpha(theme.palette.primary.main, 0.08),
              color: theme.palette.primary.main,
              fontWeight: 500,
              border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
            }}
          />
        </Box>
      )}  */}

      {/* Config Cards */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {configFields.map(({ key, label, description, min, max, step, isFloat }) => (
          <Card
            key={key}
            elevation={0}
            sx={{
              border: "1px solid",
              borderColor: "divider",
              borderRadius: "16px",
              overflow: "hidden",
              transition: "box-shadow 0.2s ease",
              "&:hover": { boxShadow: "0 4px 20px rgba(10, 61, 166, 0.08)" },
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
                <Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {label}
                    </Typography>
                    <Tooltip title={description} arrow>
                      <IconInfoCircle size={16} style={{ color: "#94a3b8", cursor: "help" }} />
                    </Tooltip>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {description}
                  </Typography>
                </Box>

                {loadingConfig ? (
                  <Skeleton width={80} height={56} sx={{ borderRadius: 2 }} />
                ) : (
                  <TextField
                    value={current ? (isFloat ? Number(current[key]).toFixed(2) : current[key]) : ""}
                    onChange={(e) => {
                      const val = isFloat ? parseFloat(e.target.value) : parseInt(e.target.value, 10);
                      if (!isNaN(val) && val >= min && val <= max) handleChange(key, val);
                    }}
                    inputProps={{ min, max, step, type: "number" }}
                    size="small"
                    sx={{
                      width: 100,
                      "& .MuiOutlinedInput-root": { borderRadius: "10px", fontWeight: 600 },
                    }}
                  />
                )}
              </Box>

              <Box sx={{ px: 1 }}>
                {loadingConfig ? (
                  <Skeleton width="100%" height={6} sx={{ borderRadius: 3 }} />
                ) : (
                  <Slider
                    value={current ? (current[key] as number) : min}
                    min={min}
                    max={max}
                    step={step}
                    onChange={(_, val) => handleChange(key, val as number)}
                    valueLabelDisplay="auto"
                    valueLabelFormat={(v) => (isFloat ? v.toFixed(2) : v)}
                    sx={{
                      color: theme.palette.primary.main,
                      "& .MuiSlider-thumb": {
                        width: 20,
                        height: 20,
                        boxShadow: `0 2px 8px ${alpha(theme.palette.primary.main, 0.4)}`,
                        "&:hover": { boxShadow: `0 2px 12px ${alpha(theme.palette.primary.main, 0.6)}` },
                      },
                      "& .MuiSlider-track": {
                        background: `linear-gradient(90deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
                        border: "none",
                      },
                    }}
                  />
                )}
                <Box sx={{ display: "flex", justifyContent: "space-between", mt: 0.5 }}>
                  <Typography variant="caption" color="text.disabled">
                    {isFloat ? min.toFixed(2) : min}
                  </Typography>
                  <Typography variant="caption" color="text.disabled">
                    {isFloat ? max.toFixed(2) : max}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        ))}

        {booleanFields.map(({ key, label, description }) => (
          <Card
            key={key}
            elevation={0}
            sx={{
              border: "1px solid",
              borderColor: "divider",
              borderRadius: "16px",
              overflow: "hidden",
              transition: "box-shadow 0.2s ease",
              "&:hover": { boxShadow: "0 4px 20px rgba(10, 61, 166, 0.08)" },
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {label}
                    </Typography>
                    <Tooltip title={description} arrow>
                      <IconInfoCircle size={16} style={{ color: "#94a3b8", cursor: "help" }} />
                    </Tooltip>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {description}
                  </Typography>
                </Box>

                {loadingConfig ? (
                  <Skeleton width={40} height={24} sx={{ borderRadius: 1 }} />
                ) : (
                  <Switch
                    checked={!!(current && current[key])}
                    onChange={(e) => handleChange(key, e.target.checked)}
                    color="primary"
                  />
                )}
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* Unsaved change banner */}
      {hasChanges && (
        <Box
          sx={{
            mt: 3,
            p: 2,
            borderRadius: "12px",
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.dark, 0.06)}, ${alpha(theme.palette.primary.main, 0.06)})`,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 1,
          }}
        >
          <Typography variant="body2" color="primary" fontWeight={500}>
            You have unsaved changes.
          </Typography>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              size="small"
              onClick={() => setDraft(null)}
              sx={{ textTransform: "none", color: "text.secondary" }}
            >
              Discard
            </Button>
            <Button
              size="small"
              variant="contained"
              onClick={handleSave}
              disabled={savingConfig}
              sx={{
                textTransform: "none",
                borderRadius: "10px",
                background: `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
                color: "#fff",
                "& .MuiButton-startIcon, & .MuiButton-endIcon": { color: "#fff" },
                "&.Mui-disabled": {
                  background: theme.palette.grey[300],
                  color: theme.palette.grey[500],
                  boxShadow: "none",
                  "& .MuiButton-startIcon, & .MuiButton-endIcon": { color: theme.palette.grey[500] },
                },
              }}
            >
              Save
            </Button>
          </Box>
        </Box>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((p) => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((p) => ({ ...p, open: false }))}
          sx={{ borderRadius: 2 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default function ConfigPage() {
  return (
    <ConfigProvider>
      <ConfigPageContent />
    </ConfigProvider>
  );
}
