import { useState } from "react";

const AGENT_TYPES = ["Claude Code", "Codex"] as const;
const MODELS = [
  "Opus 4.6",
  "Sonnet 4.6",
  "Haiku 4.5",
  "GPT-5.3-Codex",
  "GPT-5.3-Codex-Spark",
  "GPT-5.2",
  "GPT-5.1",
] as const;

const MODES = ["New Task", "From Branch", "From PR", "From Issue"] as const;

interface NewWorkspaceDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (params: {
    task_prompt?: string;
    agent_type?: string;
    model?: string;
    target_branch?: string;
  }) => void;
  branches: string[];
}

export function NewWorkspaceDialog({
  open,
  onClose,
  onSubmit,
  branches,
}: NewWorkspaceDialogProps) {
  const [mode, setMode] = useState<(typeof MODES)[number]>("New Task");
  const [taskPrompt, setTaskPrompt] = useState("");
  const [agentType, setAgentType] = useState<string>("Claude Code");
  const [model, setModel] = useState<string>("Sonnet 4.6");
  const [targetBranch, setTargetBranch] = useState(branches[0] ?? "main");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await onSubmit({
        task_prompt: taskPrompt || undefined,
        agent_type: agentType.toLowerCase().replace(" ", "-"),
        model: model.toLowerCase().replace(/\s+/g, "-"),
        target_branch: targetBranch,
      });
      setTaskPrompt("");
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0,0,0,0.5)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-lg)",
          width: 480,
          maxHeight: "80vh",
          overflow: "auto",
          padding: "var(--space-6)",
        }}
      >
        <h2
          style={{
            fontSize: "var(--font-size-lg)",
            fontWeight: 600,
            marginBottom: "var(--space-4)",
          }}
        >
          New Workspace
        </h2>

        {/* Mode tabs */}
        <div
          style={{
            display: "flex",
            gap: "var(--space-1)",
            marginBottom: "var(--space-4)",
            borderBottom: "1px solid var(--border-subtle)",
            paddingBottom: "var(--space-2)",
          }}
        >
          {MODES.map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                padding: "var(--space-1) var(--space-3)",
                background: mode === m ? "var(--accent-bg)" : "transparent",
                border: "none",
                borderRadius: "var(--radius-sm)",
                color: mode === m ? "var(--accent-primary)" : "var(--text-secondary)",
                fontSize: "var(--font-size-sm)",
                cursor: "pointer",
                fontWeight: mode === m ? 600 : 400,
              }}
            >
              {m}
            </button>
          ))}
        </div>

        {mode === "New Task" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "var(--font-size-sm)",
                  color: "var(--text-secondary)",
                  marginBottom: "var(--space-1)",
                }}
              >
                Task Description
              </label>
              <textarea
                value={taskPrompt}
                onChange={(e) => setTaskPrompt(e.target.value)}
                placeholder="Describe what the agent should work on..."
                rows={3}
                style={{
                  width: "100%",
                  padding: "var(--space-2) var(--space-3)",
                  background: "var(--bg-input)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-md)",
                  color: "var(--text-primary)",
                  fontSize: "var(--font-size-base)",
                  fontFamily: "var(--font-ui)",
                  resize: "vertical",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: "var(--space-3)" }}>
              <div style={{ flex: 1 }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "var(--font-size-sm)",
                    color: "var(--text-secondary)",
                    marginBottom: "var(--space-1)",
                  }}
                >
                  Agent
                </label>
                <select
                  value={agentType}
                  onChange={(e) => setAgentType(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "var(--space-2) var(--space-3)",
                    background: "var(--bg-input)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-md)",
                    color: "var(--text-primary)",
                    fontSize: "var(--font-size-sm)",
                  }}
                >
                  {AGENT_TYPES.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "var(--font-size-sm)",
                    color: "var(--text-secondary)",
                    marginBottom: "var(--space-1)",
                  }}
                >
                  Model
                </label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "var(--space-2) var(--space-3)",
                    background: "var(--bg-input)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-md)",
                    color: "var(--text-primary)",
                    fontSize: "var(--font-size-sm)",
                  }}
                >
                  {MODELS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "var(--font-size-sm)",
                  color: "var(--text-secondary)",
                  marginBottom: "var(--space-1)",
                }}
              >
                Target Branch
              </label>
              <select
                value={targetBranch}
                onChange={(e) => setTargetBranch(e.target.value)}
                style={{
                  width: "100%",
                  padding: "var(--space-2) var(--space-3)",
                  background: "var(--bg-input)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-md)",
                  color: "var(--text-primary)",
                  fontSize: "var(--font-size-sm)",
                }}
              >
                {branches.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
                {branches.length === 0 && <option value="main">main</option>}
              </select>
            </div>
          </div>
        )}

        {mode === "From Branch" && (
          <div style={{ color: "var(--text-tertiary)", fontSize: "var(--font-size-sm)", padding: "var(--space-4)" }}>
            Select a branch to create a workspace from. (Coming soon)
          </div>
        )}

        {mode === "From PR" && (
          <div style={{ color: "var(--text-tertiary)", fontSize: "var(--font-size-sm)", padding: "var(--space-4)" }}>
            Enter a PR number to create a workspace from. (Coming soon)
          </div>
        )}

        {mode === "From Issue" && (
          <div style={{ color: "var(--text-tertiary)", fontSize: "var(--font-size-sm)", padding: "var(--space-4)" }}>
            Link a GitHub or Linear issue. (Coming soon)
          </div>
        )}

        {/* Actions */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "var(--space-2)",
            marginTop: "var(--space-4)",
            paddingTop: "var(--space-4)",
            borderTop: "1px solid var(--border-subtle)",
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "var(--space-2) var(--space-4)",
              background: "transparent",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              color: "var(--text-secondary)",
              fontSize: "var(--font-size-sm)",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              padding: "var(--space-2) var(--space-4)",
              background: loading ? "var(--accent-muted)" : "var(--accent-primary)",
              border: "none",
              borderRadius: "var(--radius-md)",
              color: "var(--bg-base)",
              fontSize: "var(--font-size-sm)",
              fontWeight: 600,
              cursor: loading ? "wait" : "pointer",
            }}
          >
            {loading ? "Creating..." : "Create Workspace"}
          </button>
        </div>
      </div>
    </div>
  );
}
