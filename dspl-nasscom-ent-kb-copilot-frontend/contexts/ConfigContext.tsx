"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";

export interface RetrievalConfig {
  confidence_threshold: number;
  top_n_rerank: number;
  top_k_retrieve: number;
  pii_masking_enabled: boolean;
}

export interface ConfigResponse {
  config: RetrievalConfig;
  source: string;
}

interface ConfigContextType {
  config: RetrievalConfig | null;
  configSource: string;
  loadingConfig: boolean;
  savingConfig: boolean;
  error: string | null;
  fetchConfig: () => Promise<void>;
  updateConfig: (updates: Partial<RetrievalConfig>) => Promise<void>;
  resetConfig: () => Promise<void>;
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

export function useConfigContext() {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error("useConfigContext must be used within a ConfigProvider");
  }
  return context;
}



export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<RetrievalConfig | null>(null);
  const [configSource, setConfigSource] = useState<string>("");
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isFetchingRef = useRef(false);
  const hasFetchedRef = useRef(false);

  const fetchConfig = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setLoadingConfig(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/config`, {
        headers: { "accept": "application/json" },
      });
      if (!res.ok) throw new Error(`Failed to fetch config: ${res.status}`);
      const data: ConfigResponse = await res.json();
      setConfig(data.config);
      setConfigSource(data.source);
    } catch (err: any) {
      setError(err.message || "Failed to load configuration");
    } finally {
      setLoadingConfig(false);
      isFetchingRef.current = false;
    }
  }, []);

  const updateConfig = useCallback(async (updates: Partial<RetrievalConfig>) => {
    setSavingConfig(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/config`, {
        method: "PATCH",
        headers: {
          "accept": "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error(`Failed to update config: ${res.status}`);
      const data: ConfigResponse = await res.json();
      setConfig(data.config);
      setConfigSource(data.source);
    } catch (err: any) {
      setError(err.message || "Failed to update configuration");
      throw err;
    } finally {
      setSavingConfig(false);
    }
  }, []);

  const resetConfig = useCallback(async () => {
    setSavingConfig(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/config/reset`, {
        method: "DELETE",
        headers: { "accept": "application/json" },
      });
      if (!res.ok) throw new Error(`Failed to reset config: ${res.status}`);
      const data: ConfigResponse = await res.json();
      setConfig(data.config);
      setConfigSource(data.source);
    } catch (err: any) {
      setError(err.message || "Failed to reset configuration");
      throw err;
    } finally {
      setSavingConfig(false);
    }
  }, []);

  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    fetchConfig();
  }, []);

  const value: ConfigContextType = {
    config,
    configSource,
    loadingConfig,
    savingConfig,
    error,
    fetchConfig,
    updateConfig,
    resetConfig,
  };

  return (
    <ConfigContext.Provider value={value}>
      {children}
    </ConfigContext.Provider>
  );
}
