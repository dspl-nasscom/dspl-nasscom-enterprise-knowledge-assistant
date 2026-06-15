import React, { useState } from "react";
import {
  Avatar,
  Box,
  Menu,
  Button,
  IconButton,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { IconTicket, IconLogout, IconMessage } from "@tabler/icons-react";
import { useAuth } from "../../../../../contexts/AuthContext";

const Profile = () => {
  const [anchorEl2, setAnchorEl2] = useState<null | HTMLElement>(null);
  const { logout, currentUser, role } = useAuth();
  const router = useRouter();
  const isUser = role === "User";

  if (!currentUser) return null;

  const handleClick2 = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl2(event.currentTarget);
  };

  const handleClose2 = () => {
    setAnchorEl2(null);
  };

  async function handleLogout(): Promise<void> {
    handleClose2();
    await logout();
    router.push("/authentication/login");
  }

  function handleMyTickets() {
    handleClose2();
    router.push("/my-tickets");
  }

  function handleCopilot() {
    handleClose2();
    router.push("/chat");
  }

  const initials = currentUser?.displayName
    ? currentUser.displayName
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : (currentUser?.email?.[0]?.toUpperCase() ?? "?");

  return (
    <Box>
      <IconButton
        size="large"
        aria-label="User profile menu"
        color="inherit"
        aria-controls="profile-menu"
        aria-haspopup="true"
        sx={{
          ...(Boolean(anchorEl2) && { color: "primary.main" }),
          p: 0.5,
          transition: "transform 0.2s ease",
          "&:hover": { transform: "scale(1.05)" },
        }}
        onClick={handleClick2}
      >
        <Avatar
          src={currentUser?.photoURL ?? undefined}
          alt={currentUser?.displayName ?? currentUser?.email ?? "User"}
          sx={{
            width: 36,
            height: 36,
            background: "linear-gradient(135deg, #0D4ED2 0%, #4c86ff 100%)",
            fontSize: "0.85rem",
            fontWeight: 700,
            boxShadow: "0 2px 8px rgba(13,78,210,0.25)",
            border: "2px solid rgba(255,255,255,0.9)",
          }}
        >
          {initials}
        </Avatar>
      </IconButton>

      <Menu
        id="profile-menu"
        anchorEl={anchorEl2}
        keepMounted
        open={Boolean(anchorEl2)}
        onClose={handleClose2}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        PaperProps={{
          elevation: 3,
          sx: {
            width: 260,
            borderRadius: "14px",
            mt: 1,
            overflow: "visible",
            border: "1px solid rgba(226, 232, 240, 0.8)",
            boxShadow: "0 8px 30px rgba(0,0,0,0.1)",
            "&::before": {
              content: '""',
              display: "block",
              position: "absolute",
              top: -6,
              right: 14,
              width: 12,
              height: 12,
              bgcolor: "background.paper",
              transform: "rotate(45deg)",
              borderTop: "1px solid rgba(226,232,240,0.8)",
              borderLeft: "1px solid rgba(226,232,240,0.8)",
              zIndex: 0,
            },
          },
        }}
      >
        {/* User info header */}
        <Box px={2} py={1.5}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Avatar
              src={currentUser?.photoURL ?? undefined}
              sx={{
                width: 32,
                height: 32,
                background: "linear-gradient(135deg, #0D4ED2 0%, #4c86ff 100%)",
                fontSize: "0.75rem",
                fontWeight: 700,
              }}
            >
              {initials}
            </Avatar>
            <Box sx={{ overflow: "hidden" }}>
              {currentUser?.displayName && (
                <Typography
                  variant="body2"
                  fontWeight={700}
                  sx={{ lineHeight: 1.2, color: "#1e293b" }}
                  noWrap
                >
                  {currentUser.displayName}
                </Typography>
              )}
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontSize: "0.7rem", display: "block" }}
              >
                {currentUser?.email}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Logout */}
        <Box px={1.5} pb={1.5} pt={0.5}>
          <Button
            variant="outlined"
            color="error"
            fullWidth
            startIcon={<IconLogout size={16} />}
            onClick={handleLogout}
            sx={{
              textTransform: "none",
              borderRadius: "10px",
              fontWeight: 600,
              fontSize: "0.875rem",
              borderColor: "rgba(239,68,68,0.3)",
              color: "#ef4444",
              "&:hover": {
                borderColor: "#ef4444",
                bgcolor: "rgba(239,68,68,0.06)",
              },
            }}
          >
            Logout
          </Button>
        </Box>
      </Menu>
    </Box>
  );
};

export default Profile;
