"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

interface ChatContextType {
  newChatTrigger: number;
  triggerNewChat: () => void;
}

const ChatContext = createContext<ChatContextType>({
  newChatTrigger: 0,
  triggerNewChat: () => {},
});

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [newChatTrigger, setNewChatTrigger] = useState(0);

  const triggerNewChat = useCallback(() => {
    setNewChatTrigger((prev) => prev + 1);
  }, []);

  return (
    <ChatContext.Provider value={{ newChatTrigger, triggerNewChat }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChatContext() {
  return useContext(ChatContext);
}
