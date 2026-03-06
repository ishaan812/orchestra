import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";

interface MergeButtonProps {
  workspaceId: string;
  onMerged?: () => void;
}

interface BranchInfo {
  name: string;
  is_current: boolean;
}

export function MergeButton({ workspaceId, onMerged }: MergeButtonProps) {
  const [conflicts, setConflicts] = useState<string[]>([]);
  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [targetBranch, setTargetBranch] = useState<string>("main");
  const [merging, setMerging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPostMerge, setShowPostMerge] = useState(false);
  const [checking, setChecking] = useState(false);

  const checkConflicts = useCallback(async () => {
    setChecking(true);
    try {
      const result = await invoke<string[]>("detect_merge_conflicts", {
        workspaceId,
      });
      setConflicts(result);
    } catch (e) {
      setError(String(e));
    } finally {
      setChecking(false);
    }
  }, [workspaceId]);

  const loadBranches = useCallback(async () => {
    try {
      const result = await invoke<BranchInfo[]>("list_workspace_branches", {
        workspaceId,
      });
      setBranches(result);
    } catch {
      // ignore
    }
  }, [workspaceId]);

  useEffect(() => {
    checkConflicts();
    loadBranches();
  }, [checkConflicts, loadBranches]);

  const handleMerge = async () => {
    setMerging(true);
    setError(null);
    try {
      const result = await invoke<{ merge_type: string; conflicts: string[] }>(
        "merge_workspace",
        { workspaceId }
      );
      if (result.conflicts.length > 0) {
        setConflicts(result.conflicts);
        setError(`Merge conflicts in ${result.conflicts.length} file(s)`);
      } else {
        setShowPostMerge(true);
        onMerged?.();
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setMerging(false);
    }
  };

  const hasConflicts = conflicts.length > 0;
  const canMerge = !hasConflicts && !merging && !checking;

  if (showPostMerge) {
    return <PostMergeDialog workspaceId={workspaceId} onClose={() => setShowPostMerge(false)} />;
  }

  return (
    <div style={{ padding: "var(--space-3)" }}>
      {/* Pre-merge checks */}
      <div style={{ marginBottom: "var(--space-3)" }}>
        <div
          style={{
            fontSize: "var(--font-size-xs)",
            color: "var(--text-secondary)",
            marginBottom: "var(--space-2)",
            fontWeight: 600,
          }}
        >
          Pre-merge checks
        </div>

        <CheckItem
          label="No merge conflicts"
          status={checking ? "checking" : hasConflicts ? "fail" : "pass"}
          detail={hasConflicts ? `${conflicts.length} conflicting file(s)` : undefined}
        />

        {conflicts.length > 0 && (
          <div
            style={{
              padding: "var(--space-2)",
              marginTop: "var(--space-1)",
              backgroundColor: "var(--error-bg)",
              borderRadius: "var(--radius-sm)",
              fontSize: "var(--font-size-xs)",
              fontFamily: "var(--font-mono)",
              color: "var(--error)",
            }}
          >
            {conflicts.map((f) => (
              <div key={f}>{f}</div>
            ))}
          </div>
        )}
      </div>

      {/* Target branch */}
      <div style={{ marginBottom: "var(--space-3)" }}>
        <label
          style={{
            display: "block",
            fontSize: "var(--font-size-xs)",
            color: "var(--text-secondary)",
            marginBottom: "var(--space-1)",
          }}
        >
          Target branch
        </label>
        <select
          value={targetBranch}
          onChange={(e) => setTargetBranch(e.target.value)}
          style={{
            width: "100%",
            padding: "var(--space-1) var(--space-2)",
            backgroundColor: "var(--bg-input)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            color: "var(--text-primary)",
            fontSize: "var(--font-size-sm)",
          }}
        >
          {branches.map((b) => (
            <option key={b.name} value={b.name}>
              {b.name}
            </option>
          ))}
        </select>
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

      {/* Merge button */}
      <button
        onClick={handleMerge}
        disabled={!canMerge}
        style={{
          width: "100%",
          padding: "var(--space-2) var(--space-4)",
          backgroundColor: canMerge ? "var(--success)" : "var(--bg-elevated)",
          border: "none",
          borderRadius: "var(--radius-md)",
          color: canMerge ? "white" : "var(--text-tertiary)",
          fontSize: "var(--font-size-sm)",
          fontWeight: 600,
          cursor: canMerge ? "pointer" : "not-allowed",
        }}
      >
        {merging ? "Merging..." : "Merge to " + targetBranch}
      </button>
    </div>
  );
}

function CheckItem({
  label,
  status,
  detail,
}: {
  label: string;
  status: "pass" | "fail" | "checking";
  detail?: string;
}) {
  const icon = status === "pass" ? "✓" : status === "fail" ? "✗" : "…";
  const color =
    status === "pass"
      ? "var(--success)"
      : status === "fail"
        ? "var(--error)"
        : "var(--text-tertiary)";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-2)",
        padding: "var(--space-1) 0",
        fontSize: "var(--font-size-xs)",
      }}
    >
      <span style={{ color, fontWeight: 600 }}>{icon}</span>
      <span style={{ color: "var(--text-secondary)" }}>{label}</span>
      {detail && (
        <span style={{ color: "var(--text-tertiary)", marginLeft: "auto" }}>
          {detail}
        </span>
      )}
    </div>
  );
}

function PostMergeDialog({ workspaceId, onClose }: { workspaceId: string; onClose: () => void }) {
  return (
    <div style={{ padding: "var(--space-4)" }}>
      <div
        style={{
          color: "var(--success)",
          fontSize: "var(--font-size-md)",
          fontWeight: 600,
          marginBottom: "var(--space-3)",
          display: "flex",
          alignItems: "center",
          gap: "var(--space-2)",
        }}
      >
        <span>✓</span> Merge successful
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-2)",
        }}
      >
        <PostMergeOption
          label="Continue on new branch"
          description="Fork this workspace and keep working"
          onClick={async () => {
            try {
              await invoke("fork_workspace", { id: workspaceId });
            } catch (e) {
              console.error("Failed to fork workspace:", e);
            }
            onClose();
          }}
        />
        <PostMergeOption
          label="Archive workspace"
          description="Clean up and archive this workspace"
          onClick={async () => {
            try {
              await invoke("archive_workspace", { id: workspaceId });
            } catch (e) {
              console.error("Failed to archive workspace:", e);
            }
            onClose();
          }}
        />
        <PostMergeOption
          label="Close"
          description="Keep this workspace as-is"
          onClick={() => {
            onClose();
          }}
        />
      </div>

      <button
        onClick={onClose}
        style={{
          marginTop: "var(--space-3)",
          padding: "var(--space-1) var(--space-3)",
          background: "none",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-sm)",
          color: "var(--text-secondary)",
          fontSize: "var(--font-size-xs)",
          cursor: "pointer",
          width: "100%",
        }}
      >
        Close
      </button>
    </div>
  );
}

function PostMergeOption({
  label,
  description,
  onClick,
}: {
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "var(--space-2) var(--space-3)",
        backgroundColor: "var(--bg-surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
        cursor: "pointer",
        textAlign: "left",
        transition: "background 150ms ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = "var(--bg-surface-hover)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "var(--bg-surface)";
      }}
    >
      <div style={{ color: "var(--text-primary)", fontSize: "var(--font-size-sm)", fontWeight: 500 }}>
        {label}
      </div>
      <div style={{ color: "var(--text-tertiary)", fontSize: "var(--font-size-xs)", marginTop: 2 }}>
        {description}
      </div>
    </button>
  );
}
