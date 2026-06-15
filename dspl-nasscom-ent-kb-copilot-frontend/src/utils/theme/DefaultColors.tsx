import { createTheme } from "@mui/material/styles";
import { Plus_Jakarta_Sans } from "next/font/google";

export const plus = Plus_Jakarta_Sans({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
  fallback: ["Helvetica", "Arial", "sans-serif"],
});

const baselightTheme = createTheme({
  direction: "ltr",
  palette: {
    primary: {
      main: "#0d4ed2",
      50: "#EEF2FF",
      100: "#E0E7FF",
      200: "#C7D7FD",
      300: "#A5BFFB",
      400: "#7CA0F8",
      500: "#5080F5",
      light: "#e6efff",
      dark: "#0A3DA6",
      contrastText: "#ffffff",
    } as any,
    secondary: {
      main: "#66b7d2",
      light: "#E8F7FF",
      dark: "#3a8fae",
    },
    success: {
      main: "#13DEB9",
      light: "#E6FFFA",
      dark: "#02b3a9",
      contrastText: "#ffffff",
    },
    info: {
      main: "#539BFF",
      light: "#EBF3FE",
      dark: "#0875c9ff",
      contrastText: "#ffffff",
    },
    error: {
      main: "#d80707ff",
      light: "#FDEDE8",
      dark: "#f3704d",
      contrastText: "#ffffff",
    },
    warning: {
      main: "#FFAE1F",
      light: "#FEF5E5",
      dark: "#ae8e59",
      contrastText: "#ffffff",
    },
    grey: {
      50: "#F8FAFC",
      100: "#F1F5F9",
      200: "#E8EDF4",
      300: "#D1DAE8",
      400: "#8FA3BF",
      500: "#5A6A85",
      600: "#2A3547",
    },
    background: {
      default: "#F4F6FB",
      paper: "#FFFFFF",
    },
    text: {
      primary: "#1E293B",
      secondary: "#5A6A85",
    },
    action: {
      disabledBackground: "rgba(73,82,88,0.12)",
      hoverOpacity: 0.04,
      hover: "#F1F5FA",
    },
    divider: "#E2E8F0",
  },

  typography: {
    fontFamily: plus.style.fontFamily,
    h1: { fontWeight: 700, fontSize: "2.25rem", lineHeight: "2.75rem", fontFamily: plus.style.fontFamily },
    h2: { fontWeight: 700, fontSize: "1.875rem", lineHeight: "2.25rem", fontFamily: plus.style.fontFamily },
    h3: { fontWeight: 700, fontSize: "1.5rem", lineHeight: "1.75rem", fontFamily: plus.style.fontFamily },
    h4: { fontWeight: 700, fontSize: "1.3125rem", lineHeight: "1.6rem" },
    h5: { fontWeight: 600, fontSize: "1.125rem", lineHeight: "1.6rem" },
    h6: { fontWeight: 600, fontSize: "1rem", lineHeight: "1.2rem" },
    button: { textTransform: "capitalize", fontWeight: 600 },
    body1: { fontSize: "0.875rem", fontWeight: 400, lineHeight: "1.5rem" },
    body2: { fontSize: "0.75rem", fontWeight: 400, lineHeight: "1.25rem" },
    subtitle1: { fontSize: "0.875rem", fontWeight: 500 },
    subtitle2: { fontSize: "0.875rem", fontWeight: 400, color: "#5A6A85" },
  },

  shape: { borderRadius: 12 },

  components: {
    // ─── Baseline ────────────────────────────────────────────────────────────
    MuiCssBaseline: {
      styleOverrides: {
        body: { backgroundColor: "#F4F6FB" },
        "*": { scrollbarWidth: "thin", scrollbarColor: "#D1DAE8 transparent" },
        "*::-webkit-scrollbar": { width: "6px", height: "6px" },
        "*::-webkit-scrollbar-track": { background: "transparent" },
        "*::-webkit-scrollbar-thumb": {
          backgroundColor: "#D1DAE8",
          borderRadius: "8px",
          "&:hover": { backgroundColor: "#8FA3BF" },
        },
        ".MuiPaper-elevation9, .MuiPopover-root .MuiPaper-elevation": {
          boxShadow:
            "0px 4px 24px rgba(30, 41, 59, 0.08), 0px 1px 4px rgba(30, 41, 59, 0.04) !important",
        },
      },
    },

    // ─── Card ────────────────────────────────────────────────────────────────
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: "16px",
          boxShadow: "0px 1px 3px rgba(30,41,59,0.06), 0px 4px 16px rgba(30,41,59,0.04)",
          border: "1px solid #E2E8F0",
          transition: "box-shadow 0.25s ease, transform 0.25s ease",
          "&:hover": {
            boxShadow: "0px 6px 24px rgba(13,78,210,0.10), 0px 1px 4px rgba(30,41,59,0.06)",
          },
        },
      },
    },

    // ─── Button ──────────────────────────────────────────────────────────────
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: "10px",
          fontWeight: 600,
          fontSize: "0.875rem",
          padding: "8px 20px",
          textTransform: "capitalize",
          transition: "all 0.2s ease",
          boxShadow: "none",
          "&:hover": { boxShadow: "none", transform: "translateY(-1px)" },
          "&:active": { transform: "translateY(0px)" },
        },
        containedPrimary: {
          background: "linear-gradient(135deg, #0A3DA6 0%, #4c86ff 100%)",
          color: "#fff",
          "&:hover": {
            background: "linear-gradient(135deg, #0d4ed2 0%, #5a90ff 100%)",
          },
        },
        outlinedPrimary: {
          borderColor: "#C7D7FD",
          "&:hover": { background: "#EEF2FF", borderColor: "#7CA0F8" },
        },
        outlinedInherit: {
          borderColor: "#E2E8F0",
          color: "#1E293B",
          "&:hover": { background: "#F8FAFC", borderColor: "#D1DAE8" },
        },
      },
    },

    // ─── IconButton ──────────────────────────────────────────────────────────
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: "10px",
          transition: "all 0.2s ease",
          "&:hover": { backgroundColor: "rgba(13,78,210,0.06)" },
        },
      },
    },

    // ─── TextField ───────────────────────────────────────────────────────────
    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            borderRadius: "10px",
            backgroundColor: "#FFFFFF",
            transition: "box-shadow 0.2s ease",
            "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#7CA0F8" },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: "#0d4ed2",
              borderWidth: "1.5px",
            },
            "&.Mui-focused": { boxShadow: "0 0 0 3px rgba(13, 78, 210, 0.10)" },
          },
          "& .MuiOutlinedInput-notchedOutline": { borderColor: "#E2E8F0" },
        },
      },
    },

    // ─── Select ──────────────────────────────────────────────────────────────
    MuiSelect: {
      styleOverrides: {
        outlined: { borderRadius: "10px" },
      },
    },

    MuiInputLabel: {
      styleOverrides: {
        root: { fontSize: "0.875rem", "&.Mui-focused": { color: "#0d4ed2" } },
      },
    },

    // ─── AppBar (Header) ─────────────────────────────────────────────────────
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: "none",
          borderBottom: "1px solid rgba(226, 232, 240, 0.9)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          backgroundColor: "rgba(255, 255, 255, 0.88) !important",
        },
      },
    },

    // ─── Drawer (Sidebar) ────────────────────────────────────────────────────
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: "#FFFFFF",
          backgroundImage: "linear-gradient(180deg, #f4f8ff 0%, #ffffff 35%)",
          borderRight: "1px solid #E2E8F0",
        },
      },
    },

    // ─── Chip ────────────────────────────────────────────────────────────────
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: "8px", fontWeight: 600, fontSize: "0.75rem" },
        colorSuccess: { backgroundColor: "#E6FFFA", color: "#02b3a9" },
        colorWarning: { backgroundColor: "#FEF5E5", color: "#ae8e59" },
        colorInfo: { backgroundColor: "#EBF3FE", color: "#1682d4" },
        colorError: { backgroundColor: "#FDEDE8", color: "#f3704d" },
      },
    },

    // ─── Table ───────────────────────────────────────────────────────────────
    MuiTableHead: {
      styleOverrides: {
        root: {
          "& .MuiTableCell-head": {
            backgroundColor: "#F8FAFC",
            color: "#1E293B",
            fontWeight: 700,
            fontSize: "0.8125rem",
            letterSpacing: "0.02em",
            textTransform: "uppercase",
            borderBottom: "2px solid #E2E8F0",
            padding: "14px 16px",
          },
        },
      },
    },
    MuiTableBody: {
      styleOverrides: {
        root: {
          "& .MuiTableRow-root": {
            transition: "background 0.15s ease",
            "&:hover": { backgroundColor: "#F1F5FF" },
          },
          "& .MuiTableCell-body": {
            borderBottom: "1px solid #F1F5F9",
            padding: "12px 16px",
            fontSize: "0.875rem",
          },
        },
      },
    },
    MuiTablePagination: {
      styleOverrides: {
        root: {
          borderTop: "1px solid #E2E8F0",
          "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows": {
            fontSize: "0.8125rem",
            color: "#5A6A85",
          },
        },
      },
    },

    // ─── LinearProgress ──────────────────────────────────────────────────────
    MuiLinearProgress: {
      styleOverrides: {
        root: { borderRadius: "4px", backgroundColor: "#EEF2FF", height: "5px" },
        bar: {
          background: "linear-gradient(90deg, #0A3DA6, #4c86ff)",
          borderRadius: "4px",
        },
      },
    },

    // ─── Alert ───────────────────────────────────────────────────────────────
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: "12px", fontSize: "0.875rem" },
      },
    },

    // ─── Divider ─────────────────────────────────────────────────────────────
    MuiDivider: {
      styleOverrides: {
        root: { borderColor: "#E2E8F0" },
      },
    },

    // ─── Tooltip ─────────────────────────────────────────────────────────────
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          borderRadius: "8px",
          fontSize: "0.75rem",
          backgroundColor: "#1E293B",
          padding: "6px 12px",
        },
        arrow: { color: "#1E293B" },
      },
    },

    // ─── Slider ──────────────────────────────────────────────────────────────
    MuiSlider: {
      styleOverrides: {
        root: { color: "#0d4ed2" },
        track: {
          background: "linear-gradient(90deg, #0A3DA6, #4c86ff)",
          border: "none",
          height: 6,
        },
        rail: { height: 6, backgroundColor: "#E2E8F0" },
        thumb: {
          width: 20,
          height: 20,
          backgroundColor: "#fff",
          border: "2px solid #0d4ed2",
          boxShadow: "0 2px 8px rgba(13, 78, 210, 0.3)",
          "&:hover": { boxShadow: "0 2px 14px rgba(13, 78, 210, 0.5)" },
        },
        valueLabel: {
          background: "linear-gradient(135deg, #0A3DA6, #4c86ff)",
          borderRadius: "8px",
        },
      },
    },

    // ─── Menu & MenuItem ─────────────────────────────────────────────────────
    MuiMenu: {
      styleOverrides: {
        paper: {
          borderRadius: "14px",
          boxShadow: "0px 8px 32px rgba(30,41,59,0.12), 0px 2px 8px rgba(30,41,59,0.06)",
          border: "1px solid #E2E8F0",
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          borderRadius: "8px",
          margin: "2px 8px",
          padding: "8px 12px",
          fontSize: "0.875rem",
          "&:hover": { backgroundColor: "#F1F5FF" },
          "&.Mui-selected": {
            backgroundColor: "#EEF2FF",
            "&:hover": { backgroundColor: "#E0E7FF" },
          },
        },
      },
    },

    // ─── Badge ───────────────────────────────────────────────────────────────
    MuiBadge: {
      styleOverrides: {
        badge: { fontWeight: 600, fontSize: "0.7rem" },
      },
    },
  },
});

export { baselightTheme };
