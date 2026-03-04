import { useState, useEffect, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";

interface NotesEditorProps {
  workspaceId: string;
}

export function NotesEditor({ workspaceId }: NotesEditorProps) {
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load notes on mount
  useEffect(() => {
    invoke<{ content: string; last_saved: string }>("get_notes", {
      workspaceId,
    }).then((data) => {
      setContent(data.content);
      setLastSaved(data.last_saved);
    }).catch(() => {});
  }, [workspaceId]);

  // Auto-save on change (debounced 500ms)
  const saveNotes = useCallback(
    async (text: string) => {
      setSaving(true);
      try {
        await invoke("save_notes", {
          workspaceId,
          content: text,
        });
        setLastSaved(new Date().toISOString());
      } catch {
        // Silent fail on save
      } finally {
        setSaving(false);
      }
    },
    [workspaceId]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newContent = e.target.value;
      setContent(newContent);

      // Debounced auto-save
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      saveTimerRef.current = setTimeout(() => {
        saveNotes(newContent);
      }, 500);
    },
    [saveNotes]
  );

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "var(--space-1) var(--space-3)",
          borderBottom: "1px solid var(--border-subtle)",
          gap: "var(--space-2)",
        }}
      >
        <span
          style={{
            fontSize: "var(--font-size-xs)",
            color: "var(--text-tertiary)",
          }}
        >
          Markdown
        </span>
        <div style={{ flex: 1 }} />
        <span
          style={{
            fontSize: "var(--font-size-xs)",
            color: saving ? "var(--accent-primary)" : "var(--text-tertiary)",
          }}
        >
          {saving
            ? "Saving..."
            : lastSaved
              ? `Saved ${new Date(lastSaved).toLocaleTimeString()}`
              : ""}
        </span>
      </div>

      {/* Editor */}
      <textarea
        value={content}
        onChange={handleChange}
        placeholder="Write notes here... (Markdown supported)"
        style={{
          flex: 1,
          padding: "var(--space-3)",
          backgroundColor: "var(--bg-base)",
          border: "none",
          color: "var(--text-primary)",
          fontSize: "var(--font-size-sm)",
          fontFamily: "var(--font-mono)",
          lineHeight: 1.6,
          resize: "none",
          outline: "none",
        }}
      />
    </div>
  );
}
