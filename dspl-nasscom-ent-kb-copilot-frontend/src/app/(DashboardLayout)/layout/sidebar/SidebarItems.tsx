import React, { useState, useEffect } from "react";
import Image from "next/image";
import Menuitems from "./MenuItems";
import { Box, Typography, Chip, useTheme, Collapse } from "@mui/material";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { IconChevronDown, IconChevronUp } from "@tabler/icons-react";

import { useAuth } from "../../../../../contexts/AuthContext";

const SidebarItems = () => {
  const { role } = useAuth();
  const theme = useTheme();
  const pathname = usePathname();
  
  // State for open submenus
  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({});

  // Ensure sub-menu is open if a child is active
  useEffect(() => {
    Menuitems.forEach((item: any) => {
      if (item.children) {
        const isChildActive = item.children.some((child: any) => pathname === child.href);
        if (isChildActive) {
          setOpenSubmenus(prev => ({ ...prev, [item.id]: true }));
        }
      }
    });
  }, [pathname]);

  const toggleSubmenu = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpenSubmenus((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const renderMenuItem = (item: any, index: number, isChild = false) => {
    // Filter items by role
    if (item.roles && !item.roles.includes(role)) return null;

    if (item.subheader) {
      return (
        <Typography
          key={item.subheader}
          variant="caption"
          sx={{
            display: "block",
            px: 1.5,
            py: 1,
            mt: index > 0 ? 2 : 0,
            color: theme.palette.grey[400],
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            fontSize: "0.7rem",
          }}
        >
          {item.subheader}
        </Typography>
      );
    }

    const Icon = item.icon;
    const hasChildren = item.children && item.children.length > 0;
    const isOpen = openSubmenus[item.id];
    
    const isActive = pathname === item.href || 
      (item.href !== "/" && item.href !== "#" && pathname.startsWith(item.href)) ||
      (hasChildren && item.children.some((child: any) => pathname === child.href));

    return (
      <Box key={item.id} sx={{ mb: 0.5 }}>
        <motion.div
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <Box
            component={item.href === "#" ? "div" : Link}
            href={item.href === "#" ? undefined : item.href}
            onClick={hasChildren ? (e: any) => toggleSubmenu(item.id, e) : undefined}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              px: isChild ? 2.5 : 1.5,
              py: isChild ? 1 : 1.25,
              borderRadius: "10px",
              textDecoration: "none",
              position: "relative",
              cursor: "pointer",
              transition: "all 0.2s ease",
              background: (isActive && !hasChildren)
                ? `linear-gradient(135deg, ${theme.palette.primary.dark}15 0%, ${theme.palette.primary.main}15 100%)`
                : "transparent",
              "&:hover": {
                background: (isActive && !hasChildren)
                  ? `linear-gradient(135deg, ${theme.palette.primary.dark}20 0%, ${theme.palette.primary.main}20 100%)`
                  : theme.palette.action.hover,
                "& .nav-icon": { color: theme.palette.primary.main },
              },
              ...(isActive && !hasChildren && {
                "&::before": {
                  content: '""',
                  position: "absolute",
                  left: 0,
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: "3px",
                  height: "60%",
                  borderRadius: "0 4px 4px 0",
                  background: `linear-gradient(180deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
                },
              }),
            }}
          >
            {Icon && (
              <Box
                className="nav-icon"
                sx={{
                  display: "flex",
                  alignItems: "center",
                  color: isActive ? theme.palette.primary.main : theme.palette.text.primary,
                  transition: "color 0.2s ease",
                  flexShrink: 0,
                }}
              >
                <Icon stroke={isActive ? 2 : 1.5} size={isChild ? "1rem" : "1.15rem"} />
              </Box>
            )}
            <Typography
              variant="body1"
              sx={{
                fontWeight: isActive ? 700 : 500,
                fontSize: isChild ? "0.8rem" : "0.875rem",
                color: isActive ? theme.palette.primary.main : theme.palette.text.primary,
                transition: "color 0.2s ease",
                flex: 1,
              }}
            >
              {item.title}
            </Typography>
            
            {hasChildren && (
              <Box sx={{ display: "flex", alignItems: "center", color: theme.palette.grey[400] }}>
                {isOpen ? <IconChevronUp size="1rem" /> : <IconChevronDown size="1rem" />}
              </Box>
            )}
          </Box>
        </motion.div>

        {hasChildren && (
          <Collapse in={isOpen} timeout="auto" unmountOnExit>
            <Box sx={{ mt: 0.5, pl: 1 }}>
              {item.children.map((child: any, cIndex: number) => renderMenuItem(child, cIndex, true))}
            </Box>
          </Collapse>
        )}
      </Box>
    );
  };

  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        pt: 1,
      }}
    >
      {/* ─── Logo ──────────────────────────────────────────────────────────── */}
      <Box
        component={Link}
        href="/"
        sx={{
          display: "flex",
          alignItems: "center",
          px: 3,
          py: 2.5,
          textDecoration: "none",
          borderBottom: `1px solid ${theme.palette.divider}`,
          mb: 1.5,
          gap: 1.5,
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Image 
            src="/images/logos/devangles-logo.png" 
            alt="logo" 
            height={45} 
            width={45}           
            priority 
          />
        </Box>
        <Box>
          <Typography
            variant="body1"
            sx={{
              fontWeight: 700,
              fontSize: "0.9rem",
              lineHeight: 1.2,
              background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Enterprise KB
          </Typography>
          <Typography variant="caption" sx={{ color: theme.palette.grey[400], fontWeight: 500 }}>
            Copilot
          </Typography>
        </Box>
      </Box>

      {/* ─── Nav Items ─────────────────────────────────────────────────────── */}
      <Box 
        sx={{ 
          px: 2, 
          flex: 1, 
          overflowY: "auto",
          "&::-webkit-scrollbar": { width: "4px" },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: "rgba(0,0,0,0.05)",
            borderRadius: "10px",
          },
          pb: 2
        }}
      >
        {Menuitems.map((item: any, index: number) => renderMenuItem(item, index))}
      </Box>

      {/* ─── Footer Banner ─────────────────────────────────────────────────── */}
      <Box
        sx={{
          mx: 2,
          mt: "auto",
          mb: 3,
          p: 2,
          borderRadius: "12px",
          background: "linear-gradient(135deg, rgba(10,61,166,0.07) 0%, rgba(76,134,255,0.07) 100%)",
          border: "1px solid rgba(76,134,255,0.2)",
        }}
      >
        <Typography variant="body2" sx={{ fontWeight: 600, color: theme.palette.primary.main, mb: 0.5 }}>
          KB Copilot v1.0
        </Typography>
        <Typography variant="caption" sx={{ color: theme.palette.grey[400], lineHeight: 1.5 }}>
          Powered by DevAgentix
        </Typography>
      </Box>
    </Box>
  );
};

export default SidebarItems;
