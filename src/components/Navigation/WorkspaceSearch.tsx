import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useWorkspaceStore, type WorkspaceInfo } from "../../hooks/useWorkspaces";

interface WorkspaceSearchProps {
  open: boolean;
  onClose: () => void;
  onSelectWorkspace: (id: string) => void;
}

function matchWorkspace(query: string, ws: WorkspaceInfo): boolean {
  const q = query.toLowerCase();
  return (
    ws.name.toLowerCase().includes(q) ||
    ws.branch_name.toLowerCase().includes(q) ||
    (ws.task_prompt?.toLowerCase().includes(q) ?? false) ||
    (ws.pr_title?.toLowerCase().includes(q) ?? false) ||
    ws.state.toLowerCase().includes(q)
  );
}

const STATE_COLORS: Record<string, string> = {
  backlog: "var(--text-tertiary)",
  in_progress: "var(--warning)",
  in_review: "var(--accent-primary)",
  done: "var(--success)",
};

export function WorkspaceSearch({ open, onClose, onSelectWorkspace }: WorkspaceSearchProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const { workspaces } = useWorkspaceStore();

  const allWorkspaces = useMemo(
    () => [
      ...workspaces.in_progress,
      ...workspaces.in_review,
      ...workspaces.backlog,
      ...workspaces.done,
    ],
    [workspaces]
  );

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const filtered = useMemo(() => {
    if (!query.trim()) return allWorkspaces;
    return allWorkspaces.filter((ws) => matchWorkspace(query, ws));
  }, [allWorkspaces, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [filtered]);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const item = list.children[selectedIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && filtered[selectedIndex]) {
        e.preventDefault();
        onSelectWorkspace(filtered[selectedIndex].id);
        onClose();
      } else if (e.key === "Escape") {
        onClose();
      }
    },
    [filtered, selectedIndex, onSelectWorkspace, onClose]
  );

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "20vh",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: 520,
          backgroundColor: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          overflow: "hidden",
          boxShadow: "0 16px 48px rgba(0, 0, 0, 0.3)",
        }}
        onKeyDown={handleKeyDown}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search workspaces by name, branch, task..."
          style={{
            width: "100%",
            padding: "var(--space-3) var(--space-4)",
            backgroundColor: "transparent",
            border: "none",
            borderBottom: "1px solid var(--border-subtle)",
            color: "var(--text-primary)",
            fontSize: "var(--font-size-md)",
            fontFamily: "var(--font-sans)",
            outline: "none",
          }}
        />

        <div
          ref={listRef}
          style={{
            maxHeight: 360,
            overflow: "auto",
            padding: "var(--space-1)",
          }}
        >
          {filtered.length === 0 ? (
            <div
              style={{
                padding: "var(--space-4)",
                color: "var(--text-tertiary)",
                fontSize: "var(--font-size-sm)",
                textAlign: "center",
              }}
            >
              No workspaces match
            </div>
          ) : (
            filtered.map((ws, i) => (
              <div
                key={ws.id}
                onClick={() => {
                  onSelectWorkspace(ws.id);
                  onClose();
                }}
                style={{
                  padding: "var(--space-2) var(--space-3)",
                  borderRadius: "var(--radius-sm)",
                  cursor: "pointer",
                  backgroundColor:
                    i === selectedIndex ? "var(--bg-hover)" : "transparent",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-2)",
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      backgroundColor: STATE_COLORS[ws.state] ?? "var(--text-tertiary)",
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      color: "var(--text-primary)",
                      fontSize: "var(--font-size-sm)",
                      fontWeight: 500,
                    }}
                  >
                    {ws.name}
                  </span>
                  {ws.unread && (
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        backgroundColor: "var(--accent-primary)",
                      }}
                    />
                  )}
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: "var(--space-3)",
                    marginTop: 2,
                    marginLeft: 14,
                  }}
                >
                  <span
                    style={{
                      color: "var(--text-tertiary)",
                      fontSize: "var(--font-size-xs)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {ws.branch_name}
                  </span>
                  <span
                    style={{
                      color: "var(--text-tertiary)",
                      fontSize: "var(--font-size-xs)",
                    }}
                  >
                    {ws.state.replace("_", " ")}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
