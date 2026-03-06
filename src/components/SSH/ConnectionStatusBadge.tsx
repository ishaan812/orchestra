import { SshTestResult } from "../../hooks/useSshConnections";

interface ConnectionStatusBadgeProps {
  result?: SshTestResult;
  testing?: boolean;
}

export function ConnectionStatusBadge({ result, testing }: ConnectionStatusBadgeProps) {
  if (testing) {
    return (
      <span
        style={{
          fontSize: "var(--font-size-xs)",
          color: "var(--text-tertiary)",
          padding: "1px var(--space-2)",
          borderRadius: "var(--radius-full)",
          background: "var(--bg-hover)",
        }}
      >
        Testing...
      </span>
    );
  }

  if (!result) return null;

  if (result.success) {
    return (
      <span
        style={{
          fontSize: "var(--font-size-xs)",
          color: "var(--success)",
          padding: "1px var(--space-2)",
          borderRadius: "var(--radius-full)",
          background: "color-mix(in srgb, var(--success) 15%, transparent)",
        }}
      >
        Connected{result.latency_ms != null ? ` (${result.latency_ms}ms)` : ""}
      </span>
    );
  }

  return (
    <span
      title={result.message}
      style={{
        fontSize: "var(--font-size-xs)",
        color: "var(--error)",
        padding: "1px var(--space-2)",
        borderRadius: "var(--radius-full)",
        background: "color-mix(in srgb, var(--error) 15%, transparent)",
        maxWidth: 160,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}
    >
      Failed
    </span>
  );
}
