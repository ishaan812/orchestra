import { useState, useCallback, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

export interface SshConnection {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  auth_type: string;
  private_key_path: string | null;
  use_agent: boolean;
  last_connected_at: string | null;
}

export interface SshTestResult {
  success: boolean;
  message: string;
  latency_ms: number | null;
}

export function useSshConnections() {
  const [connections, setConnections] = useState<SshConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, SshTestResult>>({});

  const fetchConnections = useCallback(async () => {
    try {
      const result = await invoke<SshConnection[]>("ssh_list_connections");
      setConnections(result);
    } catch (e) {
      console.error("Failed to fetch SSH connections:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  const addConnection = useCallback(
    async (params: {
      name: string;
      host: string;
      port?: number;
      username: string;
      auth_type?: string;
      private_key_path?: string;
      use_agent?: boolean;
    }) => {
      const conn = await invoke<SshConnection>("ssh_add_connection", { params });
      setConnections((prev) => [...prev, conn]);
      return conn;
    },
    []
  );

  const removeConnection = useCallback(
    async (connectionId: string) => {
      await invoke("ssh_remove_connection", { connectionId });
      setConnections((prev) => prev.filter((c) => c.id !== connectionId));
      setTestResults((prev) => {
        const next = { ...prev };
        delete next[connectionId];
        return next;
      });
    },
    []
  );

  const testConnection = useCallback(async (connectionId: string) => {
    setTestingId(connectionId);
    try {
      const result = await invoke<SshTestResult>("ssh_test_connection", { connectionId });
      setTestResults((prev) => ({ ...prev, [connectionId]: result }));
      if (result.success) {
        // Refresh to get updated last_connected_at
        await invoke<SshConnection[]>("ssh_list_connections").then(setConnections);
      }
      return result;
    } finally {
      setTestingId(null);
    }
  }, []);

  return {
    connections,
    loading,
    testingId,
    testResults,
    addConnection,
    removeConnection,
    testConnection,
    refreshConnections: fetchConnections,
  };
}
