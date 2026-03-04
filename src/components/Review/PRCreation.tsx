import { useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";

interface PRCreationProps {
  workspaceId: string;
  taskPrompt: string | null;
  existingPrTitle: string | null;
}

export function PRCreation({ workspaceId, taskPrompt, existingPrTitle }: PRCreationProps) {
  const [title, setTitle] = useState(existingPrTitle ?? taskPrompt ?? "");
  const [description, setDescription] = useState("");
  const [isDraft, setIsDraft] = useState(false);
  const [creating, setCreating] = useState(false);
  const [prUrl, setPrUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = useCallback(async () => {
    setCreating(true);
    setError(null);
    try {
      // Use the shell to run gh pr create
      const { Command } = await import("@tauri-apps/plugin-shell");

      const args = [
        "pr",
        "create",
        "--title",
        title,
        "--body",
        description || "Created by Orchestra",
      ];
      if (isDraft) args.push("--draft");

      const output = await Command.create("gh", args).execute();

      if (output.code !== 0) {
        setError(output.stderr || "Failed to create PR");
        return;
      }

      const url = output.stdout.trim();
      setPrUrl(url);

      // Store PR title/description on workspace
      await invoke("update_workspace", {
        id: workspaceId,
        updates: {
          pr_title: title,
          pr_description: description,
        },
      });
    } catch (e) {
      setError(String(e));
    } finally {
      setCreating(false);
    }
  }, [title, description, isDraft, workspaceId]);

  if (existingPrTitle || prUrl) {
    return (
      <div style={{ padding: "var(--space-3)" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            marginBottom: "var(--space-2)",
          }}
        >
          <span style={{ color: "var(--success)", fontSize: "var(--font-size-sm)" }}>✓</span>
          <span style={{ color: "var(--text-primary)", fontSize: "var(--font-size-sm)" }}>
            {existingPrTitle ?? title}
          </span>
        </div>
        {prUrl && (
          <a
            href={prUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "var(--accent-primary)",
              fontSize: "var(--font-size-xs)",
              textDecoration: "underline",
            }}
          >
            View PR on GitHub
          </a>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: "var(--space-3)" }}>
      <div
        style={{
          fontSize: "var(--font-size-sm)",
          color: "var(--text-secondary)",
          fontWeight: 600,
          marginBottom: "var(--space-2)",
        }}
      >
        Create Pull Request
      </div>

      <div style={{ marginBottom: "var(--space-2)" }}>
        <label style={{ display: "block", fontSize: "var(--font-size-xs)", color: "var(--text-tertiary)", marginBottom: 2 }}>
          Title
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{
            width: "100%",
            padding: "var(--space-1) var(--space-2)",
            backgroundColor: "var(--bg-input)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            color: "var(--text-primary)",
            fontSize: "var(--font-size-sm)",
          }}
        />
      </div>

      <div style={{ marginBottom: "var(--space-2)" }}>
        <label style={{ display: "block", fontSize: "var(--font-size-xs)", color: "var(--text-tertiary)", marginBottom: 2 }}>
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          style={{
            width: "100%",
            padding: "var(--space-1) var(--space-2)",
            backgroundColor: "var(--bg-input)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            color: "var(--text-primary)",
            fontSize: "var(--font-size-sm)",
            resize: "vertical",
            fontFamily: "var(--font-ui)",
          }}
        />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-3)" }}>
        <input
          type="checkbox"
          id="draft-pr"
          checked={isDraft}
          onChange={(e) => setIsDraft(e.target.checked)}
          style={{ accentColor: "var(--accent-primary)" }}
        />
        <label htmlFor="draft-pr" style={{ fontSize: "var(--font-size-xs)", color: "var(--text-secondary)" }}>
          Create as draft
        </label>
      </div>

      {error && (
        <div
          style={{
            padding: "var(--space-2)",
            backgroundColor: "var(--error-bg)",
            borderRadius: "var(--radius-sm)",
            color: "var(--error)",
            fontSize: "var(--font-size-xs)",
            marginBottom: "var(--space-2)",
          }}
        >
          {error}
        </div>
      )}

      <button
        onClick={handleCreate}
        disabled={creating || !title.trim()}
        style={{
          width: "100%",
          padding: "var(--space-2) var(--space-4)",
          backgroundColor: !title.trim() || creating ? "var(--bg-elevated)" : "var(--accent-primary)",
          border: "none",
          borderRadius: "var(--radius-md)",
          color: !title.trim() || creating ? "var(--text-tertiary)" : "var(--bg-base)",
          fontSize: "var(--font-size-sm)",
          fontWeight: 600,
          cursor: !title.trim() || creating ? "not-allowed" : "pointer",
        }}
      >
        {creating ? "Creating..." : "Create PR"}
      </button>
    </div>
  );
}
