import { useEffect, useState, useCallback } from "react";
import { ConversationThread } from "./ConversationThread";
import { Composer } from "./Composer";
import { useSessionStore, setupAgentEventListeners } from "../../hooks/useSession";

interface WorkspaceViewProps {
  workspaceId: string;
  workspaceName: string;
}

export function WorkspaceView({ workspaceId, workspaceName }: WorkspaceViewProps) {
  const {
    sessions,
    messages,
    agentStatus,
    createSession,
    sendMessage,
    loadMessages,
  } = useSessionStore();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [model, setModel] = useState("claude-sonnet-4-6");
  const [initializing, setInitializing] = useState(false);

  // Setup event listeners once
  useEffect(() => {
    setupAgentEventListeners();
  }, []);

  // Find existing session for this workspace
  useEffect(() => {
    const existing = Object.values(sessions).find(
      (s) => s.workspace_id === workspaceId
    );
    if (existing) {
      setSessionId(existing.id);
      loadMessages(existing.id);
    } else {
      setSessionId(null);
    }
  }, [workspaceId, sessions, loadMessages]);

  const sessionMessages = sessionId ? messages[sessionId] ?? [] : [];
  const status = sessionId ? agentStatus[sessionId] ?? "idle" : "idle";

  const handleSend = useCallback(
    async (content: string) => {
      if (sessionId) {
        await sendMessage(sessionId, content);
      } else {
        // Create a new session with this message
        setInitializing(true);
        try {
          const session = await createSession({
            workspace_id: workspaceId,
            agent_type: "claude-code",
            model,
            task_prompt: content,
            thinking_enabled: false,
          });
          setSessionId(session.id);
        } finally {
          setInitializing(false);
        }
      }
    },
    [sessionId, sendMessage, createSession, workspaceId, model]
  );

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "var(--space-2) var(--space-4)",
          borderBottom: "1px solid var(--border-subtle)",
          display: "flex",
          alignItems: "center",
          gap: "var(--space-2)",
        }}
      >
        <span
          style={{
            color: "var(--text-primary)",
            fontSize: "var(--font-size-md)",
            fontWeight: 600,
          }}
        >
          {workspaceName}
        </span>
        {status === "running" && (
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
              }}
            />
            Running
          </span>
        )}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        <ConversationThread
          messages={sessionMessages}
          agentStatus={initializing ? "running" : status}
        />
      </div>

      {/* Composer */}
      <Composer
        onSend={handleSend}
        disabled={initializing || status === "running"}
        workspaceId={workspaceId}
        model={model}
        onModelChange={setModel}
        contextPercent={
          sessionId
            ? sessions[sessionId]?.context_used_percent ?? 0
            : 0
        }
      />
    </div>
  );
}
