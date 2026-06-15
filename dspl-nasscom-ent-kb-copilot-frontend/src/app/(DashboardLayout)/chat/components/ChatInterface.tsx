"use client";

import React, { useState, useRef, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import Image from "next/image";
import {
  Box,
  TextField,
  IconButton,
  Typography,
  Paper,
  Avatar,
  Button,
  useTheme,
  InputAdornment,
  Container,
  Stack,
  CircularProgress,
  alpha,
} from "@mui/material";
import {
  IconPlus,
  IconSparkles,
  IconFileDescription,
  IconArrowUp,
  IconUser,
  IconRobot,
} from "@tabler/icons-react";
import { usePathname } from "next/navigation";
import { queryAssistant, Source } from "../actions";
import { useAuth } from "../../../../../contexts/AuthContext";
import { useChatContext } from "../../../../../contexts/ChatContext";
import { openSecureDocument } from "@/utils/documentUtils";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";

interface Message {
  id: string;
  text: string;
  sender: "user" | "ai";
  timestamp: Date;
  sources?: Source[];
}

const StyledMarkdown = ({ content, sources }: { content: string; sources?: Source[] }) => {
  const theme = useTheme();

  const processedContent = React.useMemo(() => {
    if (!sources || sources.length === 0) return content;
    const regex = /\[Source:\s*([^,\]]+),\s*Page\s*(\d+)\]/g;
    return content.replace(regex, (match, sourceName, pageNum) => {
      const sourceObj = sources.find(
        (s) =>
          s.source.toLowerCase().includes(sourceName.toLowerCase()) ||
          sourceName.toLowerCase().includes(s.source.toLowerCase())
      );
      if (sourceObj) {
        return `[${match}](citation://${encodeURIComponent(sourceObj.url)})`;
      }
      return match;
    });
  }, [content, sources]);

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkBreaks]}
      components={{
        p: ({ children }) => (
          <Typography
            variant="body1"
            component="p"
            sx={{
              mb: 1.5,
              "&:last-child": { mb: 0 },
              lineHeight: 1.6,
              fontSize: "16px",
            }}
          >
            {children}
          </Typography>
        ),
        a: ({ href, children }) => {
          if (href?.startsWith("citation://")) {
            const url = decodeURIComponent(href.substring(11));
            return (
              <Box
                component="span"
                onClick={(e) => {
                  e.preventDefault();
                  openSecureDocument(url);
                }}
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  color: "primary.main",
                  cursor: "pointer",
                  fontWeight: 600,
                  bgcolor: alpha(theme.palette.primary.main, 0.08),
                  px: 1,
                  py: 0.2,
                  mx: 0.2,
                  borderRadius: "6px",
                  transition: "all 0.2s",
                  verticalAlign: "baseline",
                  fontSize: "0.85em",
                  lineHeight: 1.2,
                  "&:hover": {
                    bgcolor: alpha(theme.palette.primary.main, 0.15),
                    transform: "translateY(-1px)",
                    textDecoration: "underline",
                  },
                }}
              >
                {children}
              </Box>
            );
          }
          return (
            <a
              href={href}
              style={{ color: theme.palette.primary.main }}
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          );
        },
        ul: ({ children }) => (
          <Box component="ul" sx={{ pl: 3, mb: 1.5 }}>
            {children}
          </Box>
        ),
        ol: ({ children }) => (
          <Box component="ol" sx={{ pl: 3, mb: 1.5 }}>
            {children}
          </Box>
        ),
        li: ({ children }) => (
          <Box component="li" sx={{ mb: 0.5 }}>
            <Typography variant="body1" component="span" sx={{ fontSize: "16px" }}>
              {children}
            </Typography>
          </Box>
        ),
        code: ({ children }) => (
          <Box
            component="code"
            sx={{
              bgcolor: alpha(theme.palette.primary.main, 0.05),
              px: 0.5,
              borderRadius: "4px",
              fontFamily: "monospace",
            }}
          >
            {children}
          </Box>
        ),
        strong: ({ children }) => (
          <Box component="strong" sx={{ fontWeight: 700 }}>
            {children}
          </Box>
        ),
      }}
    >
      {processedContent}
    </ReactMarkdown>
  );
};

const ChatInterface = () => {
  const { role, currentUser } = useAuth();
  const { newChatTrigger } = useChatContext();
  const pathname = usePathname();
  const theme = useTheme();
  const isUser = role === "User";
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState(uuidv4());
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Listen for New Chat trigger from the header (for User role)
  useEffect(() => {
    if (newChatTrigger > 0) {
      setMessages([]);
      setInput("");
      setSessionId(uuidv4());
    }
  }, [newChatTrigger]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    try {
      const data = await queryAssistant(input, sessionId, currentUser.email);

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.answer.trim() !== "" ? data.answer : "I'm unable to provide answer to your query. Please try again later.",
        sender: "ai",
        timestamp: new Date(),
        sources: data.sources,
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error("Error fetching AI response:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setSessionId(uuidv4());
  };


  return (
    <Box
      sx={{
        height: pathname === "/chat" ? "calc(100vh - 110px)" : "auto",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        background: "transparent",
      }}
    >
      {/* Top Controls - only show button for admin when there are messages */}
      {!isUser && messages.length > 0 && (
        <Box
          sx={{
            width: "100%",
            maxWidth: "900px",
            mx: "auto",
            px: 2,
            pt: 3,
            pb: 1,
          }}
        >
          <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
            <Button
              variant="outlined"
              color="primary"
              startIcon={<IconPlus size={18} />}
              onClick={handleNewChat}
              sx={{
                borderRadius: "12px",
                textTransform: "none",
                px: 2.5,
                py: 0.8,
                fontWeight: 600,
                borderWidth: "1.5px",
              }}
            >
              New Chat
            </Button>
          </Box>
        </Box>
      )}

      {/* Message Area */}
      <Box
        sx={{
          flexGrow: 1,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          mb: 2,
        }}
      >
        <Box
          sx={{
            width: "100%",
            maxWidth: "850px",
            mx: "auto",
            p: 3,
            height: "100%",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {messages.length === 0 ? (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                flexGrow: 1,
                textAlign: "center",
                py: 10,
                animation: "fadeInUp 0.6s ease",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  mb: 4,
                }}
              >
                <Image
                  src="/images/logos/devangles-logo.png"
                  alt="logo"
                  height={50}
                  width={50}
                  priority
                />
              </Box>
              <Typography
                variant="h3"
                fontWeight={800}
                sx={{ color: "#1e293b", mb: 2, letterSpacing: "-0.02em" }}
              >
                Hello! How can I help you?
              </Typography>
              <Typography
                variant="h6"
                color="textSecondary"
                sx={{
                  maxWidth: "500px",
                  fontWeight: 400,
                  lineHeight: 1.6,
                  opacity: 0.8,
                }}
              >
                Ask me about HR policies, training sessions, or anything else
                you need help with.
              </Typography>
            </Box>
          ) : (
            <Box sx={{ width: "100%", px: { xs: 1, md: 4 } }}>
              <Stack spacing={3}>
                {messages.map((message) => (
                  <Box
                    key={message.id}
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems:
                        message.sender === "user" ? "flex-end" : "flex-start",
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        gap: 2,
                        maxWidth: "90%",
                        flexDirection:
                          message.sender === "user" ? "row-reverse" : "row",
                      }}
                    >
                      {/* <Avatar
                      sx={{
                        bgcolor: message.sender === "user" 
                          ? theme.palette.primary.main 
                          : theme.palette.secondary.main,
                        width: 40,
                        height: 40,
                        boxShadow: 2
                      }}
                    >
                      {message.sender === "user" ? <IconUser size={24} /> : <IconRobot size={24} />}
                    </Avatar> */}
                      <Paper
                        elevation={0}
                        sx={{
                          p: message.sender === "user" ? 1.5 : 2.5,
                          px: 2.5,
                          borderRadius: "20px",
                          bgcolor:
                            message.sender === "user"
                              ? alpha(theme.palette.primary.main, 0.08)
                              : "#fff",
                          color: "text.primary",
                          border:
                            message.sender === "user"
                              ? "none"
                              : `1px solid ${alpha(theme.palette.primary.main, 0.08)}`,
                          boxShadow:
                            message.sender === "user"
                              ? "none"
                              : "0 4px 20px rgba(0,0,0,0.03)",
                          maxWidth: "100%",
                          position: "relative",
                        }}
                      >
                          <StyledMarkdown
                            content={message.text}
                            sources={message.sources}
                          />

                        {message.sender === "ai" &&
                          message.sources &&
                          message.sources.length > 0 && (
                            <Box
                              sx={{
                                mt: 2,
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 2,
                              }}
                            >
                              {message.sources.map((src, index) => (
                                <Box
                                  key={index}
                                  component="div"
                                  onClick={() => openSecureDocument(src.url)}
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 2,
                                    p: 2,
                                    minWidth: "220px",
                                    maxWidth: "300px",
                                    borderRadius: "12px",
                                    bgcolor: "rgba(255, 255, 255, 0.5)",
                                    cursor: "pointer",
                                    border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                                    backdropFilter: "blur(4px)",
                                    transition: "all 0.2s",
                                    "&:hover": {
                                      bgcolor: "#fff",
                                      borderColor: theme.palette.primary.main,
                                      transform: "translateY(-2px)",
                                      boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                                    },
                                  }}
                                >
                                  <Box
                                    sx={{
                                      width: 28,
                                      height: 28,
                                      borderRadius: "6px",
                                      bgcolor: "primary.main",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      color: "#fff",
                                    }}
                                  >
                                    <IconFileDescription size={16} />
                                  </Box>
                                  <Box sx={{ minWidth: 0 }}>
                                    <Typography
                                      variant="caption"
                                      fontWeight={600}
                                      color="primary"
                                      sx={{
                                        display: "block",
                                        whiteSpace: "nowrap",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        textDecoration: "underline",
                                        cursor: "pointer",
                                        fontSize: "0.75rem",
                                      }}
                                    >
                                      {src.source.length > 35
                                        ? `${src.source.substring(0, 35)}...`
                                        : src.source}
                                    </Typography>
                                    {(() => {
                                      const labelParts = [
                                        src.page != null && `Page No : ${src.page}`,
                                        src.row != null && `Row No: ${src.row}`,
                                        src.line != null && `Line No: ${src.line}`,
                                        src.section != null && src.section !== "" && `Section: ${src.section}`,
                                        src.doc_type != null && src.doc_type !== "" && `Document type: ${src.doc_type}`
                                      ].filter(Boolean);

                                      // 2. Only render if we actually have formatted metadata to display
                                      if (labelParts.length === 0) return null;

                                      return (
                                        <Typography
                                          variant="caption"
                                          color="text.secondary"
                                          sx={{
                                            fontSize: "0.65rem",
                                            display: "block",
                                          }}
                                        >
                                          {labelParts.join(" • ")}
                                        </Typography>
                                      );
                                    })()}
                                  </Box>
                                </Box>
                              ))}
                            </Box>
                          )}
                      </Paper>
                    </Box>
                  </Box>
                ))}
                {isLoading && (
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      animation: "fadeIn 0.3s ease",
                      mt: 1,
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        gap: 1.5,
                        alignItems: "center",
                        p: 2,
                        px: 2.5,
                        borderRadius: "20px",
                        bgcolor: "transparent",
                        border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                        width: "fit-content",
                      }}
                    >
                      <Box sx={{ display: "flex", gap: "4px" }}>
                        <Box
                          sx={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            bgcolor: "primary.main",
                            animation: "pulse 1.4s infinite ease-in-out",
                          }}
                        />
                        <Box
                          sx={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            bgcolor: "primary.main",
                            animation: "pulse 1.4s infinite ease-in-out",
                            animationDelay: "0.2s",
                          }}
                        />
                        <Box
                          sx={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            bgcolor: "primary.main",
                            animation: "pulse 1.4s infinite ease-in-out",
                            animationDelay: "0.4s",
                          }}
                        />
                      </Box>
                      <Typography
                        variant="body2"
                        color="textSecondary"
                        sx={{ fontWeight: 500, letterSpacing: "0.01em" }}
                      >
                        Thinking...
                      </Typography>
                    </Box>
                  </Box>
                )}
              </Stack>
            </Box>
          )}
        </Box>
        <div ref={messagesEndRef} />
      </Box>

      {/* Input Area */}
      <Box
        sx={{
          width: "100%",
          maxWidth: "850px",
          mx: "auto",
          px: { xs: 1, md: 3 },
          pb: 0,
          mb: 1,
        }}
      >
        <Paper
          elevation={0}
          sx={{
            p: "8px 16px",
            display: "flex",
            alignItems: "center",
            borderRadius: "20px",
            bgcolor: "transparent",
            border: `1px solid #E0E0E0`,
            transition: "border-color 0.2s",
            "&:focus-within": {
              borderColor: "primary.main",
            },
          }}
        >
          <TextField
            fullWidth
            multiline
            maxRows={5}
            placeholder="Type your message here..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            variant="standard"
            InputProps={{
              disableUnderline: true,
              sx: {
                ml: 2,
                flex: 1,
                py: 1,
                fontSize: "16px",
                fontWeight: 500,
                // Ensure scrollbar appears only after maxRows
                "& textarea": {
                  overflowY: "auto !important",
                  "&::-webkit-scrollbar": {
                    width: "6px",
                  },
                  "&::-webkit-scrollbar-thumb": {
                    backgroundColor: "#e0e0e0",
                    borderRadius: "10px",
                  },
                },
              },
            }}
          />
          <IconButton
            sx={{
              p: "6px",
              bgcolor: input.trim() ? "primary.main" : "#E0E0E0",
              color: "white",
              alignSelf: "flex-end",
              mb: "4px",
              "&:hover": {
                bgcolor: input.trim() ? "primary.800" : "#E0E0E0",
              },
              transition: "all 0.2s",
            }}
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
          >
            {isLoading ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              <IconArrowUp size={20} stroke={3} />
            )}
          </IconButton>
        </Paper>
      </Box>
      <Box component="style">
        {`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes pulse {
            0%, 80%, 100% { transform: scale(0); opacity: 0.3; }
            40% { transform: scale(1); opacity: 1; }
          }
        `}
      </Box>
    </Box>
  );
};

export default ChatInterface;
