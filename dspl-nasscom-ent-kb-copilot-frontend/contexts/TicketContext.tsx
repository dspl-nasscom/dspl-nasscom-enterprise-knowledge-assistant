"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "./AuthContext";

export type TicketStatus = "open" | "in_progress" | "resolved" | "closed";

export interface TicketComment {
  author: string;
  text: string;
  created_at?: string;
}

export interface Ticket {
  ticket_id: string;
  title: string;
  description: string;
  answer_attempted: string;
  confidence_score: number;
  status: TicketStatus;
  assigned_to: string;
  reporter_email: string;
  created_at: string;
  updated_at: string;
  comments: TicketComment[];
}

export interface TicketUpdatePayload {
  title?: string;
  description?: string;
  answer_attempted?: string;
  status?: string;
  assigned_to?: string;
}

export interface CommentPayload {
  author: string;
  text: string;
}

interface TicketContextType {
  tickets: Ticket[];
  total: number;
  selectedTicket: Ticket | null;
  loadingTickets: boolean;
  savingTicket: boolean;
  error: string | null;
  statusFilter: TicketStatus | "";
  assignedToFilter: string;
  reportedToFilter: string;
  page: number;
  rowsPerPage: number;
  setStatusFilter: (val: TicketStatus | "") => void;
  setAssignedToFilter: (val: string) => void;
  setReportedToFilter: (val: string) => void;
  setPage: (val: number) => void;
  setRowsPerPage: (val: number) => void;
  fetchTickets: (opts?: { status?: TicketStatus | ""; assigned_to?: string; reporter_email?: string; limit?: number; offset?: number }) => Promise<void>;
  fetchTicket: (id: string) => Promise<void>;
  updateTicket: (id: string, payload: TicketUpdatePayload) => Promise<void>;
  addComment: (id: string, payload: CommentPayload) => Promise<void>;
  setSelectedTicket: (t: Ticket | null) => void;
}

const TicketContext = createContext<TicketContextType | undefined>(undefined);

export function useTicketContext() {
  const context = useContext(TicketContext);
  if (!context) {
    throw new Error("useTicketContext must be used within a TicketProvider");
  }
  return context;
}



export function TicketProvider({
  children,
  reporterEmail,
  assignedToEmail,
}: {
  children: React.ReactNode;
  reporterEmail?: string;
  assignedToEmail?: string;
}) {
  const { currentUser } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [total, setTotal] = useState(0);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [savingTicket, setSavingTicket] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "">("");
  const [assignedToFilter, setAssignedToFilter] = useState(assignedToEmail ?? "");
  const [reportedToFilter, setReportedToFilter] = useState(reporterEmail ?? "");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [ticketCache, setTicketCache] = useState<Record<string, { tickets: Ticket[], total: number }>>({});
  
  const isFetchingRef = useRef(false);
  const lastFetchParamsRef = useRef<string | null>(null);

  const fetchTickets = useCallback(async (
    opts: { status?: TicketStatus | ""; assigned_to?: string; reported_to?: string; limit?: number; offset?: number } = {}
  ) => {
    // Generate cache key
    const status = opts.status ?? statusFilter;
    const assignedTo = opts.assigned_to ?? assignedToFilter;
    const reportedTo = opts.reported_to ?? reportedToFilter;
    const limit = opts.limit ?? rowsPerPage;
    const offset = opts.offset ?? (page * rowsPerPage);
    const cacheKey = `${status}-${assignedTo}-${reportedTo}-${limit}-${offset}`;

    // Check cache
    if (ticketCache[cacheKey]) {
      setTickets(ticketCache[cacheKey].tickets);
      setTotal(ticketCache[cacheKey].total);
      return;
    }

    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setLoadingTickets(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (assignedTo) params.set("assigned_to", assignedTo);
      if (reportedTo) params.set("reporter_email", reportedTo);
      params.set("limit", String(limit));
      params.set("offset", String(offset));

      const paramStr = params.toString();
      const url = `/api/admin/tickets${paramStr ? "?" + paramStr : ""}`;
      const res = await fetch(url, { headers: { "accept": "application/json" } });
      if (!res.ok) throw new Error(`Failed to fetch tickets: ${res.status}`);
      const data = await res.json();
      const fetchedTickets = data.tickets ?? [];
      const fetchedTotal = data.total ?? 0;
      
      setTickets(fetchedTickets);
      setTotal(fetchedTotal);
      
      // Update cache
      setTicketCache(prev => ({ ...prev, [cacheKey]: { tickets: fetchedTickets, total: fetchedTotal } }));
      
      lastFetchParamsRef.current = paramStr;
    } catch (err: any) {
      setError(err.message || "Failed to load tickets");
    } finally {
      setLoadingTickets(false);
      isFetchingRef.current = false;
    }
  }, [statusFilter, assignedToFilter, reportedToFilter, currentUser, rowsPerPage, page, ticketCache]);

  const fetchTicket = useCallback(async (id: string) => {
    setLoadingTickets(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/tickets/${id}`, {
        headers: { "accept": "application/json" },
      });
      if (!res.ok) throw new Error(`Failed to fetch ticket: ${res.status}`);
      const data: Ticket = await res.json();
      setSelectedTicket(data);
    } catch (err: any) {
      setError(err.message || "Failed to load ticket");
    } finally {
      setLoadingTickets(false);
    }
  }, []);

  const updateTicket = useCallback(async (id: string, payload: TicketUpdatePayload) => {
    setSavingTicket(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/tickets/${id}`, {
        method: "PATCH",
        headers: {
          "accept": "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Failed to update ticket: ${res.status}`);
      const updated: Ticket = await res.json();
      setTickets((prev) => prev.map((t) => (t.ticket_id === id ? updated : t)));
      if (selectedTicket?.ticket_id === id) setSelectedTicket(updated);
      setTicketCache({}); // Invalidate cache on update
    } catch (err: any) {
      setError(err.message || "Failed to update ticket");
      throw err;
    } finally {
      setSavingTicket(false);
    }
  }, [selectedTicket]);

  const addComment = useCallback(async (id: string, payload: CommentPayload) => {
    setSavingTicket(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/tickets/${id}/comments`, {
        method: "POST",
        headers: {
          "accept": "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Failed to add comment: ${res.status}`);
      const updated: Ticket = await res.json();
      setTickets((prev) => prev.map((t) => (t.ticket_id === id ? updated : t)));
      if (selectedTicket?.ticket_id === id) setSelectedTicket(updated);
      setTicketCache({}); // Invalidate cache on update
    } catch (err: any) {
      setError(err.message || "Failed to add comment");
      throw err;
    } finally {
      setSavingTicket(false);
    }
  }, [selectedTicket]);

  // Consolidate initial fetch and filter changes into one effect
  useEffect(() => {
    fetchTickets();
  }, [statusFilter, assignedToFilter, reportedToFilter, page, rowsPerPage, fetchTickets]);

  const value: TicketContextType = {
    tickets,
    total,
    selectedTicket,
    loadingTickets,
    savingTicket,
    error,
    statusFilter,
    assignedToFilter,
    reportedToFilter,
    page,
    rowsPerPage,
    setStatusFilter,
    setAssignedToFilter,
    setReportedToFilter,
    setPage,
    setRowsPerPage,
    fetchTickets,
    fetchTicket,
    updateTicket,
    addComment,
    setSelectedTicket,
  };

  return (
    <TicketContext.Provider value={value}>
      {children}
    </TicketContext.Provider>
  );
}
