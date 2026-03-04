import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

interface FilePickerProps {
  open: boolean;
  onClose: () => void;
  workspaceId: string | null;
  onSelectFile: (filePath: string) => void;
}

function fuzzyMatch(query: string, target: string): number {
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  if (q.length === 0) return 1;

  let qi = 0;
  let score = 0;
  let lastMatchIdx = -1;

  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      score += 1;
      // Consecutive bonus
      if (lastMatchIdx === ti - 1) score += 2;
      // Start-of-segment bonus (after / or .)
      if (ti === 0 || t[ti - 1] === "/" || t[ti - 1] === ".") score += 3;
      lastMatchIdx = ti;
      qi++;
    }
  }

  return qi === q.length ? score : 0;
}

export function FilePicker({ open, onClose, workspaceId, onSelectFile }: FilePickerProps) {
  const [query, setQuery] = useState("");
  const [files, setFiles] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Load files when opening
  useEffect(() => {
    if (!open || !workspaceId) return;
    setQuery("");
    setSelectedIndex(0);

    invoke<string[]>("list_workspace_files", { workspaceId })
      .then(setFiles)
      .catch(() => setFiles([]));
  }, [open, workspaceId]);

  // Auto-focus input
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const filtered = useMemo(() => {
    if (!query.trim()) return files.slice(0, 100);

    const scored = files
      .map((f) => ({ path: f, score: fuzzyMatch(query, f) }))
      .filter((r) => r.score > 0);

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 100).map((r) => r.path);
  }, [files, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [filtered]);

  // Scroll selected into view
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
        onSelectFile(filtered[selectedIndex]);
        onClose();
      } else if (e.key === "Escape") {
        onClose();
      }
    },
    [filtered, selectedIndex, onSelectFile, onClose]
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
          placeholder="Search files..."
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
            maxHeight: 320,
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
              {files.length === 0 ? "Loading files..." : "No matches"}
            </div>
          ) : (
            filtered.map((file, i) => (
              <div
                key={file}
                onClick={() => {
                  onSelectFile(file);
                  onClose();
                }}
                style={{
                  padding: "var(--space-2) var(--space-3)",
                  borderRadius: "var(--radius-sm)",
                  cursor: "pointer",
                  backgroundColor:
                    i === selectedIndex ? "var(--bg-hover)" : "transparent",
                  color: "var(--text-primary)",
                  fontSize: "var(--font-size-sm)",
                  fontFamily: "var(--font-mono)",
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-2)",
                }}
              >
                <span style={{ color: "var(--text-tertiary)", fontSize: "var(--font-size-xs)" }}>
                  {getFileIcon(file)}
                </span>
                <FilePathDisplay path={file} />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function FilePathDisplay({ path }: { path: string }) {
  const parts = path.split("/");
  const fileName = parts.pop() ?? path;
  const dir = parts.join("/");

  return (
    <span>
      <span>{fileName}</span>
      {dir && (
        <span style={{ color: "var(--text-tertiary)", marginLeft: "var(--space-2)" }}>
          {dir}
        </span>
      )}
    </span>
  );
}

function getFileIcon(path: string): string {
  if (path.endsWith(".ts") || path.endsWith(".tsx")) return "TS";
  if (path.endsWith(".js") || path.endsWith(".jsx")) return "JS";
  if (path.endsWith(".rs")) return "RS";
  if (path.endsWith(".md")) return "MD";
  if (path.endsWith(".json")) return "{}";
  if (path.endsWith(".toml")) return "TM";
  if (path.endsWith(".css")) return "CS";
  return "··";
}
