import { SshConnection, SshTestResult } from "../../hooks/useSshConnections";
import { ConnectionStatusBadge } from "./ConnectionStatusBadge";
import { SshConnectionTestButton } from "./SshConnectionTestButton";

interface SshConnectionListProps {
  connections: SshConnection[];
  testingId: string | null;
  testResults: Record<string, SshTestResult>;
  onTest: (id: string) => void;
  onRemove: (id: string) => void;
  onSelect?: (conn: SshConnection) => void;
}

export function SshConnectionList({
  connections,
  testingId,
  testResults,
  onTest,
  onRemove,
  onSelect,
}: SshConnectionListProps) {
  if (connections.length === 0) {
    return (
      <div
        style={{
          padding: "var(--space-6)",
          textAlign: "center",
          color: "var(--text-tertiary)",
          fontSize: "var(--font-size-sm)",
        }}
      >
        No SSH connections configured.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
      {connections.map((conn) => {
        const result = testResults[conn.id];
        const isTesting = testingId === conn.id;

        return (
          <div
            key={conn.id}
            onClick={() => onSelect?.(conn)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-3)",
              padding: "var(--space-3)",
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              cursor: onSelect ? "pointer" : "default",
              transition: "border-color 150ms ease",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border-focus)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)";
            }}
          >
            {/* Icon */}
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "var(--radius-sm)",
                background: "var(--bg-hover)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "var(--font-size-sm)",
                color: "var(--text-secondary)",
                flexShrink: 0,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M2 4h12M2 8h12M2 12h12"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-2)",
                  marginBottom: 2,
                }}
              >
                <span
                  style={{
                    color: "var(--text-primary)",
                    fontSize: "var(--font-size-sm)",
                    fontWeight: 500,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {conn.name}
                </span>
                <ConnectionStatusBadge result={result} testing={isTesting} />
              </div>
              <div
                style={{
                  color: "var(--text-tertiary)",
                  fontSize: "var(--font-size-xs)",
                  fontFamily: "var(--font-mono)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {conn.username}@{conn.host}
                {conn.port !== 22 && `:${conn.port}`}
              </div>
              {conn.last_connected_at && (
                <div
                  style={{
                    color: "var(--text-tertiary)",
                    fontSize: "var(--font-size-xs)",
                    marginTop: 2,
                  }}
                >
                  Last connected: {new Date(conn.last_connected_at).toLocaleDateString()}
                </div>
              )}
            </div>

            {/* Actions */}
            <div
              style={{ display: "flex", gap: "var(--space-1)", flexShrink: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <SshConnectionTestButton
                testing={isTesting}
                onTest={() => onTest(conn.id)}
              />
              <button
                onClick={() => onRemove(conn.id)}
                title="Remove connection"
                style={{
                  background: "none",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--text-tertiary)",
                  cursor: "pointer",
                  padding: "var(--space-1) var(--space-2)",
                  fontSize: "var(--font-size-xs)",
                  transition: "color 150ms ease",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.color = "var(--error)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.color = "var(--text-tertiary)";
                }}
              >
                Remove
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
