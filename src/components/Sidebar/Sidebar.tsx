import { RepoSelector } from "./RepoSelector";
import type { Repo } from "../../hooks/useRepos";

const STATUS_SECTIONS = [
  { key: "backlog", label: "Backlog" },
  { key: "in-progress", label: "In Progress" },
  { key: "in-review", label: "In Review" },
  { key: "done", label: "Done" },
] as const;

interface SidebarProps {
  repos: Repo[];
  selectedRepoId: string | null;
  onSelectRepo: (repoId: string) => void;
  onAddRepo: () => void;
  onNewWorkspace: () => void;
  onOpenSettings: () => void;
}

export function Sidebar({
  repos,
  selectedRepoId,
  onSelectRepo,
  onAddRepo,
  onNewWorkspace,
  onOpenSettings,
}: SidebarProps) {
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        padding: "var(--space-3)",
        gap: "var(--space-3)",
      }}
    >
      {/* Repo Selector */}
      <RepoSelector
        repos={repos}
        selectedRepoId={selectedRepoId}
        onSelect={onSelectRepo}
        onAddRepo={onAddRepo}
      />

      {/* Workspace list by status */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-2)",
        }}
      >
        {STATUS_SECTIONS.map((section) => (
          <div key={section.key}>
            <div
              style={{
                padding: "var(--space-1) 0",
                color: "var(--text-tertiary)",
                fontSize: "var(--font-size-xs)",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              {section.label}
            </div>
            <div
              style={{
                padding: "var(--space-2) var(--space-3)",
                color: "var(--text-tertiary)",
                fontSize: "var(--font-size-xs)",
                fontStyle: "italic",
              }}
            >
              No workspaces yet
            </div>
          </div>
        ))}
      </div>

      {/* Bottom actions */}
      <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
        <button
          onClick={onNewWorkspace}
          style={{
            flex: 1,
            padding: "var(--space-2) var(--space-3)",
            background: "var(--accent-primary)",
            border: "none",
            borderRadius: "var(--radius-md)",
            color: "var(--bg-base)",
            fontSize: "var(--font-size-sm)",
            fontWeight: 600,
            cursor: "pointer",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "var(--accent-hover)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "var(--accent-primary)";
          }}
        >
          + New Workspace
        </button>
        <button
          onClick={onOpenSettings}
          style={{
            padding: "var(--space-2)",
            background: "transparent",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            color: "var(--text-secondary)",
            fontSize: "var(--font-size-md)",
            cursor: "pointer",
            lineHeight: 1,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "var(--bg-surface-hover)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
          }}
          title="Settings"
        >
          ⚙
        </button>
      </div>
    </div>
  );
}
