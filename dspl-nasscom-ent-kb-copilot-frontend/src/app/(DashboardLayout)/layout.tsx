"use client";
import { styled, Container, Box } from "@mui/material";
import React, { useState, useEffect } from "react";
import Header from "@/app/(DashboardLayout)/layout/header/Header";
import Sidebar from "@/app/(DashboardLayout)/layout/sidebar/Sidebar";
import ProtectedLayout from "./ProtectedLayout";
import { usePathname } from "next/navigation";
import { UserProvider } from "../../../contexts/UserContext";
import { useAuth } from "../../../contexts/AuthContext";
import { ChatProvider } from "../../../contexts/ChatContext";
const MainWrapper = styled("div")(() => ({
  display: "flex",
  minHeight: "100vh",
  width: "100%",
}));

const PageWrapper = styled("div")(() => ({
  display: "flex",
  flexGrow: 1,
  paddingBottom: "60px",
  flexDirection: "column",
  zIndex: 1,
  backgroundColor: "transparent",
}));

interface Props {
  children: React.ReactNode;
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ChatProvider>
      <ProtectedLayout>
        <UserProvider>
          <LayoutInner>{children}</LayoutInner>
        </UserProvider>
      </ProtectedLayout>
    </ChatProvider>
  );
}

function LayoutInner({ children }: { children: React.ReactNode }) {
  const { role } = useAuth();
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const pathname = usePathname();
  const [isHydrated, setIsHydrated] = useState(false);
  
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const isFullWidthPage = pathname === "/chat" || pathname === "/users" || pathname === "/tickets" || pathname === "/config" || pathname === "/documents" || pathname === "/my-tickets";
  if (!isHydrated) return null;

  return (
    <MainWrapper className="mainwrapper">
          {/* ------------------------------------------- */}
          {/* Sidebar */}
          {/* ------------------------------------------- */}
          <Sidebar
            isSidebarOpen={isSidebarOpen}
            isMobileSidebarOpen={isMobileSidebarOpen}
            onSidebarClose={() => setMobileSidebarOpen(false)}
          />

          {/* ------------------------------------------- */}
          {/* Main Wrapper */}
          {/* ------------------------------------------- */}
          <PageWrapper 
            className="page-wrapper" 
            style={{ paddingBottom: pathname === "/chat" ? 0 : "60px" }}
          >
            {/* ------------------------------------------- */}
            {/* Header */}
            {/* ------------------------------------------- */}
            <Header 
              toggleMobileSidebar={() => setMobileSidebarOpen(true)} 
              toggleSidebar={() => setSidebarOpen(!isSidebarOpen)} 
              showToggle={true}              
               
            />
            {/* ------------------------------------------- */}
            {/* PageContent */}
            {/* ------------------------------------------- */}
            <Container
              maxWidth={false}
              sx={{
                paddingTop: "20px",
                maxWidth: isFullWidthPage ? "100%" : "1200px",
                px: isFullWidthPage ? { xs: 2, sm: 3, md: 5 } : { xs: 2, sm: 3 },
                // Custom gradient for chat route
                minHeight: pathname === "/chat" ? "calc(100vh - 64px)" : "calc(100vh - 100px)",
                background: pathname === "/chat" 
                  ? "linear-gradient(180deg, #FFFFFF 0%, #EEF2FF 100%)" 
                  : "transparent",
                display: "flex",
                flexDirection: "column",
                pb: pathname === "/chat" ? 0 : 3
              }}
            >
              {/* ------------------------------------------- */}
              {/* Page Route */}
              {/* ------------------------------------------- */}
              <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>{children}</Box>
            </Container>
          </PageWrapper>
        </MainWrapper>
  );
}
