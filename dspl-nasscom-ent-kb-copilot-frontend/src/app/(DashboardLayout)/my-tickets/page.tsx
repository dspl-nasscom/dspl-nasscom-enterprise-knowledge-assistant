"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Card,
  Chip,
  CircularProgress,
  Drawer,
  IconButton,
  Avatar,
  Divider,
  Tooltip,
  Badge,
  Alert,
  useTheme,
  alpha,
} from "@mui/material";
import {
  IconTicket,
  IconEye,
  IconRefresh,
  IconX,
  IconMessageCircle,
  IconUser,
  IconClock,
  IconCircleCheck,
  IconAlertCircle,
  IconProgress,
  IconLock,
  IconInbox,
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

// ─── View-Only Ticket Drawer ──────────────────────────────────────────────────
function ViewTicketDrawer({
  ticket,
  open,
  onClose,
}: {
  ticket: Ticket | null;
  open: boolean;
  onClose: () => void;
}) {
  const theme = useTheme();

  if (!ticket) return null;

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
            Confidence score: {ticket.confidence_score}
          </Typography>
        </Box>
      )}

      <Divider />

      {/* Comments — read-only */}
      <Box
        sx={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
          <IconMessageCircle size={16} />
          <Typography variant="subtitle2" fontWeight={600}>
            Comments ({ticket.comments?.length ?? 0})
          </Typography>
        </Box>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
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
                  sx={{ lineHeight: 1.6 }}
                >
                  {c.text}
                </Typography>
              </Box>
            ))
          )}
        </Box>
      </Box>
    </Drawer>
  );
}

// ─── Column definitions ───────────────────────────────────────────────────────
const MY_TICKET_COLUMNS = [
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
    header: "Created",
    accessor: (t: Ticket) => (
      <Typography variant="caption" color="text.secondary" noWrap>
        {fmtDate(t.created_at)}
      </Typography>
    ),
  },
];

// ─── Main Page Content ────────────────────────────────────────────────────────
function MyTicketsPageContent() {
  const theme = useTheme();
  const { currentUser } = useAuth();
  const {
    tickets,
    total,
    loadingTickets,
    error,
    statusFilter,
    setStatusFilter,
    page,
    rowsPerPage,
    setPage,
    setRowsPerPage,
    fetchTickets,
    setSelectedTicket,
    selectedTicket,
  } = useTicketContext();

  const [drawerOpen, setDrawerOpen] = useState(false);

  // reporter email is pre-seeded via TicketProvider — no useEffect needed here

  const statusOptions = [
    { label: "Open", value: "open" },
    { label: "In Progress", value: "in_progress" },
    { label: "Resolved", value: "resolved" },
    { label: "Closed", value: "closed" },
  ];

  const handleView = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setDrawerOpen(true);
  };

  const statusCounts = Object.keys(STATUS_CONFIG).reduce(
    (acc, key) => {
      acc[key] = tickets.filter((t) => t.status === key).length;
      return acc;
    },
    {} as Record<string, number>,
  );

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
              My Tickets
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {total} ticket{total !== 1 ? "s" : ""} reported by you
            </Typography>
          </Box>
        </Box>

        {/* <Tooltip title="Refresh">
          <IconButton
            onClick={() =>
              fetchTickets({
                status: statusFilter || undefined,
                reporter_email: currentUser?.email,
              })
            }
            sx={{ border: "1px solid", borderColor: "divider" }}
          >
            <IconRefresh size={18} />
          </IconButton>
        </Tooltip> */}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {/* Status summary cards */}
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
        {Object.entries(STATUS_CONFIG).map(([status, { label, icon }]) => {
          const count = statusCounts[status] ?? 0;
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
                    React.cloneElement(icon as any, { size: 24, stroke: 2.5 })}
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

              {/* Highlight bar */}
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
        })}
      </Box>

      {/* ── DataTable (view-only) ── */}
      <GenericManagementTable<Ticket>
        title=""
        subtitle=""
        data={tickets}
        columns={MY_TICKET_COLUMNS}
        loading={loadingTickets}
        isDropdownFilter={true}
        filterOptions={statusOptions}
        controlledFilter={statusFilter}
        onFilterChange={(val) => setStatusFilter(val as TicketStatus | "")}
        statusAccessor="status"
        searchPlaceholder="Search by title, ID, status…"
        showAddButton={false}
        totalCount={total}
        controlledPage={page}
        controlledRowsPerPage={rowsPerPage}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        renderActions={(ticket) => (
          <Box sx={{ display: "flex", gap: 0.5, justifyContent: "center" }}>
            <Tooltip title="View Details">
              <IconButton size="small" onClick={() => handleView(ticket)}>
                <IconEye size={16} />
              </IconButton>
            </Tooltip>
          </Box>
        )}
      />

      <ViewTicketDrawer
        ticket={selectedTicket}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </Box>
  );
}

export default function MyTicketsPage() {
  const { currentUser } = useAuth();

  // Do NOT mount TicketProvider until we have the user's email.
  // This guarantees the very first fetchTickets always includes reporter_email.
  if (!currentUser?.email) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "50vh",
        }}
      >
        <CircularProgress size={36} />
      </Box>
    );
  }

  return (
    <TicketProvider reporterEmail={currentUser.email}>
      <MyTicketsPageContent />
    </TicketProvider>
  );
}
