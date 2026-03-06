import type { Repo } from "../../hooks/useRepos";
import type { WorkspaceGroup, WorkspaceInfo } from "../../hooks/useWorkspaces";

interface SidebarProps {
  repos: Repo[];
  selectedRepoId: string | null;
  onSelectRepo: (repoId: string) => void;
  onAddRepo: () => void;
  onNewWorkspace: () => void;
  workspacesByRepo: Record<string, WorkspaceInfo[]>;
  onOpenSettings: () => void;
  workspaces: WorkspaceGroup;
  activeWorkspaceId: string | null;
  onSelectWorkspace: (id: string) => void;
  unreadCount?: number;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

export function Sidebar({
  repos,
  onSelectRepo,
  onAddRepo,
  onNewWorkspace,
  onOpenSettings,
  workspacesByRepo,
  activeWorkspaceId,
  onSelectWorkspace,
}: SidebarProps) {

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "var(--bg-surface)",
      }}
    >
      {/* Top nav links */}
      <div style={{ padding: "var(--space-3) var(--space-3) 0" }}>
        <button
          onClick={() => {
            // Navigate home
            onSelectWorkspace("");
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            padding: "var(--space-2) var(--space-3)",
            background: "none",
            border: "none",
            color: "var(--text-primary)",
            fontSize: "var(--font-size-sm)",
            cursor: "pointer",
            width: "100%",
            textAlign: "left",
            borderRadius: "var(--radius-sm)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "var(--bg-surface-hover)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
          }}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 1.5l-6.5 5V14h4.5V10h4v4h4.5V6.5L8 1.5z" />
          </svg>
          Home
        </button>
      </div>

      {/* Projects section */}
      <div
        style={{
          padding: "var(--space-3) var(--space-3) 0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            fontSize: "var(--font-size-xs)",
            color: "var(--text-tertiary)",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          Projects
        </span>
        <button
          onClick={onAddRepo}
          style={{
            background: "none",
            border: "none",
            color: "var(--text-tertiary)",
            cursor: "pointer",
            fontSize: "var(--font-size-xs)",
            padding: "2px 4px",
            borderRadius: "var(--radius-sm)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "var(--text-primary)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "var(--text-tertiary)";
          }}
          title="Add project"
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 8h10M8 3v10" />
          </svg>
        </button>
      </div>

      {/* Project tree */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "var(--space-2) var(--space-3)",
        }}
      >
        {repos.length === 0 && (
          <div
            style={{
              padding: "var(--space-4) var(--space-2)",
              color: "var(--text-tertiary)",
              fontSize: "var(--font-size-xs)",
              textAlign: "center",
            }}
          >
            No projects yet
          </div>
        )}

        {repos.map((repo) => {
          const repoWorkspaces = workspacesByRepo[repo.id] ?? [];

          return (
            <div key={repo.id} style={{ marginBottom: "var(--space-1)" }}>
              {/* Project header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-2)",
                  padding: "var(--space-1) var(--space-2)",
                  borderRadius: "var(--radius-sm)",
                  cursor: "pointer",
                }}
                onClick={() => onSelectRepo(repo.id)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "var(--bg-surface-hover)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="var(--text-tertiary)">
                  <path d="M2 2h5l2 2h5v10H2V2z" />
                </svg>
                <span
                  style={{
                    fontSize: "var(--font-size-sm)",
                    color: "var(--text-primary)",
                    fontWeight: 500,
                    flex: 1,
                  }}
                >
                  {repo.name}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectRepo(repo.id);
                    onNewWorkspace();
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--text-tertiary)",
                    cursor: "pointer",
                    padding: "2px",
                    fontSize: 12,
                    lineHeight: 1,
                    borderRadius: "var(--radius-sm)",
                    opacity: 0.6,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = "1";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = "0.6";
                  }}
                  title="New workspace"
                >
                  +
                </button>
              </div>

              {/* Workspace items under this project — always visible */}
              {repoWorkspaces.map((ws) => (
                  <WorkspaceRow
                    key={ws.id}
                    workspace={ws}
                    isActive={ws.id === activeWorkspaceId}
                    onClick={() => onSelectWorkspace(ws.id)}
                  />
                ))}
            </div>
          );
        })}
      </div>

      {/* Bottom controls */}
      <div
        style={{
          padding: "var(--space-3)",
          borderTop: "1px solid var(--border-subtle)",
          display: "flex",
          gap: "var(--space-2)",
          alignItems: "center",
        }}
      >
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
          title="Settings"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 10a2 2 0 100-4 2 2 0 000 4zm6.32-1.906l-1.12-.65a5.07 5.07 0 000-2.888l1.12-.65a.5.5 0 00.183-.683l-1-1.732a.5.5 0 00-.683-.183l-1.12.65a5.07 5.07 0 00-2.5-1.444V.5a.5.5 0 00-.5-.5h-2a.5.5 0 00-.5.5v1.014a5.07 5.07 0 00-2.5 1.444l-1.12-.65a.5.5 0 00-.683.183l-1 1.732a.5.5 0 00.183.683l1.12.65a5.07 5.07 0 000 2.888l-1.12.65a.5.5 0 00-.183.683l1 1.732a.5.5 0 00.683.183l1.12-.65a5.07 5.07 0 002.5 1.444V15.5a.5.5 0 00.5.5h2a.5.5 0 00.5-.5v-1.014a5.07 5.07 0 002.5-1.444l1.12.65a.5.5 0 00.683-.183l1-1.732a.5.5 0 00-.183-.683z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function WorkspaceRow({
  workspace,
  isActive,
  onClick,
}: {
  workspace: WorkspaceInfo;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        padding: "var(--space-2) var(--space-2) var(--space-2) var(--space-6)",
        background: isActive ? "var(--bg-surface-active)" : "transparent",
        border: "none",
        color: "var(--text-primary)",
        cursor: "pointer",
        textAlign: "left",
        borderRadius: "var(--radius-sm)",
        display: "flex",
        alignItems: "center",
        gap: "var(--space-2)",
      }}
      onMouseEnter={(e) => {
        if (!isActive) e.currentTarget.style.backgroundColor = "var(--bg-surface-hover)";
      }}
      onMouseLeave={(e) => {
        if (!isActive) e.currentTarget.style.backgroundColor = "transparent";
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: "var(--font-size-sm)",
            fontWeight: isActive ? 500 : 400,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {workspace.name}
        </div>
      </div>
      {workspace.pr_title && (
        <span
          style={{
            fontSize: "var(--font-size-xs)",
            color: "var(--accent-primary)",
            background: "var(--bg-surface-hover)",
            padding: "1px 6px",
            borderRadius: "var(--radius-sm)",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          View PR
        </span>
      )}
      <span
        style={{
          fontSize: "var(--font-size-xs)",
          color: "var(--text-tertiary)",
          flexShrink: 0,
        }}
      >
        {timeAgo(workspace.updated_at)}
      </span>
    </button>
  );
}
