import { useEffect, useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";

interface FileChange {
  path: string;
  status: string;
  insertions: number;
  deletions: number;
}

interface WorkspaceChanges {
  uncommitted: FileChange[];
  committed: FileChange[];
  stats: {
    files_changed: number;
    insertions: number;
    deletions: number;
  };
  has_more: boolean;
  total_files: number;
}

interface FileTreeProps {
  workspaceId: string;
  onSelectFile?: (filePath: string) => void;
}

export function FileTree({ workspaceId, onSelectFile }: FileTreeProps) {
  const [changes, setChanges] = useState<WorkspaceChanges | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewedFiles, setViewedFiles] = useState<Set<string>>(new Set());
  const [uncommittedOpen, setUncommittedOpen] = useState(true);
  const [committedOpen, setCommittedOpen] = useState(true);

  const loadChanges = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await invoke<WorkspaceChanges>("get_workspace_changes", {
        workspaceId,
      });
      setChanges(result);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    loadChanges();
  }, [loadChanges]);

  const toggleViewed = useCallback((path: string) => {
    setViewedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  if (loading) {
    return (
      <div style={{ padding: "var(--space-4)", color: "var(--text-tertiary)", fontSize: "var(--font-size-sm)" }}>
        Loading changes...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "var(--space-4)", color: "var(--error)", fontSize: "var(--font-size-sm)" }}>
        {error}
      </div>
    );
  }

  if (!changes) return null;

  const { uncommitted, committed, stats, has_more, total_files } = changes;

  return (
    <div style={{ fontSize: "var(--font-size-sm)" }}>
      {/* Summary stats */}
      <div
        style={{
          padding: "var(--space-2) var(--space-3)",
          borderBottom: "1px solid var(--border-subtle)",
          display: "flex",
          gap: "var(--space-3)",
          color: "var(--text-secondary)",
          fontSize: "var(--font-size-xs)",
        }}
      >
        <span>{stats.files_changed} files</span>
        <span style={{ color: "var(--success)" }}>+{stats.insertions}</span>
        <span style={{ color: "var(--error)" }}>-{stats.deletions}</span>
      </div>

      {/* Uncommitted section */}
      {uncommitted.length > 0 && (
        <FileSection
          title={`Uncommitted (${uncommitted.length})`}
          files={uncommitted}
          isOpen={uncommittedOpen}
          onToggle={() => setUncommittedOpen(!uncommittedOpen)}
          onSelectFile={onSelectFile}
          viewedFiles={viewedFiles}
          onToggleViewed={toggleViewed}
        />
      )}

      {/* Committed section */}
      {committed.length > 0 && (
        <FileSection
          title={`Committed (${committed.length})`}
          files={committed}
          isOpen={committedOpen}
          onToggle={() => setCommittedOpen(!committedOpen)}
          onSelectFile={onSelectFile}
          viewedFiles={viewedFiles}
          onToggleViewed={toggleViewed}
        />
      )}

      {has_more && (
        <div
          style={{
            padding: "var(--space-2) var(--space-3)",
            color: "var(--text-tertiary)",
            fontSize: "var(--font-size-xs)",
            textAlign: "center",
          }}
        >
          Showing 50 of {total_files} files
        </div>
      )}

      {uncommitted.length === 0 && committed.length === 0 && (
        <div
          style={{
            padding: "var(--space-6)",
            color: "var(--text-tertiary)",
            fontSize: "var(--font-size-sm)",
            textAlign: "center",
          }}
        >
          No changes yet
        </div>
      )}
    </div>
  );
}

function FileSection({
  title,
  files,
  isOpen,
  onToggle,
  onSelectFile,
  viewedFiles,
  onToggleViewed,
}: {
  title: string;
  files: FileChange[];
  isOpen: boolean;
  onToggle: () => void;
  onSelectFile?: (path: string) => void;
  viewedFiles: Set<string>;
  onToggleViewed: (path: string) => void;
}) {
  return (
    <div>
      <button
        onClick={onToggle}
        style={{
          width: "100%",
          padding: "var(--space-2) var(--space-3)",
          background: "none",
          border: "none",
          borderBottom: "1px solid var(--border-subtle)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "var(--space-1)",
          color: "var(--text-secondary)",
          fontSize: "var(--font-size-xs)",
          fontWeight: 600,
          textAlign: "left",
        }}
      >
        <span
          style={{
            transform: isOpen ? "rotate(90deg)" : "none",
            display: "inline-block",
            transition: "transform 150ms ease",
            fontSize: 10,
          }}
        >
          ▶
        </span>
        {title}
      </button>

      {isOpen &&
        files.map((file) => (
          <FileRow
            key={file.path}
            file={file}
            viewed={viewedFiles.has(file.path)}
            onSelect={() => onSelectFile?.(file.path)}
            onToggleViewed={() => onToggleViewed(file.path)}
          />
        ))}
    </div>
  );
}

function FileRow({
  file,
  viewed,
  onSelect,
  onToggleViewed,
}: {
  file: FileChange;
  viewed: boolean;
  onSelect: () => void;
  onToggleViewed: () => void;
}) {
  const fileName = file.path.split("/").pop() ?? file.path;
  const dirPath = file.path.includes("/")
    ? file.path.substring(0, file.path.lastIndexOf("/"))
    : "";

  const ext = fileName.includes(".") ? fileName.split(".").pop() ?? "" : "";

  return (
    <div
      onClick={onSelect}
      style={{
        padding: "var(--space-1) var(--space-3)",
        paddingLeft: "var(--space-5)",
        display: "flex",
        alignItems: "center",
        gap: "var(--space-2)",
        cursor: "pointer",
        opacity: viewed ? 0.5 : 1,
        transition: "background 150ms ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = "var(--bg-surface-hover)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "transparent";
      }}
    >
      <input
        type="checkbox"
        checked={viewed}
        onChange={(e) => {
          e.stopPropagation();
          onToggleViewed();
        }}
        onClick={(e) => e.stopPropagation()}
        style={{ margin: 0, accentColor: "var(--accent-primary)" }}
      />

      <FileIcon ext={ext} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <span
          style={{
            color: "var(--text-primary)",
            fontSize: "var(--font-size-sm)",
            fontFamily: "var(--font-mono)",
          }}
        >
          {fileName}
        </span>
        {dirPath && (
          <span
            style={{
              color: "var(--text-tertiary)",
              fontSize: "var(--font-size-xs)",
              marginLeft: "var(--space-1)",
              fontFamily: "var(--font-mono)",
            }}
          >
            {dirPath}
          </span>
        )}
      </div>

      {(file.insertions > 0 || file.deletions > 0) && (
        <div style={{ display: "flex", gap: "var(--space-1)", fontSize: "var(--font-size-xs)", fontFamily: "var(--font-mono)" }}>
          {file.insertions > 0 && (
            <span style={{ color: "var(--success)" }}>+{file.insertions}</span>
          )}
          {file.deletions > 0 && (
            <span style={{ color: "var(--error)" }}>-{file.deletions}</span>
          )}
        </div>
      )}

      <StatusBadge status={file.status} />
    </div>
  );
}

function FileIcon({ ext }: { ext: string }) {
  const color = {
    ts: "#3178c6",
    tsx: "#3178c6",
    js: "#f7df1e",
    jsx: "#f7df1e",
    rs: "#dea584",
    py: "#3572a5",
    md: "#083fa1",
    json: "#292929",
    toml: "#9c4121",
    css: "#563d7c",
    html: "#e34c26",
  }[ext] ?? "var(--text-tertiary)";

  return (
    <span style={{ color, fontSize: "var(--font-size-xs)", width: 14, textAlign: "center" }}>
      ■
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const label = status.charAt(0);
  const color = {
    A: "var(--success)",
    M: "var(--warning)",
    D: "var(--error)",
    R: "var(--info)",
  }[label] ?? "var(--text-tertiary)";

  return (
    <span
      style={{
        color,
        fontSize: "var(--font-size-xs)",
        fontWeight: 600,
        width: 14,
        textAlign: "center",
      }}
    >
      {label}
    </span>
  );
}
