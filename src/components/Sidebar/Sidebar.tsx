import { RepoSelector } from "./RepoSelector";
import { WorkspaceList } from "./WorkspaceList";
import type { Repo } from "../../hooks/useRepos";
import type { WorkspaceGroup } from "../../hooks/useWorkspaces";

interface SidebarProps {
  repos: Repo[];
  selectedRepoId: string | null;
  onSelectRepo: (repoId: string) => void;
  onAddRepo: () => void;
  onNewWorkspace: () => void;
  onOpenSettings: () => void;
  workspaces: WorkspaceGroup;
  activeWorkspaceId: string | null;
  onSelectWorkspace: (id: string) => void;
  unreadCount?: number;
}

export function Sidebar({
  repos,
  selectedRepoId,
  onSelectRepo,
  onAddRepo,
  onNewWorkspace,
  onOpenSettings,
  workspaces,
  activeWorkspaceId,
  onSelectWorkspace,
  unreadCount,
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
      <RepoSelector
        repos={repos}
        selectedRepoId={selectedRepoId}
        onSelect={onSelectRepo}
        onAddRepo={onAddRepo}
      />

      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {unreadCount != null && unreadCount > 0 && (
          <div
            style={{
              padding: "var(--space-1) var(--space-2)",
              fontSize: "var(--font-size-xs)",
              color: "var(--accent-primary)",
              fontWeight: 600,
            }}
          >
            {unreadCount} unread
          </div>
        )}
        <WorkspaceList
          workspaces={workspaces}
          activeWorkspaceId={activeWorkspaceId}
          onSelect={onSelectWorkspace}
          onContextMenu={() => {
            // TODO: context menu
          }}
        />
      </div>

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
