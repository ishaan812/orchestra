interface RemoteProjectIndicatorProps {
  hostName: string;
  connected?: boolean;
}

export function RemoteProjectIndicator({ hostName, connected = false }: RemoteProjectIndicatorProps) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "var(--space-1)",
        padding: "1px var(--space-2)",
        fontSize: "var(--font-size-xs)",
        borderRadius: "var(--radius-full)",
        background: connected
          ? "color-mix(in srgb, var(--success) 15%, transparent)"
          : "var(--bg-hover)",
        color: connected ? "var(--success)" : "var(--text-tertiary)",
        border: `1px solid ${connected ? "color-mix(in srgb, var(--success) 30%, transparent)" : "var(--border)"}`,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          backgroundColor: connected ? "var(--success)" : "var(--text-tertiary)",
          opacity: connected ? 1 : 0.5,
        }}
      />
      SSH: {hostName}
    </span>
  );
}
