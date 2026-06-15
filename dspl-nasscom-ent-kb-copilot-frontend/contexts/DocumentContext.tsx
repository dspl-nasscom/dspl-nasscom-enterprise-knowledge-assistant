"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

export interface FileIngestResult {
  file: string;
  collection: string;
  chunk_count: number;
  sha256: string;
  storage_url: string;
  skipped: boolean;
  skip_reason: string | null;
  error: string | null;
}

export interface IngestResponse {
  job_id: string;
  status: string;
  total_files: number;
  total_chunks: number;
  results: FileIngestResult[];
  message: string;
}

export interface Document {
  id: number;
  filename: string;
  doc_type: string;
  storage_url: string;
  ingested_at: string;
}

export interface DocumentListResponse {
  limit: number;
  offset: number;
  total: number;
  documents: Document[];
}

interface DocumentContextType {
  ingesting: boolean;
  fetching: boolean;
  error: string | null;
  lastResponse: IngestResponse | null;
  ingestDocuments: (files: File[], config?: { chunk_size?: number; chunk_overlap?: number }) => Promise<IngestResponse>;
  fetchDocuments: (limit?: number, offset?: number) => Promise<DocumentListResponse>;
}

const DocumentContext = createContext<DocumentContextType | undefined>(undefined);

export function DocumentProvider({ children }: { children: ReactNode }) {
  const [ingesting, setIngesting] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResponse, setLastResponse] = useState<IngestResponse | null>(null);

  const ingestDocuments = async (files: File[], config: { chunk_size?: number; chunk_overlap?: number } = {}) => {
    setIngesting(true);
    setError(null);

    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    
    // Use the values from config if provided, else defaults
    formData.append("chunk_size", (config.chunk_size ?? 512).toString());
    formData.append("chunk_overlap", (config.chunk_overlap ?? 64).toString());

    try {
      const response = await fetch(`/api/ingest`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Ingest failed with status: ${response.status}`);
      }

      const data: IngestResponse = await response.json();
      setLastResponse(data);
      return data;
    } catch (err: any) {
      const msg = err.message || "An error occurred during ingestion";
      setError(msg);
      throw err;
    } finally {
      setIngesting(false);
    }
  };

  const fetchDocuments = async (limit: number = 50, offset: number = 0) => {
    setFetching(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/documents?limit=${limit}&offset=${offset}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch documents: ${response.status}`);
      }
      const data: DocumentListResponse = await response.json();
      return data;
    } catch (err: any) {
      const msg = err.message || "Error fetching documents";
      setError(msg);
      throw err;
    } finally {
      setFetching(false);
    }
  };

  return (
    <DocumentContext.Provider value={{ ingesting, fetching, error, lastResponse, ingestDocuments, fetchDocuments }}>
      {children}
    </DocumentContext.Provider>
  );
}

export function useDocumentContext() {
  const context = useContext(DocumentContext);
  if (context === undefined) {
    throw new Error("useDocumentContext must be used within a DocumentProvider");
  }
  return context;
}
