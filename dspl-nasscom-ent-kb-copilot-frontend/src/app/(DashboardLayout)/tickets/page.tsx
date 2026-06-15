"use client";

import React, { useState, useMemo } from "react";
import {
  Box,
  Typography,
  Card,
  Chip,
  Drawer,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Avatar,
  Divider,
  Tooltip,
  IconButton,
  Snackbar,
  Badge,
  useTheme,
  alpha,
} from "@mui/material";
import {
  IconTicket,
  IconEye,
  IconRefresh,
  IconX,
  IconMessageCircle,
  IconSend,
  IconUser,
  IconClock,
  IconCircleCheck,
  IconAlertCircle,
  IconProgress,
  IconLock,
} from "@tabler/icons-react";
import {
  TicketProvider,
  useTicketContext,
  Ticket,
  TicketStatus,
} from "../../../../contexts/TicketContext";
import { useAuth } from "../../../../contexts/AuthContext";
import { GenericManagementTable } from "@/app/(DashboardLayout)/components/common/DataTable";
import { format } from "date-fns";

// ─── Status Config ────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<
  string,
  {
    label: string;
    color: "default" | "warning" | "info" | "success" | "error";
    icon: any;
  }
> = {
  open: {
    label: "Open",
    color: "warning",
    icon: <IconAlertCircle size={12} />,
  },
  in_progress: {
    label: "In Progress",
    color: "info",
    icon: <IconProgress size={12} />,
  },
  resolved: {
    label: "Resolved",
    color: "success",
    icon: <IconCircleCheck size={12} />,
  },
  closed: { label: "Closed", color: "default", icon: <IconLock size={12} /> },
};

function StatusChip({ status }: { status: string }) {
  const theme = useTheme();
  const cfg = STATUS_CONFIG[status] ?? {
    label: status,
    color: "default" as const,
    icon: null,
  };

  const getColors = (color: string) => {
    switch (color) {
      case "warning":
        return {
          bg: alpha(theme.palette.warning.main, 0.1),
          text: theme.palette.warning.dark,
        };
      case "info":
        return {
          bg: alpha(theme.palette.info.main, 0.1),
          text: theme.palette.info.dark,
        };
      case "success":
        return {
          bg: alpha(theme.palette.success.main, 0.1),
          text: theme.palette.success.dark,
        };
      default:
        return {
          bg: alpha(theme.palette.grey[500], 0.1),
          text: theme.palette.grey[500],
        };
    }
  };

  const colors = getColors(cfg.color);

  return (
    <Chip
      icon={cfg.icon as any}
      label={cfg.label}
      color={cfg.color}
      size="small"
      sx={{
        fontWeight: 700,
        fontSize: "0.7rem",
        borderRadius: "6px",
        height: 24,
        px: 0.5,
        backgroundColor: colors.bg,
        color: colors.text,
        border: "1px solid",
        borderColor: "currentColor",
      }}
    />
  );
}

function fmtDate(d: string) {
  try {
    return format(new Date(d), "MMM d, yyyy · h:mm a");
  } catch {
    return d;
  }
}

// ─── Ticket Detail Drawer ─────────────────────────────────────────────────────
function TicketDrawer({
  ticket,
  open,
  onClose,
}: {
  ticket: Ticket | null;
  open: boolean;
  onClose: () => void;
}) {
  const theme = useTheme();
  const { updateTicket, addComment, savingTicket } = useTicketContext();
  const { currentUser } = useAuth();
  const [newStatus, setNewStatus] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [comment, setComment] = useState("");
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({
    open: false,
    message: "",
    severity: "success",
  });
  const [showCommentForm, setShowCommentForm] = useState(false);

  React.useEffect(() => {
    if (ticket) {
      setNewStatus(ticket.status);
      setAssignedTo(ticket.assigned_to ?? "");
    }
  }, [ticket]);

  if (!ticket) return null;

  const handleUpdate = async () => {
    try {
      await updateTicket(ticket.ticket_id, {
        status: newStatus,
        assigned_to: assignedTo,
      });
      setSnackbar({
        open: true,
        message: "Ticket updated!",
        severity: "success",
      });
    } catch {
      setSnackbar({
        open: true,
        message: "Failed to update ticket.",
        severity: "error",
      });
    }
  };

  const handleAddComment = async () => {
    if (!comment.trim()) return;
    const author =
      currentUser?.displayName || currentUser?.email || "Anonymous User";
    try {
      await addComment(ticket.ticket_id, { author, text: comment });
      setComment("");
      setSnackbar({
        open: true,
        message: "Comment added!",
        severity: "success",
      });
    } catch {
      setSnackbar({
        open: true,
        message: "Failed to add comment.",
        severity: "error",
      });
    }
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: "100vw", sm: 520 },
          p: 3,
          display: "flex",
          flexDirection: "column",
          gap: 2.5,
          overflowY: "auto",
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <Box>
          <Typography variant="h6" fontWeight={700}>
            {ticket.title}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            #{ticket.ticket_id}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <IconX size={18} />
        </IconButton>
      </Box>

      {/* Badges */}
      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
        <StatusChip status={ticket.status} />
        <Chip
          icon={<IconUser size={12} />}
          label={ticket.assigned_to || "Unassigned"}
          size="small"
          variant="outlined"
          sx={{ fontSize: "0.72rem" }}
        />
        <Chip
          icon={<IconClock size={12} />}
          label={fmtDate(ticket.created_at)}
          size="small"
          variant="outlined"
          sx={{ fontSize: "0.72rem", color: "text.secondary" }}
        />
      </Box>

      <Divider />

      {/* Description */}
      <Box>
        <Typography variant="subtitle2" fontWeight={600} gutterBottom>
          Description
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ lineHeight: 1.7 }}
        >
          {ticket.description}
        </Typography>
      </Box>

      {/* Answer Attempted */}
      {ticket.answer_attempted && (
        <Box>
          <Typography variant="subtitle2" fontWeight={600} gutterBottom>
            Answer Attempted
          </Typography>
          <Box
            sx={{
              p: 2.5,
              borderRadius: "16px",
              backgroundColor: alpha(theme.palette.primary.main, 0.03),
              border: `1px solid ${alpha(theme.palette.primary.main, 0.15)}`,
              background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, rgba(255, 255, 255, 0) 100%)`,
              boxShadow: `inset 0 0 20px ${alpha(theme.palette.primary.main, 0.02)}`,
            }}
          >
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ lineHeight: 1.8, fontSize: "0.875rem" }}
            >
              {ticket.answer_attempted}
            </Typography>
          </Box>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mt: 0.5, display: "block" }}
          >
            Confidence Scrore: {ticket.confidence_score}
          </Typography>
        </Box>
      )}

      <Divider />

      {/* Update */}
      <Box>
        <Typography variant="subtitle2" fontWeight={600} gutterBottom>
          Update Ticket
        </Typography>
        <Box sx={{ display: "flex", gap: 2, flexDirection: "column" }}>
          <FormControl size="small" fullWidth>
            <InputLabel>Status</InputLabel>
            <Select
              value={newStatus}
              label="Status"
              onChange={(e) => setNewStatus(e.target.value)}
              sx={{ borderRadius: "10px" }}
            >
              {Object.entries(STATUS_CONFIG).map(([val, { label }]) => (
                <MenuItem key={val} value={val}>
                  {label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            size="small"
            label="Assigned To"
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: "10px" } }}
          />
          <Button
            variant="contained"
            onClick={handleUpdate}
            disabled={savingTicket}
            sx={{
              textTransform: "none",
              borderRadius: "10px",
              background: `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
              color: "#fff",
              "& .MuiButton-startIcon, & .MuiButton-endIcon": { color: "#fff" },
            }}
          >
            {savingTicket ? "Saving…" : "Update"}
          </Button>
        </Box>
      </Box>

      <Divider />

      {/* Comments */}
      <Box
        sx={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 2,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <IconMessageCircle size={16} />
            <Typography variant="subtitle2" fontWeight={600}>
              Comments ({ticket.comments?.length ?? 0})
            </Typography>
          </Box>
          {!showCommentForm && (
            <Button
              size="small"
              variant="text"
              onClick={() => setShowCommentForm(true)}
              sx={{
                textTransform: "none",
                fontWeight: 700,
                fontSize: "0.75rem",
              }}
            >
              + Add Comment
            </Button>
          )}
        </Box>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, mb: 3 }}>
          {(ticket.comments ?? []).length === 0 ? (
            <Typography
              variant="body2"
              color="text.disabled"
              sx={{ textAlign: "center", py: 3 }}
            >
              No comments yet
            </Typography>
          ) : (
            ticket.comments.map((c, i) => (
              <Box
                key={i}
                sx={{
                  p: 2,
                  borderRadius: "14px",
                  backgroundColor: "#fff",
                  border: "1px solid rgba(226, 232, 240, 0.8)",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
                  transition: "all 0.2s ease",
                  "&:hover": {
                    borderColor: "primary.main",
                    boxShadow: "0 4px 12px rgba(10,61,166,0.05)",
                  },
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    mb: 1,
                  }}
                >
                  <Avatar
                    sx={{
                      width: 28,
                      height: 28,
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
                    }}
                  >
                    {c.author?.[0]?.toUpperCase() ?? "?"}
                  </Avatar>
                  <Box>
                    <Typography
                      variant="caption"
                      fontWeight={700}
                      color="text.primary"
                      sx={{ display: "block", lineHeight: 1 }}
                    >
                      {c.author}
                    </Typography>
                    {c.created_at && (
                      <Typography
                        variant="caption"
                        color="text.disabled"
                        sx={{ fontSize: "0.65rem" }}
                      >
                        {fmtDate(c.created_at)}
                      </Typography>
                    )}
                  </Box>
                </Box>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ pl: 0, lineHeight: 1.6 }}
                >
                  {c.text}
                </Typography>
              </Box>
            ))
          )}
        </Box>

        {showCommentForm && (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 1.5,
              p: 2,
              borderRadius: "14px",
              backgroundColor: alpha(theme.palette.text.primary, 0.015),
              border: "1px dashed",
              borderColor: theme.palette.divider,
              animation: "fadeIn 0.3s ease",
            }}
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 0.5,
              }}
            >
              <Typography
                variant="caption"
                fontWeight={700}
                color="text.secondary"
              >
                New Comment
              </Typography>
              <IconButton
                size="small"
                onClick={() => setShowCommentForm(false)}
              >
                <IconX size={14} />
              </IconButton>
            </Box>
            <TextField
              size="small"
              label="Add a comment…"
              multiline
              rows={2}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: "10px" } }}
            />
            <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
              <Button
                variant="outlined"
                onClick={handleAddComment}
                disabled={!comment.trim() || savingTicket}
                sx={{ textTransform: "none", borderRadius: "10px" }}
              >
                Send
              </Button>
            </Box>
          </Box>
        )}
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3500}
        onClose={() => setSnackbar((p) => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert severity={snackbar.severity} sx={{ borderRadius: 2 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Drawer>
  );
}

// ─── Column definitions ───────────────────────────────────────────────────────
const TICKET_COLUMNS = [
  {
    header: "Ticket ID",
    accessor: (t: Ticket) => (
      <Typography variant="caption" fontFamily="monospace" color="primary">
        #{t.ticket_id.slice(0, 8)}…
      </Typography>
    ),
  },
  {
    header: "Title",
    accessor: (t: Ticket) => (
      <Box sx={{ minWidth: 200, py: 0.5 }}>
        <Typography
          variant="body2"
          fontWeight={600}
          sx={{ lineHeight: 1.4, mb: 0.5 }}
        >
          {t.title}
        </Typography>
        <Typography
          variant="caption"
          color="text.disabled"
          sx={{ display: "block", lineHeight: 1.3 }}
        >
          {t.description?.slice(0, 100)}
          {t.description?.length > 100 ? "..." : ""}
        </Typography>
      </Box>
    ),
  },
  {
    header: "Status",
    accessor: (t: Ticket) => <StatusChip status={t.status} />,
    align: "center" as const,
  },
  {
    header: "Assigned To",
    accessor: (t: Ticket) =>
      t.assigned_to ? (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          <Avatar
            sx={{
              width: 22,
              height: 22,
              fontSize: "0.65rem",
              bgcolor: "#4c86ff",
            }}
          >
            {t.assigned_to[0]?.toUpperCase()}
          </Avatar>
          <Typography variant="body2">{t.assigned_to}</Typography>
        </Box>
      ) : (
        <Typography variant="body2" color="text.disabled">
          —
        </Typography>
      ),
  },
  {
    header: "Reported By",
    accessor: (t: Ticket) =>
      t.reporter_email ? (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          <Avatar
            sx={{
              width: 22,
              height: 22,
              fontSize: "0.65rem",
              bgcolor: "#4c86ff",
            }}
          >
            {t.reporter_email[0]?.toUpperCase()}
          </Avatar>
          <Typography variant="body2">{t.reporter_email}</Typography>
        </Box>
      ) : (
        <Typography variant="body2" color="text.disabled">
          —
        </Typography>
      ),
  },
  {
    header: "Confidence Score",
    accessor: (t: Ticket) => (
      <Typography
        variant="body2"
        fontWeight={600}
        color={
          t.confidence_score > 0.7
            ? "success.main"
            : t.confidence_score > 0.4
              ? "warning.main"
              : "error.main"
        }
      >
        {t.confidence_score}
      </Typography>
    ),
    align: "center" as const,
  },
  {
    header: "Created",
    accessor: (t: Ticket) => (
      <Typography variant="caption" color="text.secondary" noWrap>
        {fmtDate(t.created_at)}
      </Typography>
    ),
  },
];

// ─── Main Page ────────────────────────────────────────────────────────────────
function TicketsPageContent() {
  const theme = useTheme();
  const {
    tickets,
    total,
    loadingTickets,
    error,
    statusFilter,
    setStatusFilter,
    assignedToFilter,
    setAssignedToFilter,
    page,
    rowsPerPage,
    setPage,
    setRowsPerPage,
    fetchTickets,
    setSelectedTicket,
    selectedTicket,
  } = useTicketContext();

  const [drawerOpen, setDrawerOpen] = useState(false);

  // ── Dynamic assignee options derived from current ticket response ─────────────
  const [clientAssignee, setClientAssignee] = useState("");
  const assigneeOptions = useMemo(() => {
    const set = new Set<string>();
    tickets.forEach((t) => { if (t.assigned_to) set.add(t.assigned_to); });
    return Array.from(set).sort();
  }, [tickets]);

  // ── Assignee client-side filter applied on top of server data ────────────────
  const filteredTickets = useMemo(() => {
    if (!clientAssignee) return tickets;
    return tickets.filter((t) => t.assigned_to === clientAssignee);
  }, [tickets, clientAssignee]);

  // Hardcoded status filter options
  const statusOptions = [
    { label: "Open", value: "open" },
    { label: "In Progress", value: "in_progress" },
    { label: "Resolved", value: "resolved" },
    { label: "Closed", value: "closed" },
  ];

  // Assignee filter options formatted for GenericManagementTable
  const assigneeFilterOptions = assigneeOptions.map((name) => ({
    label: name,
    value: name,
  }));

  const handleView = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setDrawerOpen(true);
  };

  return (
    <Box sx={{ py: 2 }}>
      {/* Page header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 3,
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
            <IconTicket size={22} color="#fff" />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700}>
              Ticket Management
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {total} support ticket{total !== 1 ? "s" : ""} total
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: "flex", gap: 1 }}>
          {(statusFilter || assignedToFilter || clientAssignee) && (
            <Button
              size="small"
              variant="text"
              onClick={() => {
                setStatusFilter("");
                setAssignedToFilter("");
                setClientAssignee("");
              }}
              sx={{ textTransform: "none", fontWeight: 700 }}
            >
              Clear Filters
            </Button>
          )}
          {/* <Tooltip title="Refresh">
            <IconButton
              onClick={() =>
                fetchTickets({
                  status: statusFilter || undefined,
                  assigned_to: assignedToFilter || undefined,
                })
              }
              sx={{ border: "1px solid", borderColor: "divider" }}
            >
              <IconRefresh size={18} />
            </IconButton>
          </Tooltip> */}
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {/* Status summary cards — drive context filter */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "repeat(1, 1fr)",
            sm: "repeat(2, 1fr)",
            md: "repeat(4, 1fr)",
          },
          gap: 2.5,
          mb: 4,
        }}
      >
        {Object.entries(STATUS_CONFIG).map(
          ([status, { label, color, icon }]) => {
            const count = tickets.filter((t) => t.status === status).length;
            const statusColors: Record<string, string> = {
              open: theme.palette.warning.main,
              in_progress: theme.palette.info.main,
              resolved: theme.palette.success.main,
              closed: theme.palette.primary.main,
            };
            const statusBgs: Record<string, string> = {
              open: alpha(theme.palette.warning.main, 0.08),
              in_progress: alpha(theme.palette.info.main, 0.08),
              resolved: alpha(theme.palette.success.main, 0.08),
              closed: alpha(theme.palette.primary.main, 0.08),
            };
            const isActive = statusFilter === status;

            return (
              <Card
                key={status}
                elevation={0}
                sx={{
                  border: "1px solid",
                  borderColor: isActive
                    ? statusColors[status]
                    : "rgba(226, 232, 240, 0.8)",
                  borderRadius: "16px",
                  overflow: "hidden",
                  cursor: "pointer",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  background: isActive
                    ? `linear-gradient(135deg, ${statusBgs[status]} 0%, rgba(255,255,255,1) 100%)`
                    : "#fff",
                  position: "relative",
                  "&:hover": {
                    transform: "translateY(-5px)",
                    boxShadow: `0 12px 20px -10px ${statusColors[status]}40`,
                    borderColor: statusColors[status],
                  },
                }}
                onClick={() =>
                  setStatusFilter(isActive ? "" : (status as TicketStatus))
                }
              >
                <Box
                  sx={{ p: 2.5, display: "flex", alignItems: "center", gap: 2 }}
                >
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: "12px",
                      backgroundColor: statusBgs[status],
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: statusColors[status],
                      transition: "all 0.3s",
                    }}
                  >
                    {icon &&
                      React.cloneElement(icon as any, {
                        size: 24,
                        stroke: 2.5,
                      })}
                  </Box>
                  <Box>
                    <Typography
                      variant="h4"
                      fontWeight={800}
                      sx={{ color: "#1e293b", lineHeight: 1.1 }}
                    >
                      {count}
                    </Typography>
                    <Typography
                      variant="body2"
                      fontWeight={600}
                      color="text.secondary"
                      sx={{ mt: 0.5, fontSize: "0.85rem" }}
                    >
                      {label}
                    </Typography>
                  </Box>
                </Box>

                {/* Highlight bar at bottom */}
                <Box
                  sx={{
                    height: 4,
                    width: isActive ? "100%" : "0%",
                    background: statusColors[status],
                    transition: "width 0.3s ease",
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                  }}
                />
              </Card>
            );
          },
        )}
      </Box>

      {/* ── DataTable ── */}
      <GenericManagementTable<Ticket>
        title=""
        subtitle=""
        data={filteredTickets}
        columns={TICKET_COLUMNS}
        loading={loadingTickets}
        isDropdownFilter={true}
        filterOptions={statusOptions}
        controlledFilter={statusFilter}
        onFilterChange={(val) => setStatusFilter(val as TicketStatus | "")}
        statusAccessor="status"
        secondFilterOptions={assigneeFilterOptions}
        secondFilterLabel="Assignee"
        controlledSecondFilter={clientAssignee}
        onSecondFilterChange={setClientAssignee}
        searchPlaceholder="Search by title, ID, status…"
        showAddButton={false}
        totalCount={total}
        controlledPage={page}
        controlledRowsPerPage={rowsPerPage}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        renderActions={(ticket) => (
          <Box sx={{ display: "flex", gap: 0.5, justifyContent: "center" }}>
            <Tooltip title="View / Edit">
              <IconButton size="small" onClick={() => handleView(ticket)}>
                <IconEye size={16} />
              </IconButton>
            </Tooltip>
            <Badge
              badgeContent={ticket.comments?.length ?? 0}
              color="primary"
              max={99}
            >
              <IconButton size="small" onClick={() => handleView(ticket)}>
                <IconMessageCircle size={16} />
              </IconButton>
            </Badge>
          </Box>
        )}
      />

      <TicketDrawer
        ticket={selectedTicket}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </Box>
  );
}

export default function TicketsPage() {
  const { currentUser } = useAuth();
  return (
    <TicketProvider>
      <TicketsPageContent />
    </TicketProvider>
  );
}
