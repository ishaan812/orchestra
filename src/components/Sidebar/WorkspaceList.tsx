import type { WorkspaceInfo, WorkspaceGroup } from "../../hooks/useWorkspaces";
import { WorkspaceItem } from "./WorkspaceItem";
import { useState } from "react";

const STATUS_SECTIONS = [
  { key: "backlog" as const, label: "Backlog" },
  { key: "in_progress" as const, label: "In Progress" },
  { key: "in_review" as const, label: "In Review" },
  { key: "done" as const, label: "Done" },
];

interface WorkspaceListProps {
  workspaces: WorkspaceGroup;
  activeWorkspaceId: string | null;
  onSelect: (id: string) => void;
  onContextMenu: (id: string, e: React.MouseEvent) => void;
}

export function WorkspaceList({
  workspaces,
  activeWorkspaceId,
  onSelect,
  onContextMenu,
}: WorkspaceListProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const getItems = (key: keyof WorkspaceGroup): WorkspaceInfo[] => workspaces[key];

  return (
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-1)",
      }}
    >
      {STATUS_SECTIONS.map((section) => {
        const items = getItems(section.key);
        const isCollapsed = collapsed[section.key] ?? false;

        return (
          <div key={section.key}>
            <button
              onClick={() =>
                setCollapsed((prev) => ({ ...prev, [section.key]: !isCollapsed }))
              }
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-1)",
                padding: "var(--space-1) 0",
                background: "none",
                border: "none",
                color: "var(--text-tertiary)",
                fontSize: "var(--font-size-xs)",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                cursor: "pointer",
                width: "100%",
                textAlign: "left",
              }}
            >
              <span style={{ fontSize: 8 }}>{isCollapsed ? "▶" : "▼"}</span>
              {section.label}
              {items.length > 0 && (
                <span
                  style={{
                    background: "var(--bg-surface-hover)",
                    borderRadius: "var(--radius-xl)",
                    padding: "0 var(--space-2)",
                    fontSize: "var(--font-size-xs)",
                    color: "var(--text-secondary)",
                  }}
                >
                  {items.length}
                </span>
              )}
            </button>

            {!isCollapsed && (
              <div>
                {items.length === 0 ? (
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
                ) : (
                  items.map((ws) => (
                    <WorkspaceItem
                      key={ws.id}
                      workspace={ws}
                      isActive={ws.id === activeWorkspaceId}
                      onClick={() => onSelect(ws.id)}
                      onContextMenu={(e) => onContextMenu(ws.id, e)}
                    />
                  ))
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
