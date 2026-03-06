import { useState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { AGENTS, getAgent, getAgentModels } from "../../constants/agents";
import { AgentLogo } from "../Agents/AgentLogo";
import { useCliAgentDetection } from "../../hooks/useCliAgentDetection";
import "./NewWorkspaceDialog.css";

const MODES = ["New Task", "From Branch", "From Issue"] as const;

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
  const [agentId, setAgentId] = useState("claude");
  const [model, setModel] = useState("claude-sonnet-4-6");
  const [targetBranch, setTargetBranch] = useState(branches[0] ?? "main");
  const [loading, setLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { installedIds } = useCliAgentDetection();

  // Update model when agent changes
  useEffect(() => {
    const agent = getAgent(agentId);
    if (agent?.defaultModel) {
      setModel(agent.defaultModel);
    }
  }, [agentId]);

  // Update target branch when branches change
  useEffect(() => {
    if (branches.length > 0 && !branches.includes(targetBranch)) {
      setTargetBranch(branches[0]);
    }
  }, [branches]);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await onSubmit({
        task_prompt: taskPrompt || undefined,
        agent_type: agentId,
        model,
        target_branch: targetBranch,
      });
      setTaskPrompt("");
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      handleSubmit();
    }
  };

  const models = getAgentModels(agentId);

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="nwd-overlay" />
        <Dialog.Content className="nwd-content" onKeyDown={handleKeyDown}>
          <Dialog.Title className="nwd-title">New Workspace</Dialog.Title>

          {/* Mode tabs */}
          <div className="nwd-tabs">
            {MODES.map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`nwd-tab ${mode === m ? "nwd-tab--active" : ""}`}
              >
                {m}
              </button>
            ))}
          </div>

          {mode === "New Task" && (
            <div className="nwd-form">
              {/* Task Description */}
              <div className="nwd-field">
                <label className="nwd-label">Task Description</label>
                <textarea
                  value={taskPrompt}
                  onChange={(e) => setTaskPrompt(e.target.value)}
                  placeholder="Describe what the agent should work on..."
                  rows={3}
                  className="nwd-textarea"
                  autoFocus
                />
                <span className="nwd-hint">Cmd+Enter to create</span>
              </div>

              {/* Agent Selection */}
              <div className="nwd-field">
                <label className="nwd-label">Agent</label>
                <div className="nwd-agent-grid">
                  {AGENTS.map((agent) => (
                    <button
                      key={agent.id}
                      className={`nwd-agent-btn ${
                        agentId === agent.id ? "nwd-agent-btn--selected" : ""
                      }`}
                      onClick={() => setAgentId(agent.id)}
                      type="button"
                    >
                      <AgentLogo agentId={agent.id} size={24} />
                      <div className="nwd-agent-btn__info">
                        <span className="nwd-agent-btn__name">{agent.name}</span>
                        {!installedIds.includes(agent.id) && (
                          <span className="nwd-agent-btn__warning">Not installed</span>
                        )}
                      </div>
                      {agent.terminalOnly && (
                        <span className="nwd-badge">Terminal</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Model & Branch */}
              <div className="nwd-row">
                <div className="nwd-field" style={{ flex: 1 }}>
                  <label className="nwd-label">Model</label>
                  <select
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="nwd-select"
                  >
                    {models.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="nwd-field" style={{ flex: 1 }}>
                  <label className="nwd-label">Target Branch</label>
                  <select
                    value={targetBranch}
                    onChange={(e) => setTargetBranch(e.target.value)}
                    className="nwd-select"
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

              {/* Advanced Settings Toggle */}
              <button
                className="nwd-advanced-toggle"
                onClick={() => setShowAdvanced(!showAdvanced)}
                type="button"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  style={{
                    transform: showAdvanced ? "rotate(90deg)" : "rotate(0)",
                    transition: "transform 0.15s",
                  }}
                >
                  <path d="M4 2L8 6L4 10" stroke="currentColor" strokeWidth="1.5" fill="none" />
                </svg>
                Advanced Settings
              </button>

              {showAdvanced && (
                <div className="nwd-advanced">
                  <p className="nwd-advanced-note">
                    Additional settings like auto-approve mode, custom instructions,
                    and issue linking will appear here.
                  </p>
                </div>
              )}
            </div>
          )}

          {mode === "From Branch" && (
            <div className="nwd-placeholder">
              <p>Select an existing branch to create a workspace from.</p>
              <select
                value={targetBranch}
                onChange={(e) => setTargetBranch(e.target.value)}
                className="nwd-select"
                style={{ width: "100%" }}
              >
                {branches.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
          )}

          {mode === "From Issue" && (
            <div className="nwd-placeholder">
              <p>Link a GitHub or Linear issue to auto-generate a task.</p>
              <div className="nwd-issue-search">
                <input
                  type="text"
                  placeholder="Search issues..."
                  className="nwd-input"
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="nwd-actions">
            <Dialog.Close asChild>
              <button className="nwd-btn nwd-btn--secondary">Cancel</button>
            </Dialog.Close>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="nwd-btn nwd-btn--primary"
            >
              {loading ? "Creating..." : "Create Workspace"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
