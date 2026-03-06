import { useEffect, useState, useCallback } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { TerminalPanel } from "../Terminal/Terminal";
import { Composer } from "./Composer";
import { useSessionStore, setupAgentEventListeners } from "../../hooks/useSession";

interface WorkspaceViewProps {
  workspaceId: string;
  workspaceName: string;
  agentType?: string;
  model?: string;
  worktreePath?: string;
}

export function WorkspaceView({
  workspaceId,
  workspaceName,
  agentType,
  model: initialModel,
  worktreePath,
}: WorkspaceViewProps) {
  const {
    sessions,
    agentStatus,
    createSession,
    sendMessage,
    listWorkspaceSessions,
    updateSession,
  } = useSessionStore();

  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [model, setModel] = useState(initialModel ?? "claude-sonnet-4-6");
  const [initializing, setInitializing] = useState(false);
  const [isPlanMode, setIsPlanMode] = useState(false);

  // Setup event listeners once
  useEffect(() => {
    setupAgentEventListeners();
  }, []);

  // Load sessions for this workspace
  useEffect(() => {
    listWorkspaceSessions(workspaceId).then((list) => {
      if (list.length > 0) {
        const last = list[list.length - 1];
        setActiveSessionId(last.id);
      } else {
        setActiveSessionId(null);
      }
    });
  }, [workspaceId, listWorkspaceSessions]);

  const status = activeSessionId ? agentStatus[activeSessionId] ?? "idle" : "idle";

  const handleSend = useCallback(
    async (content: string) => {
      if (activeSessionId) {
        await sendMessage(activeSessionId, content);
      } else {
        // Create a new session with this message
        setInitializing(true);
        try {
          const session = await createSession({
            workspace_id: workspaceId,
            agent_type: agentType ?? "claude-code",
            model,
            task_prompt: content,
            thinking_enabled: false,
          });
          setActiveSessionId(session.id);
        } finally {
          setInitializing(false);
        }
      }
    },
    [activeSessionId, sendMessage, createSession, workspaceId, model, agentType]
  );

  const handlePlanModeToggle = useCallback(async () => {
    const newMode = !isPlanMode;
    setIsPlanMode(newMode);
    if (activeSessionId) {
      await updateSession(activeSessionId, undefined, newMode ? "plan" : "default");
    }
  }, [isPlanMode, activeSessionId, updateSession]);

  const handleSlashCommand = useCallback(
    async (command: string) => {
      if (activeSessionId) {
        await sendMessage(activeSessionId, command);
      }
    },
    [activeSessionId, sendMessage]
  );

  const agentLabel = agentType === "codex" ? "Codex" : "Claude Code";

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Agent header bar — like emdash's agent info */}
      <div
        style={{
          padding: "var(--space-2) var(--space-4)",
          borderBottom: "1px solid var(--border-subtle)",
          display: "flex",
          alignItems: "center",
          gap: "var(--space-3)",
          flexShrink: 0,
        }}
      >
        {/* Agent badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            padding: "var(--space-1) var(--space-3)",
            background: "var(--bg-surface)",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <span style={{ fontSize: "var(--font-size-sm)", fontWeight: 500, color: "var(--text-primary)" }}>
            {agentLabel}
          </span>
        </div>

        {/* Status indicator */}
        {(status === "running" || initializing) && (
          <span
            style={{
              fontSize: "var(--font-size-xs)",
              color: "var(--success)",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                backgroundColor: "var(--success)",
                display: "inline-block",
                animation: "pulse 2s infinite",
              }}
            />
            Running
          </span>
        )}

        <div style={{ flex: 1 }} />

        {/* Workspace name + path */}
        <span
          style={{
            fontSize: "var(--font-size-xs)",
            color: "var(--text-tertiary)",
            fontFamily: "var(--font-mono)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {worktreePath ?? workspaceName}
        </span>
      </div>

      {/* Main content: terminal-first view */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        <PanelGroup direction="vertical">
          {/* Agent terminal — the main view */}
          <Panel defaultSize={70} minSize={30}>
            <TerminalPanel workspaceId={workspaceId} bigMode />
          </Panel>

          <PanelResizeHandle
            style={{
              height: 1,
              backgroundColor: "var(--border-subtle)",
              cursor: "row-resize",
            }}
          />

          {/* Shell terminal at bottom */}
          <Panel defaultSize={30} minSize={15}>
            <div
              style={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                borderTop: "1px solid var(--border-subtle)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "var(--space-1) var(--space-3)",
                  gap: "var(--space-2)",
                  borderBottom: "1px solid var(--border-subtle)",
                  flexShrink: 0,
                }}
              >
                <span style={{ fontSize: "var(--font-size-xs)", color: "var(--text-secondary)" }}>
                  &gt;_ Terminal 1
                </span>
                <div style={{ flex: 1 }} />
                <span
                  style={{
                    fontSize: "var(--font-size-xs)",
                    color: "var(--text-tertiary)",
                    background: "var(--bg-surface)",
                    padding: "1px 6px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  WORKTREE
                </span>
              </div>
              <div style={{ flex: 1, overflow: "hidden" }}>
                <TerminalPanel workspaceId={workspaceId + "-shell"} />
              </div>
            </div>
          </Panel>
        </PanelGroup>
      </div>

      {/* Composer at bottom — simplified */}
      <Composer
        onSend={handleSend}
        disabled={initializing || status === "running"}
        workspaceId={workspaceId}
        model={model}
        onModelChange={setModel}
        contextPercent={
          activeSessionId
            ? sessions[activeSessionId]?.context_used_percent ?? 0
            : 0
        }
        isPlanMode={isPlanMode}
        onPlanModeToggle={handlePlanModeToggle}
        onSlashCommand={handleSlashCommand}
      />
    </div>
  );
}
