interface SshConnectionTestButtonProps {
  testing: boolean;
  onTest: () => void;
}

export function SshConnectionTestButton({ testing, onTest }: SshConnectionTestButtonProps) {
  return (
    <button
      onClick={onTest}
      disabled={testing}
      style={{
        background: "none",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-sm)",
        color: testing ? "var(--text-tertiary)" : "var(--accent-primary)",
        cursor: testing ? "default" : "pointer",
        padding: "var(--space-1) var(--space-2)",
        fontSize: "var(--font-size-xs)",
        opacity: testing ? 0.6 : 1,
        transition: "opacity 150ms ease",
      }}
    >
      {testing ? "Testing..." : "Test"}
    </button>
  );
}
