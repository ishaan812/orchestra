import { useEffect, useRef, useState, useCallback } from "react";
import { MessageBubble } from "./MessageBubble";
import type { MessageInfo } from "../../hooks/useSession";

interface ConversationThreadProps {
  messages: MessageInfo[];
  agentStatus: string;
}

export function ConversationThread({ messages, agentStatus }: ConversationThreadProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showJumpButton, setShowJumpButton] = useState(false);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    setIsAtBottom(true);
    setShowJumpButton(false);
  }, []);

  // Auto-scroll on new messages if user is at bottom
  useEffect(() => {
    if (isAtBottom) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    } else {
      setShowJumpButton(true);
    }
  }, [messages.length, isAtBottom]);

  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const threshold = 100;
    const atBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < threshold;

    setIsAtBottom(atBottom);
    if (atBottom) {
      setShowJumpButton(false);
    }
  }, []);

  if (messages.length === 0) {
    return (
      <div
        style={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: "var(--space-2)",
        }}
      >
        <span style={{ color: "var(--text-tertiary)", fontSize: "var(--font-size-md)" }}>
          No messages yet
        </span>
        <span style={{ color: "var(--text-tertiary)", fontSize: "var(--font-size-sm)" }}>
          Send a message to start the conversation
        </span>
      </div>
    );
  }

  return (
    <div style={{ height: "100%", position: "relative" }}>
      <div
        ref={containerRef}
        onScroll={handleScroll}
        style={{
          height: "100%",
          overflowY: "auto",
          paddingTop: "var(--space-4)",
          paddingBottom: "var(--space-4)",
        }}
      >
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {agentStatus === "running" && <StatusLine />}

        <div ref={bottomRef} />
      </div>

      {showJumpButton && (
        <button
          onClick={scrollToBottom}
          style={{
            position: "absolute",
            bottom: 16,
            left: "50%",
            transform: "translateX(-50%)",
            padding: "var(--space-2) var(--space-4)",
            backgroundColor: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-xl)",
            color: "var(--text-secondary)",
            fontSize: "var(--font-size-xs)",
            cursor: "pointer",
            boxShadow: "var(--shadow-md)",
            zIndex: 10,
          }}
        >
          Jump to bottom
        </button>
      )}
    </div>
  );
}

function StatusLine() {
  return (
    <div
      style={{
        padding: "var(--space-2) var(--space-4)",
        display: "flex",
        alignItems: "center",
        gap: "var(--space-2)",
      }}
    >
      <div
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          backgroundColor: "var(--accent-primary)",
          animation: "pulse 1.5s infinite",
        }}
      />
      <span
        style={{
          color: "var(--text-tertiary)",
          fontSize: "var(--font-size-xs)",
          fontStyle: "italic",
        }}
      >
        Agent is working...
      </span>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
