"use client";

import React from "react";
import PageContainer from "@/app/(DashboardLayout)/components/container/PageContainer";
import DashboardCard from "@/app/(DashboardLayout)/components/shared/DashboardCard";
import ChatInterface from "./components/ChatInterface";

const ChatPage = () => {
  return (
    <PageContainer title="Chat" description="AI Chat Interface">      
        <ChatInterface />      
    </PageContainer>
  );
};

export default ChatPage;
