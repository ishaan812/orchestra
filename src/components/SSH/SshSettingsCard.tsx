import { useState, useCallback } from "react";
import { useSshConnections } from "../../hooks/useSshConnections";
import { SshConnectionList } from "./SshConnectionList";
import { SshConnectionForm } from "./SshConnectionForm";

export function SshSettingsCard() {
  const {
    connections,
    loading,
    testingId,
    testResults,
    addConnection,
    removeConnection,
    testConnection,
  } = useSshConnections();

  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleAdd = useCallback(
    async (params: Parameters<typeof addConnection>[0]) => {
      setSubmitting(true);
      try {
        await addConnection(params);
        setShowForm(false);
      } finally {
        setSubmitting(false);
      }
    },
    [addConnection]
  );

  const handleRemove = useCallback(
    async (id: string) => {
      if (!confirm("Remove this SSH connection?")) return;
      await removeConnection(id);
    },
    [removeConnection]
  );

  if (loading) {
    return (
      <div style={{ color: "var(--text-tertiary)", fontSize: "var(--font-size-sm)", padding: "var(--space-4)" }}>
        Loading SSH connections...
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "var(--space-3)",
        }}
      >
        <h2
          style={{
            color: "var(--text-primary)",
            fontSize: "var(--font-size-md)",
            fontWeight: 600,
            margin: 0,
          }}
        >
          SSH Connections
        </h2>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            style={{
              padding: "var(--space-1) var(--space-3)",
              background: "var(--accent-primary)",
              border: "none",
              borderRadius: "var(--radius-sm)",
              color: "var(--bg-base)",
              fontSize: "var(--font-size-xs)",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            + Add Connection
          </button>
        )}
      </div>

      {showForm && (
        <div
          style={{
            padding: "var(--space-3)",
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            marginBottom: "var(--space-3)",
          }}
        >
          <SshConnectionForm
            onSubmit={handleAdd}
            onCancel={() => setShowForm(false)}
            submitting={submitting}
          />
        </div>
      )}

      <SshConnectionList
        connections={connections}
        testingId={testingId}
        testResults={testResults}
        onTest={testConnection}
        onRemove={handleRemove}
      />

      <div
        style={{
          marginTop: "var(--space-3)",
          padding: "var(--space-2) var(--space-3)",
          background: "var(--bg-hover)",
          borderRadius: "var(--radius-sm)",
          fontSize: "var(--font-size-xs)",
          color: "var(--text-tertiary)",
          lineHeight: 1.5,
        }}
      >
        SSH connections use your system's <code style={{ fontFamily: "var(--font-mono)" }}>ssh</code> binary
        and respect your <code style={{ fontFamily: "var(--font-mono)" }}>~/.ssh/config</code>.
      </div>
    </div>
  );
}
