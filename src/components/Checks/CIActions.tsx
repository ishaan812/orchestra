import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

interface WorkflowRun {
  id: number;
  name: string;
  status: string;
  conclusion: string;
  head_branch: string;
  created_at: string;
  updated_at: string;
  url: string;
}

interface CIActionsProps {
  workspaceId: string;
  onForwardToAgent?: (content: string) => void;
}

type SortMode = "state" | "time";

const STATUS_ICONS: Record<string, { icon: string; color: string }> = {
  success: { icon: "✓", color: "var(--success)" },
  failure: { icon: "✕", color: "var(--error)" },
  cancelled: { icon: "○", color: "var(--text-tertiary)" },
  in_progress: { icon: "●", color: "var(--warning)" },
  queued: { icon: "◌", color: "var(--text-tertiary)" },
};

export function CIActions({ workspaceId, onForwardToAgent }: CIActionsProps) {
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("state");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const fetchRuns = useCallback(async () => {
    try {
      const data = await invoke<WorkflowRun[]>("get_workflow_runs", { workspaceId });
      setRuns(data);
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchRuns();
    const interval = setInterval(fetchRuns, 30_000);
    return () => clearInterval(interval);
  }, [fetchRuns]);

  const handleRerun = useCallback(
    async (runId: number) => {
      try {
        await invoke("rerun_workflow", {
          runId: String(runId),
          workspaceId,
        });
        await fetchRuns();
      } catch (e) {
        console.error("Rerun failed:", e);
      }
    },
    [workspaceId, fetchRuns]
  );

  const sorted = [...runs].sort((a, b) => {
    if (sortMode === "state") {
      const order: Record<string, number> = { failure: 0, in_progress: 1, queued: 2, success: 3, cancelled: 4 };
      return (order[a.conclusion || a.status] ?? 5) - (order[b.conclusion || b.status] ?? 5);
    }
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });

  if (loading) {
    return (
      <div style={{ padding: "var(--space-3)", color: "var(--text-tertiary)", fontSize: "var(--font-size-xs)" }}>
        Loading CI status...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "var(--space-3)", color: "var(--text-tertiary)", fontSize: "var(--font-size-xs)" }}>
        CI unavailable
      </div>
    );
  }

  if (runs.length === 0) {
    return (
      <div style={{ padding: "var(--space-3)", color: "var(--text-tertiary)", fontSize: "var(--font-size-xs)" }}>
        No workflow runs
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "var(--space-2) var(--space-3)",
        }}
      >
        <span style={{ fontSize: "var(--font-size-xs)", fontWeight: 600, color: "var(--text-secondary)" }}>
          CI / Actions
        </span>
        <select
          value={sortMode}
          onChange={(e) => setSortMode(e.target.value as SortMode)}
          style={{
            fontSize: "var(--font-size-xs)",
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-sm)",
            color: "var(--text-secondary)",
            padding: "2px 4px",
          }}
        >
          <option value="state">Sort by state</option>
          <option value="time">Sort by time</option>
        </select>
      </div>

      {sorted.map((run) => {
        const statusKey = run.conclusion || run.status;
        const statusInfo = STATUS_ICONS[statusKey] ?? { icon: "?", color: "var(--text-tertiary)" };
        const isExpanded = expandedId === run.id;

        return (
          <div key={run.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
            <div
              onClick={() => setExpandedId(isExpanded ? null : run.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-2)",
                padding: "var(--space-2) var(--space-3)",
                cursor: "pointer",
                fontSize: "var(--font-size-xs)",
              }}
            >
              <span style={{ color: statusInfo.color, fontWeight: 600, width: 14, textAlign: "center" }}>
                {statusInfo.icon}
              </span>
              <span style={{ flex: 1, color: "var(--text-primary)" }}>{run.name}</span>
              <span style={{ color: "var(--text-tertiary)" }}>
                {new Date(run.updated_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>

            {isExpanded && (
              <div style={{ padding: "var(--space-2) var(--space-3) var(--space-3)", paddingLeft: "var(--space-6)" }}>
                <div style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-2)" }}>
                  {statusKey === "failure" && (
                    <>
                      <button
                        onClick={() => handleRerun(run.id)}
                        style={{
                          fontSize: "var(--font-size-xs)",
                          padding: "2px 8px",
                          background: "var(--bg-surface)",
                          border: "1px solid var(--border)",
                          borderRadius: "var(--radius-sm)",
                          color: "var(--text-secondary)",
                          cursor: "pointer",
                        }}
                      >
                        Re-run
                      </button>
                      {onForwardToAgent && (
                        <button
                          onClick={() =>
                            onForwardToAgent(
                              `Fix these CI failures from workflow "${run.name}" (run #${run.id}):\n\nStatus: ${statusKey}\nBranch: ${run.head_branch}\nURL: ${run.url}`
                            )
                          }
                          style={{
                            fontSize: "var(--font-size-xs)",
                            padding: "2px 8px",
                            background: "var(--accent-primary)",
                            border: "none",
                            borderRadius: "var(--radius-sm)",
                            color: "var(--bg-base)",
                            cursor: "pointer",
                          }}
                        >
                          Forward to Agent
                        </button>
                      )}
                    </>
                  )}
                </div>
                <a
                  href={run.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: "var(--font-size-xs)", color: "var(--accent-primary)" }}
                >
                  View on GitHub
                </a>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
