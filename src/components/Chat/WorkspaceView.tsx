import { useEffect, useState, useCallback } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { TerminalPanel } from "../Terminal/Terminal";
import { Composer } from "./Composer";
import { AgentOutputRenderer } from "../Agent/AgentOutputRenderer";
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
    messages,
    agentStatus,
    createSession,
    sendMessage,
    loadMessages,
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
        loadMessages(last.id);
      } else {
        setActiveSessionId(null);
      }
    });
  }, [workspaceId, listWorkspaceSessions, loadMessages]);

  // Load messages when switching active session
  useEffect(() => {
    if (activeSessionId && !messages[activeSessionId]) {
      loadMessages(activeSessionId);
    }
  }, [activeSessionId, messages, loadMessages]);

  const sessionMessages = activeSessionId ? messages[activeSessionId] ?? [] : [];
  const status = activeSessionId ? agentStatus[activeSessionId] ?? "idle" : "idle";

  const handleSend = useCallback(
    async (content: string) => {
      if (activeSessionId) {
        await sendMessage(activeSessionId, content);
      } else {
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
      {/* Agent info header */}
      <div
        style={{
          padding: "var(--space-2) var(--space-4)",
          borderBottom: "1px solid var(--border-subtle)",
          display: "flex",
          alignItems: "center",
          gap: "var(--space-3)",
          flexShrink: 0,
          backgroundColor: "var(--bg-base)",
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

        {/* Model + version info */}
        <span style={{ fontSize: "var(--font-size-xs)", color: "var(--text-tertiary)" }}>
          {model === "claude-opus-4-6" ? "Opus 4.6" : model === "claude-sonnet-4-6" ? "Sonnet 4.6" : model}
        </span>

        {/* Status */}
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

        {/* Worktree path */}
        <span
          style={{
            fontSize: "var(--font-size-xs)",
            color: "var(--text-tertiary)",
            fontFamily: "var(--font-mono)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            maxWidth: 300,
          }}
        >
          {worktreePath ?? workspaceName}
        </span>
      </div>

      {/* Main content: agent output + shell terminal split */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        <PanelGroup direction="vertical" autoSaveId={`workspace-split-${workspaceId}`}>
          {/* Agent output — terminal-style message renderer */}
          <Panel defaultSize={65} minSize={20}>
            <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
              <AgentOutputRenderer
                messages={sessionMessages}
                agentStatus={initializing ? "running" : status}
              />
            </div>
          </Panel>

          <PanelResizeHandle
            style={{
              height: 4,
              backgroundColor: "var(--bg-surface)",
              cursor: "row-resize",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: 32,
                height: 2,
                backgroundColor: "var(--border)",
                borderRadius: 1,
              }}
            />
          </PanelResizeHandle>

          {/* Shell terminal at bottom */}
          <Panel defaultSize={35} minSize={10}>
            <div
              style={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* Terminal header bar */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "var(--space-1) var(--space-3)",
                  gap: "var(--space-2)",
                  borderBottom: "1px solid var(--border-subtle)",
                  backgroundColor: "var(--bg-surface)",
                  flexShrink: 0,
                }}
              >
                <span style={{ fontSize: "var(--font-size-xs)", color: "var(--text-secondary)" }}>
                  &gt;_ Terminal 1
                </span>
                <div style={{ flex: 1 }} />
                <span
                  style={{
                    fontSize: 10,
                    color: "var(--text-tertiary)",
                    background: "var(--bg-elevated)",
                    padding: "1px 6px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border-subtle)",
                    fontWeight: 600,
                    letterSpacing: "0.5px",
                  }}
                >
                  WORKTREE
                </span>
              </div>

              {/* xterm.js shell */}
              <div style={{ flex: 1, overflow: "hidden" }}>
                <TerminalPanel workspaceId={workspaceId} />
              </div>
            </div>
          </Panel>
        </PanelGroup>
      </div>

      {/* Composer at bottom */}
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
