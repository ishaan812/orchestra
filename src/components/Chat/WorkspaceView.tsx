import { useEffect, useState, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ConversationThread } from "./ConversationThread";
import { Composer } from "./Composer";
import { ChatTabs } from "./ChatTabs";
import { TableOfContents, TocToggleButton } from "./TableOfContents";
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
    workspaceSessions,
    createSession,
    sendMessage,
    loadMessages,
    listWorkspaceSessions,
    updateSession,
    hideSession,
  } = useSessionStore();

  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [model, setModel] = useState("claude-sonnet-4-6");
  const [initializing, setInitializing] = useState(false);
  const [isPlanMode, setIsPlanMode] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

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

  const sessionIds = workspaceSessions[workspaceId] ?? [];
  const sessionMessages = activeSessionId ? messages[activeSessionId] ?? [] : [];
  const status = activeSessionId ? agentStatus[activeSessionId] ?? "idle" : "idle";

  const handleNewChat = useCallback(() => {
    // Just clear active session - first message will create a new one
    setActiveSessionId(null);
  }, []);

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
            agent_type: "claude-code",
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
    [activeSessionId, sendMessage, createSession, workspaceId, model]
  );

  const handleCloseChat = useCallback(
    async (sessionId: string) => {
      await hideSession(sessionId);
      // If we closed the active tab, switch to the last remaining one
      if (sessionId === activeSessionId) {
        const remaining = sessionIds.filter((id) => id !== sessionId);
        setActiveSessionId(remaining.length > 0 ? remaining[remaining.length - 1] : null);
      }
    },
    [hideSession, activeSessionId, sessionIds]
  );

  const handleRenameChat = useCallback(
    async (sessionId: string, title: string) => {
      await updateSession(sessionId, title);
    },
    [updateSession]
  );

  const handlePlanModeToggle = useCallback(async () => {
    const newMode = !isPlanMode;
    setIsPlanMode(newMode);
    if (activeSessionId) {
      await updateSession(activeSessionId, undefined, newMode ? "plan" : "default");
    }
  }, [isPlanMode, activeSessionId, updateSession]);

  const handlePlanApprove = useCallback(async () => {
    if (activeSessionId) {
      await sendMessage(activeSessionId, "Approved. Please proceed with implementation.");
      setIsPlanMode(false);
      await updateSession(activeSessionId, undefined, "default");
    }
  }, [activeSessionId, sendMessage, updateSession]);

  const handlePlanApproveWithFeedback = useCallback(
    async (feedback: string) => {
      if (activeSessionId) {
        await sendMessage(activeSessionId, `Approved with feedback: ${feedback}`);
        setIsPlanMode(false);
        await updateSession(activeSessionId, undefined, "default");
      }
    },
    [activeSessionId, sendMessage, updateSession]
  );

  const handlePlanReject = useCallback(async () => {
    if (activeSessionId) {
      await sendMessage(activeSessionId, "Plan rejected. Please revise the plan.");
    }
  }, [activeSessionId, sendMessage]);

  const handlePlanSendToNewChat = useCallback(
    (content: string) => {
      handleNewChat();
      // Store the plan content to be sent as first message in new chat
      localStorage.setItem(`orchestra-plan-handoff-${workspaceId}`, content);
    },
    [handleNewChat, workspaceId]
  );

  const handlePlanSendToWorkspace = useCallback(
    (_content: string) => {
      // This would trigger new workspace creation — handled at App level
      // For now, store and let the parent handle it
    },
    []
  );

  const handleRevertToMessage = useCallback(
    async (messageId: string, turnId: string) => {
      if (!activeSessionId) return;
      const confirmed = window.confirm(
        "This will undo code changes and remove messages after this point. Continue?"
      );
      if (!confirmed) return;
      await invoke("restore_checkpoint", {
        sessionId: activeSessionId,
        turnId,
        messageId,
      });
      // Reload messages to reflect deletion
      await loadMessages(activeSessionId);
    },
    [activeSessionId, loadMessages]
  );

  const handleScrollToMessage = useCallback((messageId: string) => {
    const el = document.querySelector(`[data-message-id="${messageId}"]`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, []);

  // Cmd+T shortcut for new chat
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey && e.key === "t") {
        e.preventDefault();
        handleNewChat();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleNewChat]);

  const chatTabs = sessionIds.map((id) => ({
    id,
    title: sessions[id]?.title ?? null,
    unreadCount: sessions[id]?.unread_count ?? 0,
    isActive: id === activeSessionId,
  }));

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
        <div style={{ flex: 1 }} />
        <TocToggleButton onClick={() => setTocOpen(!tocOpen)} />
      </div>

      {/* Chat tabs */}
      <ChatTabs
        tabs={chatTabs}
        activeSessionId={activeSessionId}
        onSelect={(id) => {
          setActiveSessionId(id);
        }}
        onClose={handleCloseChat}
        onNewChat={handleNewChat}
        onRename={handleRenameChat}
      />

      {/* Messages */}
      <div ref={messagesContainerRef} style={{ flex: 1, overflow: "hidden", position: "relative" }}>
        <TableOfContents
          open={tocOpen}
          onClose={() => setTocOpen(false)}
          messages={sessionMessages}
          onScrollToMessage={handleScrollToMessage}
        />
        <ConversationThread
          messages={sessionMessages}
          agentStatus={initializing ? "running" : status}
          isPlanMode={isPlanMode}
          onPlanApprove={handlePlanApprove}
          onPlanApproveWithFeedback={handlePlanApproveWithFeedback}
          onPlanReject={handlePlanReject}
          onPlanSendToNewChat={handlePlanSendToNewChat}
          onPlanSendToWorkspace={handlePlanSendToWorkspace}
          onRevertToMessage={handleRevertToMessage}
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
          activeSessionId
            ? sessions[activeSessionId]?.context_used_percent ?? 0
            : 0
        }
        isPlanMode={isPlanMode}
        onPlanModeToggle={handlePlanModeToggle}
      />
    </div>
  );
}
