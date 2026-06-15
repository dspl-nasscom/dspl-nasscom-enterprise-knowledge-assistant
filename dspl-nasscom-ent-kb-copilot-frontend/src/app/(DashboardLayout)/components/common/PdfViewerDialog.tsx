"use client";
import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
  IconButton,
  Box,
  CircularProgress,
  Alert,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

interface PdfViewerDialogProps {
  open: boolean;
  onClose: () => void;
  url: string | null;
  loading: boolean;
  error: string | null;
  title?: string;
}

const PdfViewerDialog: React.FC<PdfViewerDialogProps> = ({
  open,
  onClose,
  url,
  loading,
  error,
  title = "Document Preview",
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: "90vw",
          maxWidth: "1200px",
          height: "90vh",
          borderRadius: 2,
          overflow: "hidden",
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          py: 1.5,
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Typography variant="h6" fontWeight={700}>
          {title}
        </Typography>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0, bgcolor: "#f5f5f5", display: "flex", flexDirection: "column" }}>
        {loading && (
          <Box sx={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <CircularProgress />
            <Typography mt={2}>Loading document...</Typography>
          </Box>
        )}

        {error && !loading && (
          <Box sx={{ p: 3 }}>
            <Alert severity="error">{error}</Alert>
          </Box>
        )}

        {url && !loading && !error && (
          <iframe
            src={url}
            style={{
              width: "100%",
              height: "100%",
              border: "none",
            }}
            title="PDF Viewer"
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PdfViewerDialog;