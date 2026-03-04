import { useEffect, useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";

interface DiffViewerProps {
  workspaceId: string;
  filePath: string;
}

type ViewMode = "inline" | "side-by-side";

interface DiffLine {
  type: "add" | "remove" | "context" | "header";
  content: string;
  oldLineNo: number | null;
  newLineNo: number | null;
}

function parseDiff(raw: string): DiffLine[] {
  const lines: DiffLine[] = [];
  let oldLine = 0;
  let newLine = 0;

  for (const line of raw.split("\n")) {
    if (line.startsWith("@@")) {
      // Parse hunk header: @@ -a,b +c,d @@
      const match = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (match) {
        oldLine = parseInt(match[1], 10);
        newLine = parseInt(match[2], 10);
      }
      lines.push({ type: "header", content: line, oldLineNo: null, newLineNo: null });
    } else if (line.startsWith("+")) {
      lines.push({ type: "add", content: line.slice(1), oldLineNo: null, newLineNo: newLine });
      newLine++;
    } else if (line.startsWith("-")) {
      lines.push({ type: "remove", content: line.slice(1), oldLineNo: oldLine, newLineNo: null });
      oldLine++;
    } else if (line.startsWith(" ")) {
      lines.push({ type: "context", content: line.slice(1), oldLineNo: oldLine, newLineNo: newLine });
      oldLine++;
      newLine++;
    }
  }

  return lines;
}

export function DiffViewer({ workspaceId, filePath }: DiffViewerProps) {
  const [diff, setDiff] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("inline");

  const loadDiff = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await invoke<string>("get_file_diff", {
        workspaceId,
        filePath,
      });
      setDiff(result);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [workspaceId, filePath]);

  useEffect(() => {
    loadDiff();
  }, [loadDiff]);

  const handleCopy = useCallback(() => {
    if (diff) navigator.clipboard.writeText(diff);
  }, [diff]);

  if (loading) {
    return (
      <div style={{ padding: "var(--space-4)", color: "var(--text-tertiary)" }}>
        Loading diff...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "var(--space-4)", color: "var(--error)" }}>
        {error}
      </div>
    );
  }

  if (!diff) return null;

  const lines = parseDiff(diff);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Toolbar */}
      <div
        style={{
          padding: "var(--space-2) var(--space-3)",
          borderBottom: "1px solid var(--border-subtle)",
          display: "flex",
          alignItems: "center",
          gap: "var(--space-2)",
        }}
      >
        <span
          style={{
            color: "var(--text-primary)",
            fontSize: "var(--font-size-sm)",
            fontFamily: "var(--font-mono)",
            flex: 1,
          }}
        >
          {filePath}
        </span>

        <div style={{ display: "flex", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)" }}>
          <button
            onClick={() => setViewMode("inline")}
            style={{
              padding: "2px var(--space-2)",
              background: viewMode === "inline" ? "var(--bg-surface-active)" : "none",
              border: "none",
              color: "var(--text-secondary)",
              fontSize: "var(--font-size-xs)",
              cursor: "pointer",
              borderRight: "1px solid var(--border)",
            }}
          >
            Inline
          </button>
          <button
            onClick={() => setViewMode("side-by-side")}
            style={{
              padding: "2px var(--space-2)",
              background: viewMode === "side-by-side" ? "var(--bg-surface-active)" : "none",
              border: "none",
              color: "var(--text-secondary)",
              fontSize: "var(--font-size-xs)",
              cursor: "pointer",
            }}
          >
            Split
          </button>
        </div>

        <button
          onClick={handleCopy}
          style={{
            padding: "2px var(--space-2)",
            background: "none",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            color: "var(--text-secondary)",
            fontSize: "var(--font-size-xs)",
            cursor: "pointer",
          }}
        >
          Copy
        </button>
      </div>

      {/* Diff content */}
      <div style={{ flex: 1, overflow: "auto" }}>
        {viewMode === "inline" ? (
          <InlineDiff lines={lines} />
        ) : (
          <SideBySideDiff lines={lines} />
        )}
      </div>
    </div>
  );
}

function InlineDiff({ lines }: { lines: DiffLine[] }) {
  return (
    <table
      style={{
        width: "100%",
        borderCollapse: "collapse",
        fontFamily: "var(--font-mono)",
        fontSize: "var(--font-size-sm)",
        lineHeight: 1.5,
      }}
    >
      <tbody>
        {lines.map((line, i) => {
          if (line.type === "header") {
            return (
              <tr key={i}>
                <td colSpan={3} style={{ padding: "var(--space-1) var(--space-2)", color: "var(--info)", backgroundColor: "var(--bg-input)" }}>
                  {line.content}
                </td>
              </tr>
            );
          }

          const bg =
            line.type === "add"
              ? "var(--diff-add-bg)"
              : line.type === "remove"
                ? "var(--diff-remove-bg)"
                : "transparent";

          const textColor =
            line.type === "add"
              ? "var(--diff-add-text)"
              : line.type === "remove"
                ? "var(--diff-remove-text)"
                : "var(--text-primary)";

          return (
            <tr key={i}>
              <td style={{ width: 40, textAlign: "right", padding: "0 var(--space-2)", color: "var(--text-tertiary)", userSelect: "none", backgroundColor: bg }}>
                {line.oldLineNo ?? ""}
              </td>
              <td style={{ width: 40, textAlign: "right", padding: "0 var(--space-2)", color: "var(--text-tertiary)", userSelect: "none", backgroundColor: bg }}>
                {line.newLineNo ?? ""}
              </td>
              <td style={{ padding: "0 var(--space-2)", whiteSpace: "pre-wrap", wordBreak: "break-all", backgroundColor: bg, color: textColor }}>
                {line.type === "add" && <span style={{ userSelect: "none" }}>+ </span>}
                {line.type === "remove" && <span style={{ userSelect: "none" }}>- </span>}
                {line.type === "context" && <span style={{ userSelect: "none" }}>  </span>}
                {line.content}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function SideBySideDiff({ lines }: { lines: DiffLine[] }) {
  // Split into left (old) and right (new) columns
  const leftLines: (DiffLine | null)[] = [];
  const rightLines: (DiffLine | null)[] = [];

  for (const line of lines) {
    if (line.type === "header") {
      leftLines.push(line);
      rightLines.push(line);
    } else if (line.type === "context") {
      leftLines.push(line);
      rightLines.push(line);
    } else if (line.type === "remove") {
      leftLines.push(line);
      rightLines.push(null);
    } else if (line.type === "add") {
      leftLines.push(null);
      rightLines.push(line);
    }
  }

  // Align removals + additions that are adjacent
  const maxLen = Math.max(leftLines.length, rightLines.length);

  return (
    <div style={{ display: "flex", fontFamily: "var(--font-mono)", fontSize: "var(--font-size-sm)", lineHeight: 1.5 }}>
      {/* Left side (old) */}
      <div style={{ flex: 1, borderRight: "1px solid var(--border-subtle)", overflow: "auto" }}>
        {Array.from({ length: maxLen }, (_, i) => {
          const line = leftLines[i];
          if (!line) return <div key={i} style={{ height: "1.5em" }} />;
          if (line.type === "header") {
            return (
              <div key={i} style={{ padding: "0 var(--space-2)", color: "var(--info)", backgroundColor: "var(--bg-input)" }}>
                {line.content}
              </div>
            );
          }
          const bg = line.type === "remove" ? "var(--diff-remove-bg)" : "transparent";
          const color = line.type === "remove" ? "var(--diff-remove-text)" : "var(--text-primary)";
          return (
            <div key={i} style={{ display: "flex", backgroundColor: bg }}>
              <span style={{ width: 40, textAlign: "right", padding: "0 var(--space-1)", color: "var(--text-tertiary)", userSelect: "none" }}>
                {line.oldLineNo ?? ""}
              </span>
              <span style={{ flex: 1, padding: "0 var(--space-2)", whiteSpace: "pre-wrap", color }}>{line.content}</span>
            </div>
          );
        })}
      </div>

      {/* Right side (new) */}
      <div style={{ flex: 1, overflow: "auto" }}>
        {Array.from({ length: maxLen }, (_, i) => {
          const line = rightLines[i];
          if (!line) return <div key={i} style={{ height: "1.5em" }} />;
          if (line.type === "header") {
            return (
              <div key={i} style={{ padding: "0 var(--space-2)", color: "var(--info)", backgroundColor: "var(--bg-input)" }}>
                {line.content}
              </div>
            );
          }
          const bg = line.type === "add" ? "var(--diff-add-bg)" : "transparent";
          const color = line.type === "add" ? "var(--diff-add-text)" : "var(--text-primary)";
          return (
            <div key={i} style={{ display: "flex", backgroundColor: bg }}>
              <span style={{ width: 40, textAlign: "right", padding: "0 var(--space-1)", color: "var(--text-tertiary)", userSelect: "none" }}>
                {line.newLineNo ?? ""}
              </span>
              <span style={{ flex: 1, padding: "0 var(--space-2)", whiteSpace: "pre-wrap", color }}>{line.content}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
