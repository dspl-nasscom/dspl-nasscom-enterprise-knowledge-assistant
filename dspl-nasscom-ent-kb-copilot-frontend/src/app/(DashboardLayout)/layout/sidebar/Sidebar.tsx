import { useMediaQuery, Box, Drawer } from "@mui/material";
import SidebarItems from "./SidebarItems";



interface ItemType {
  isMobileSidebarOpen: boolean;
  onSidebarClose: (event: React.MouseEvent<HTMLElement>) => void;
  isSidebarOpen: boolean;
}

const MSidebar = ({
  isMobileSidebarOpen,
  onSidebarClose,
  isSidebarOpen,
}: ItemType) => {
  const lgUp = useMediaQuery((theme: any) => theme.breakpoints.up("lg"));

  const sidebarWidth = "270px";

  const scrollbarStyles = {
    '&::-webkit-scrollbar': { width: '6px' },
    '&::-webkit-scrollbar-track': { background: 'transparent' },
    '&::-webkit-scrollbar-thumb': {
      backgroundColor: '#D1DAE8',
      borderRadius: '8px',
      '&:hover': { backgroundColor: '#8FA3BF' },
    },
  };


  if (lgUp) {
    return (
      <Box
        sx={{
          width: isSidebarOpen ? sidebarWidth : 0,
          flexShrink: 0,
          transition: (theme) => theme.transitions.create("width", {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        }}
      >
        {/* ------------------------------------------- */}
        {/* Sidebar for desktop */ }
        {/* ------------------------------------------- */}
        <Drawer
          anchor="left"
          open={isSidebarOpen}
          variant="persistent" // Changed from permanent to persistent to work better with open/close
          slotProps={{
            paper: {
              sx: {
                boxSizing: "border-box",
                ...scrollbarStyles,
                width: sidebarWidth,
                height: "100%",
                overflow: "hidden",
                borderRight: (theme) => `1px solid ${theme.palette.divider}`,
              },
            }
          }}
        >
          {/* ------------------------------------------- */}
          {/* Sidebar Box */}
          {/* ------------------------------------------- */}
          <Box
            sx={{
              height: "100%",
            }}
          >

            <Box sx={{ height: "100%" }}>
              {/* ------------------------------------------- */}
              {/* Sidebar Items */}
              {/* ------------------------------------------- */}
              <SidebarItems />
            </Box>
          </Box>
        </Drawer>
      </Box >
    );
  }

  return (
    <Drawer
      anchor="left"
      open={isMobileSidebarOpen}
      onClose={onSidebarClose}
      variant="temporary"

      slotProps={{
        paper: {
          sx: {
            boxShadow: (theme) => theme.shadows[8],
            ...scrollbarStyles,
            height: "100%",
            overflow: "hidden",
          },
        }
      }}
    >
      {/* ------------------------------------------- */}
      {/* Sidebar Box */}
      {/* ------------------------------------------- */}
      <Box sx={{ height: "100%" }}>
        {/* ------------------------------------------- */}
        {/* Sidebar Items */}
        {/* ------------------------------------------- */}
        <SidebarItems />
      </Box>
      {/* ------------------------------------------- */}
      {/* Sidebar For Mobile */}
      {/* ------------------------------------------- */}
    </Drawer>
  );
};

export default MSidebar;





