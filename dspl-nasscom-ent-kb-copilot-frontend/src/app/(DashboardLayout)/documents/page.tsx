"use client";

import React, { useState, useRef } from "react";
import {
  Box,
  Typography,
  Card,
  Button,
  Alert,
  TextField,
  IconButton,
  Tooltip,
  LinearProgress,
  Chip,
  useTheme,
  alpha,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Divider,
} from "@mui/material";
import {
  IconDatabase,
  IconFileUpload,
  IconRefresh,
  IconX,
  IconCheck,
  IconAlertCircle,
  IconHourglassLow,
  IconFileText,
  IconFileDescription,
  IconAnalyze,
} from "@tabler/icons-react";
import { GenericManagementTable } from "@/app/(DashboardLayout)/components/common/DataTable";
import { DocumentProvider, useDocumentContext, IngestResponse } from "../../../../contexts/DocumentContext";
import { openSecureDocument } from "@/utils/documentUtils";

interface DocFile {
  id: string;
  name: string;
  type: string;
  size: string;
  status: "ingested" | "processing" | "failed";
  uploadedAt: string;
}

function StatusChip({ status }: { status: string }) {
  const theme = useTheme();

  const getColors = (status: string) => {
    switch (status) {
      case "ingested":
        return {
          color: theme.palette.success.dark,
          bg: alpha(theme.palette.success.main, 0.1),
        };
      case "processing":
        return {
          color: theme.palette.info.dark,
          bg: alpha(theme.palette.info.main, 0.1),
        };
      case "failed":
        return {
          color: theme.palette.error.dark,
          bg: alpha(theme.palette.error.main, 0.1),
        };
      default:
        return {
          color: theme.palette.grey[500],
          bg: alpha(theme.palette.grey[500], 0.1),
        };
    }
  };

  const { color, bg } = getColors(status);

  return (
    <Chip
      icon={
        status === "ingested" ? (
          <IconCheck size={14} />
        ) : status === "processing" ? (
          <IconHourglassLow size={14} />
        ) : (
          <IconAlertCircle size={14} />
        )
      }
      label={status.charAt(0).toUpperCase() + status.slice(1)}
      size="small"
      sx={{
        backgroundColor: bg,
        color: color,
        fontWeight: 700,
        fontSize: "0.7rem",
        borderRadius: "6px",
        height: 24,
        px: 0.5,
        border: "1px solid",
        borderColor: "currentColor",
      }}
    />
  );
}

const SUPPORTED_FORMATS = [".pdf", ".csv", ".txt", ".md"];
const ACCEPT_STR = SUPPORTED_FORMATS.join(",");
const MAX_FILE_SIZE = 30 * 1024 * 1024; // 30MB

function DocumentsPageContent() {
  const theme = useTheme();
  const [files, setFiles] = useState<File[]>([]);
  const [localError, setLocalError] = useState<string | null>(null);
  const [documents, setDocuments] = useState<Record<string, any[]>>({}); // Store fetched pages: { "page_limit": documents[] }
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const loadingRefs = useRef<Record<string, boolean>>({});

  const {
    ingestDocuments,
    fetchDocuments,
    ingesting,
    fetching,
    error: ingestError,
  } = useDocumentContext();

  const loadDocuments = async (forceRefresh: boolean = false) => {
    const cacheKey = `${page}_${rowsPerPage}`;
    
    if (!forceRefresh && documents[cacheKey]) {
      return;
    }

    if (loadingRefs.current[cacheKey] && !forceRefresh) {
      return;
    }

    try {
      loadingRefs.current[cacheKey] = true;
      const data = await fetchDocuments(rowsPerPage, page * rowsPerPage);
      setTotal(data.total);
      
      setDocuments(prev => ({
        ...prev,
        [cacheKey]: data.documents
      }));
    } catch (err) {
      console.error("Failed to load documents", err);
    } finally {
      loadingRefs.current[cacheKey] = false;
    }
  };

  React.useEffect(() => {
    loadDocuments();
  }, [page, rowsPerPage]);

  // For when an upload finishes, clear cache and refresh the list
  React.useEffect(() => {
    if (!ingesting && summaryData) {
      setDocuments({}); // Clear all cached pages on new upload
      loadDocuments(true);
    }
  }, [ingesting]);

  const [isDragging, setIsDragging] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [summaryData, setSummaryData] = useState<IngestResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFiles = (incomingFiles: File[]) => {
    setLocalError(null);
    const validFiles: File[] = [];
    const invalidFormats: string[] = [];
    const oversizedFiles: string[] = [];

    incomingFiles.forEach((file) => {
      const extension = `.${file.name.split(".").pop()?.toLowerCase()}`;
      const isSupported = SUPPORTED_FORMATS.includes(extension);
      const isSizeValid = file.size <= MAX_FILE_SIZE;

      if (!isSupported) {
        invalidFormats.push(file.name);
      } else if (!isSizeValid) {
        oversizedFiles.push(file.name);
      } else {
        validFiles.push(file);
      }
    });

    if (invalidFormats.length > 0) {
      setLocalError(
        `Invalid file format: ${invalidFormats.join(", ")}. Supported: PDF, CSV, TXT, MD.`,
      );
    } else if (oversizedFiles.length > 0) {
      setLocalError(`File too large (>30MB): ${oversizedFiles.join(", ")}.`);
    }

    return validFiles;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const validated = validateFiles(Array.from(e.target.files));
      if (validated.length > 0) {
        setFiles((prev) => [...prev, ...validated]);
      }
      // Reset input value so the same file can be selected again
      e.target.value = "";
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      const validated = validateFiles(Array.from(e.dataTransfer.files));
      if (validated.length > 0) {
        setFiles((prev) => [...prev, ...validated]);
      }
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setLocalError(null);
    try {
      const response = await ingestDocuments(files, {
        chunk_size: 512,
        chunk_overlap: 64,
      });
      setSummaryData(response);
      setFiles([]);
      setShowSummary(true);
      // Explicitly clear input ref if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      console.error("Upload failed", err);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const columns = [     
    {
      header: "Document Title",
      accessor: (doc: any) => doc.title || doc.filename,
    },
    {
      header: "Type",
      accessor: (doc: any) => (
        <Chip
          label={doc.doc_type?.toUpperCase()}
          size="small"
          variant="outlined"
          sx={{ borderRadius: "6px", fontWeight: 600, fontSize: "0.7rem" }}
        />
      ),
    },
    {
      header: "Uploaded On",
      accessor: (doc: any) => {
        const date = new Date(doc.ingested_at);
        return date.toLocaleDateString("en-US", { 
          day: '2-digit', 
          month: 'short', 
          year: 'numeric' 
        }) + " " + date.toLocaleTimeString("en-US", { 
          hour: '2-digit', 
          minute: '2-digit', 
          hour12: true 
        });
      },
    },
  ];

  return (
    <Box sx={{ py: 2 }}>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 4,
          flexWrap: "wrap",
          gap: 2,
        }}
      >
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
            <IconDatabase size={22} color="#fff" />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700}>
              Ingest Documents
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage and ingest documents
            </Typography>
          </Box>
        </Box>
      </Box>

      {(ingestError || localError) && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: "12px" }}>
          {localError || ingestError}
        </Alert>
      )}

      {/* Upload Area */}
      <Card
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        sx={{
          mb: 4,
          p: 6,
          borderRadius: "24px",
          border: "2px dashed",
          borderColor:
            isDragging || files.length > 0
              ? theme.palette.primary.main
              : alpha(theme.palette.primary.main, 0.6),
          backgroundColor: isDragging
            ? alpha(theme.palette.primary.main, 0.04)
            : "#fff",
          backgroundImage: isDragging 
            ? `radial-gradient(circle at 50% 50%, ${alpha(theme.palette.primary.main, 0.05)} 0%, transparent 70%)`
            : "none",
          textAlign: "center",
          transition: "all 0.2s ease",
          cursor: "pointer",
          boxShadow: isDragging 
            ? `0 20px 40px ${alpha(theme.palette.primary.main, 0.1)}`
            : "0 4px 12px rgba(0,0,0,0.02)",
          position: "relative",
          overflow: "hidden",
          "&:hover": {
            borderColor: theme.palette.primary.main,
            //transform: "translateY(-4px)",
            boxShadow: `0 12px 24px ${alpha(theme.palette.primary.main, 0.08)}`,
            "& .upload-icon-box": {
              transform: "scale(1.1) translateY(-2px)",
              bgcolor: alpha(theme.palette.primary.main, 0.08),
            }
          },
        }}
      >
        <input
          type="file"
          id="file-upload"
          ref={fileInputRef}
          multiple
          accept={ACCEPT_STR}
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
        <label htmlFor="file-upload" style={{ cursor: "pointer" }}>
          <Box 
            className="upload-icon-box"
            sx={{ 
                mb: 3,
                display: 'inline-flex',
                p: 3,
                borderRadius: '24px',
                bgcolor: alpha(theme.palette.primary.main, 0.05),
                color: theme.palette.primary.main,
                transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            }}
          >
            <IconFileUpload
              size={64}
              stroke={1.2}
            />
          </Box>
          <Typography variant="h4" fontWeight={800} gutterBottom sx={{ color: 'text.primary', letterSpacing: '-0.02em' }}>
            {files.length > 0
              ? `${files.length} Files Selected`
              : "Click to upload or drag and drop your files"}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ opacity: 0.8, maxWidth: 400, mx: 'auto', mb: 1 }}>
            {files.length > 0 
              ? "Ready to ingest into your knowledge base"
              : "Supported: PDF, CSV, TXT, MD (Max 30MB per file)"}
          </Typography>
        </label>

        {files.length > 0 && (
          <Box sx={{ mt: 3, maxWidth: 500, mx: "auto" }}>
            <Box
              sx={{ display: "flex", flexDirection: "column", gap: 1, mb: 3 }}
            >
              {files.map((file, i) => (
                <Box
                  key={i}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    p: 1.5,
                    borderRadius: "10px",
                    backgroundColor: "#fff",
                    border: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <IconFileText size={18} color="#64748b" />
                    <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                      {file.name}
                    </Typography>
                    <Typography variant="caption" color="text.disabled">
                      {(file.size / 1024).toFixed(0)} KB
                    </Typography>
                  </Box>
                  <IconButton size="small" onClick={() => removeFile(i)}>
                    <IconX size={16} />
                  </IconButton>
                </Box>
              ))}
            </Box>

            {ingesting ? (
              <Box sx={{ width: "100%", mt: 2 }}>
                <LinearProgress sx={{ height: 8, borderRadius: 4 }} />
                <Typography variant="caption" sx={{ mt: 1, display: "block" }}>
                  Uploading and processing files...
                </Typography>
              </Box>
            ) : (
              <Button
                variant="contained"
                fullWidth
                size="large"
                onClick={handleUpload}
                startIcon={<IconAnalyze size={20} />}
                sx={{
                  textTransform: "none",
                  borderRadius: "12px",
                  background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
                  color: "#fff",
                  py: 1.5,
                  fontWeight: 700,
                  boxShadow: `0 8px 20px ${alpha(theme.palette.primary.dark, 0.2)}`,
                }}
              >
                Ingest Selected Documents
              </Button>
            )}
          </Box>
        )}
      </Card>

      <GenericManagementTable
        title="Ingested Documents"
        subtitle="Manage available documents in the knowledge base"
        data={documents[`${page}_${rowsPerPage}`] || []}
        columns={columns as any}
        isDropdownFilter={false}
        showAddButton={false}
        loading={fetching}
        totalCount={total}
        controlledPage={page}
        controlledRowsPerPage={rowsPerPage}
        onPageChange={(newPage) => setPage(newPage)}
        onRowsPerPageChange={(newRows) => {
          setRowsPerPage(newRows);
          setPage(0);
        }}
        renderActions={(doc: any) => (
          <Box sx={{ display: "flex", gap: 1, justifyContent: "center" }}>
            <Tooltip title="View Document">
              <Button
                variant="outlined"
                size="small"
                onClick={() => openSecureDocument(doc.storage_url)}
                sx={{ borderRadius: "8px", textTransform: "none", fontSize: "0.75rem" }}
              >
                View
              </Button>
            </Tooltip>
          </Box>
        )}
      />

      {/* Summary Dialog */}
      <Dialog
        open={showSummary}
        onClose={() => setShowSummary(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { borderRadius: "16px", p: 1 },
        }}
      >
        <DialogTitle
          sx={{ display: "flex", alignItems: "center", gap: 1, pb: 1, mt: 1 }}
        >
          <IconCheck color={theme.palette.success.main} />
          <Typography variant="h5" fontWeight={700} component="span">
            Ingestion Summary
          </Typography>
        </DialogTitle>
        <Divider />
        <DialogContent>
          {summaryData && (
            <Box>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                  gap: 2,
                  mb: 3,
                  mt: 1,
                }}
              >
                <Card
                  sx={{
                    p: 2,
                    textAlign: "center",
                    bgcolor: alpha(theme.palette.primary.main, 0.05),
                    border: "none",
                    boxShadow: "none",
                    borderRadius: "12px",
                  }}
                >
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    fontWeight={600}
                    sx={{ textTransform: "uppercase" }}
                  >
                    Total Files
                  </Typography>
                  <Typography variant="h4" fontWeight={700} color="primary">
                    {summaryData.total_files}
                  </Typography>
                </Card>
                <Card
                  sx={{
                    p: 2,
                    textAlign: "center",
                    bgcolor: alpha(theme.palette.success.main, 0.05),
                    border: "none",
                    boxShadow: "none",
                    borderRadius: "12px",
                  }}
                >
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    fontWeight={600}
                    sx={{ textTransform: "uppercase" }}
                  >
                    Successful
                  </Typography>
                  <Typography
                    variant="h4"
                    fontWeight={700}
                    color="success.main"
                  >
                    {
                      summaryData.results.filter((r) => !r.skipped && !r.error)
                        .length
                    }
                  </Typography>
                </Card>
                <Card
                  sx={{
                    p: 2,
                    textAlign: "center",
                    bgcolor: alpha(theme.palette.warning.main, 0.05),
                    border: "none",
                    boxShadow: "none",
                    borderRadius: "12px",
                  }}
                >
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    fontWeight={600}
                    sx={{ textTransform: "uppercase" }}
                  >
                    Skipped
                  </Typography>
                  <Typography
                    variant="h4"
                    fontWeight={700}
                    color="warning.main"
                  >
                    {summaryData.results.filter((r) => r.skipped).length}
                  </Typography>
                </Card>
                <Card
                  sx={{
                    p: 2,
                    textAlign: "center",
                    bgcolor: alpha(theme.palette.error.main, 0.05),
                    border: "none",
                    boxShadow: "none",
                    borderRadius: "12px",
                  }}
                >
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    fontWeight={600}
                    sx={{ textTransform: "uppercase" }}
                  >
                    Errors
                  </Typography>
                  <Typography variant="h4" fontWeight={700} color="error.main">
                    {summaryData.results.filter((r) => r.error).length}
                  </Typography>
                </Card>
              </Box>

              <Typography
                variant="subtitle2"
                fontWeight={700}
                gutterBottom
                sx={{ mt: 2 }}
              >
                File Details
              </Typography>
              <TableContainer
                component={Paper}
                variant="outlined"
                sx={{
                  borderRadius: "12px",
                  maxHeight: 400,
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell
                        sx={{ fontWeight: 700, bgcolor: "background.paper" }}
                      >
                        File Name
                      </TableCell>
                      <TableCell
                        sx={{ fontWeight: 700, bgcolor: "background.paper" }}
                      >
                        Status
                      </TableCell>
                      <TableCell
                        sx={{ fontWeight: 700, bgcolor: "background.paper" }}
                      >
                        Chunks
                      </TableCell>
                      <TableCell
                        sx={{ fontWeight: 700, bgcolor: "background.paper" }}
                      >
                        Reason/Error
                      </TableCell>
                      <TableCell
                        sx={{ fontWeight: 700, bgcolor: "background.paper" }}
                      >
                        Document
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {summaryData.results.map((result, idx) => (
                      <TableRow key={idx} hover>
                        <TableCell
                          sx={{
                            maxWidth: 200,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {result.file}
                        </TableCell>
                        <TableCell>
                          {result.error ? (
                            <Chip
                              label="Error"
                              size="small"
                              sx={{
                                fontWeight: 700,
                                fontSize: "0.65rem",
                                height: 20,
                                backgroundColor: alpha(
                                  theme.palette.error.main,
                                  0.1,
                                ),
                                color: theme.palette.error.dark,
                                borderRadius: "6px",
                              }}
                            />
                          ) : result.skipped ? (
                            <Chip
                              label="Skipped"
                              size="small"
                              sx={{
                                fontWeight: 700,
                                fontSize: "0.65rem",
                                height: 20,
                                backgroundColor: alpha(
                                  theme.palette.warning.main,
                                  0.1,
                                ),
                                color: theme.palette.warning.dark,
                                borderRadius: "6px",
                              }}
                            />
                          ) : (
                            <Chip
                              label="Success"
                              size="small"
                              sx={{
                                fontWeight: 700,
                                fontSize: "0.65rem",
                                height: 20,
                                backgroundColor: alpha(
                                  theme.palette.success.main,
                                  0.1,
                                ),
                                color: theme.palette.success.dark,
                                borderRadius: "6px",
                              }}
                            />
                          )}
                        </TableCell>
                        <TableCell sx={{ fontSize: "0.85rem" }}>
                          {result.chunk_count || 0}
                        </TableCell>

                        <TableCell
                          sx={{
                            maxWidth: 300,
                            color: result.error
                              ? "error.main"
                              : "text.secondary",
                            fontSize: "0.85rem",
                          }}
                        >
                          {result.error || result.skip_reason || "-"}
                        </TableCell>
                        <TableCell
                          sx={{
                            maxWidth: 150,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            fontSize: "0.85rem",
                          }}
                        >
                          {result.storage_url ? (
                            <Typography
                              onClick={() => openSecureDocument(result.storage_url!)}
                              sx={{
                                color: theme.palette.primary.main,
                                cursor: "pointer",
                                "&:hover": { textDecoration: "underline" },
                              }}
                            >
                              View Document
                            </Typography>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* {summaryData.message && (
                <Alert severity="info" sx={{ mt: 3, borderRadius: "12px", border: "1px solid", borderColor: alpha(theme.palette.info.main, 0.2) }}>
                  {summaryData.message}
                </Alert>
              )} */}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button
            onClick={() => setShowSummary(false)}
            variant="contained"
            fullWidth
            size="large"
            sx={{
              borderRadius: "12px",
              fontWeight: 700,
              textTransform: "none",
              py: 1.5,
              background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
              boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.2)}`,
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default function DocumentsPage() {
  return (
    <DocumentProvider>
      <DocumentsPageContent />
    </DocumentProvider>
  );
}
