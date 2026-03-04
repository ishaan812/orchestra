import type { WorkspaceInfo } from "../../hooks/useWorkspaces";

const STATE_LABELS: Record<string, { label: string; color: string }> = {
  initializing: { label: "Initializing", color: "var(--warning)" },
  ready: { label: "Ready", color: "var(--info)" },
  active: { label: "Running", color: "var(--success)" },
  paused: { label: "Paused", color: "var(--text-tertiary)" },
  completed: { label: "Completed", color: "var(--success)" },
  ready_to_merge: { label: "Ready to merge", color: "var(--accent-primary)" },
  merged: { label: "Merged", color: "var(--success)" },
  errored: { label: "Errored", color: "var(--error)" },
};

interface WorkspaceItemProps {
  workspace: WorkspaceInfo;
  isActive: boolean;
  onClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

export function WorkspaceItem({
  workspace,
  isActive,
  onClick,
  onContextMenu,
}: WorkspaceItemProps) {
  const stateInfo = STATE_LABELS[workspace.state] ?? {
    label: workspace.state,
    color: "var(--text-tertiary)",
  };

  return (
    <button
      onClick={onClick}
      onContextMenu={(e) => {
        e.preventDefault();
        onContextMenu(e);
      }}
      style={{
        width: "100%",
        padding: "var(--space-2) var(--space-3)",
        background: isActive ? "var(--bg-surface-active)" : "transparent",
        border: "none",
        borderLeft: isActive ? "2px solid var(--accent-primary)" : "2px solid transparent",
        color: "var(--text-primary)",
        cursor: "pointer",
        textAlign: "left",
        borderRadius: "var(--radius-sm)",
        display: "flex",
        flexDirection: "column",
        gap: "2px",
        position: "relative",
      }}
      onMouseEnter={(e) => {
        if (!isActive) e.currentTarget.style.backgroundColor = "var(--bg-surface-hover)";
      }}
      onMouseLeave={(e) => {
        if (!isActive) e.currentTarget.style.backgroundColor = "transparent";
      }}
    >
      {/* Name row */}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-1)" }}>
        {workspace.pinned_at && (
          <span style={{ fontSize: "var(--font-size-xs)" }} title="Pinned">
            📌
          </span>
        )}
        <span style={{ fontSize: "var(--font-size-sm)", fontWeight: 500 }}>
          {workspace.name}
        </span>
        {workspace.unread && (
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              backgroundColor: "var(--accent-primary)",
              flexShrink: 0,
            }}
          />
        )}
      </div>

      {/* Branch */}
      <div
        style={{
          fontSize: "var(--font-size-xs)",
          color: "var(--text-secondary)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {workspace.branch_name}
      </div>

      {/* Status + Stats row */}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
        <span style={{ fontSize: "var(--font-size-xs)", color: stateInfo.color }}>
          ● {stateInfo.label}
        </span>
        {(workspace.insertions > 0 || workspace.deletions > 0) && (
          <span style={{ fontSize: "var(--font-size-xs)", fontFamily: "var(--font-mono)" }}>
            <span style={{ color: "var(--success)" }}>+{workspace.insertions}</span>
            {" / "}
            <span style={{ color: "var(--error)" }}>-{workspace.deletions}</span>
          </span>
        )}
      </div>

      {/* PR title if exists */}
      {workspace.pr_title && (
        <div
          style={{
            fontSize: "var(--font-size-xs)",
            color: "var(--text-secondary)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          PR: {workspace.pr_title}
        </div>
      )}
    </button>
  );
}
