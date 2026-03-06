import { useEffect, useRef } from "react";
import type { MessageInfo } from "../../hooks/useSession";

interface AgentOutputRendererProps {
  messages: MessageInfo[];
  agentStatus: string;
}

export function AgentOutputRenderer({ messages, agentStatus }: AgentOutputRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    const el = containerRef.current;
    if (el && isNearBottomRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const threshold = 100;
    isNearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
  };

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      style={{
        flex: 1,
        overflow: "auto",
        fontFamily: "var(--font-mono), 'JetBrains Mono', 'Fira Code', monospace",
        fontSize: 13,
        lineHeight: 1.6,
        padding: "var(--space-3) var(--space-4)",
        backgroundColor: "#1a1612",
        color: "#d4c4a8",
      }}
    >
      {messages.length === 0 && agentStatus !== "running" && (
        <div style={{ color: "#6a5d4d", padding: "var(--space-2) 0" }}>
          <span style={{ color: "#d4c4a8" }}>❯</span>{" "}
          <span style={{ color: "#6a5d4d", fontStyle: "italic" }}>Waiting for input...</span>
        </div>
      )}

      {messages.map((msg, i) => (
        <MessageLine key={msg.id || i} message={msg} />
      ))}

      {agentStatus === "running" && (
        <div style={{ color: "#6a5d4d", padding: "var(--space-1) 0" }}>
          <span style={{ animation: "pulse 1.5s infinite" }}>●</span>{" "}
          <span style={{ fontStyle: "italic" }}>Agent is working...</span>
        </div>
      )}
    </div>
  );
}

function MessageLine({ message }: { message: MessageInfo }) {
  const { role, content } = message;

  if (role === "user") {
    return (
      <div
        data-message-id={message.id}
        style={{ padding: "var(--space-2) 0", borderTop: "1px solid #2e2722" }}
      >
        <span style={{ color: "#d4935a", fontWeight: 600 }}>❯</span>{" "}
        <span style={{ color: "#f0e6d3" }}>{content}</span>
      </div>
    );
  }

  if (role === "assistant") {
    return (
      <div data-message-id={message.id} style={{ padding: "var(--space-1) 0" }}>
        <AssistantContent content={content} />
      </div>
    );
  }

  if (role === "tool_use") {
    // Parse tool name from content or show as command
    const toolMatch = content.match(/^(\w+)(?:\s+(.*))?$/s);
    const toolName = toolMatch?.[1] ?? "tool";
    const toolArgs = toolMatch?.[2] ?? "";

    return (
      <div data-message-id={message.id} style={{ padding: "var(--space-1) 0" }}>
        <span style={{ color: "#4a7b9b" }}>⟡ {toolName}</span>
        {toolArgs && (
          <span style={{ color: "#6a5d4d", marginLeft: 8 }}>
            {toolArgs.length > 200 ? toolArgs.slice(0, 200) + "..." : toolArgs}
          </span>
        )}
      </div>
    );
  }

  if (role === "tool_result") {
    if (!content || content.trim().length === 0) return null;

    const truncated = content.length > 500 ? content.slice(0, 500) + "\n..." : content;
    return (
      <div data-message-id={message.id} style={{ padding: "var(--space-1) 0" }}>
        <pre
          style={{
            margin: 0,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            color: "#8a7d6d",
            fontSize: 12,
            paddingLeft: 16,
            borderLeft: "2px solid #2e2722",
          }}
        >
          {truncated}
        </pre>
      </div>
    );
  }

  if (role === "thinking") {
    return (
      <div data-message-id={message.id} style={{ padding: "var(--space-1) 0" }}>
        <details style={{ color: "#6a5d4d" }}>
          <summary style={{ cursor: "pointer", fontSize: 12 }}>
            💭 Thinking...
          </summary>
          <pre
            style={{
              margin: "var(--space-1) 0 0",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              fontSize: 12,
              paddingLeft: 16,
              color: "#6a5d4d",
            }}
          >
            {content}
          </pre>
        </details>
      </div>
    );
  }

  if (role === "error") {
    return (
      <div data-message-id={message.id} style={{ padding: "var(--space-1) 0" }}>
        <span style={{ color: "#c14a4a" }}>✗ Error:</span>{" "}
        <span style={{ color: "#e06c75" }}>{content}</span>
      </div>
    );
  }

  if (role === "system") {
    return (
      <div
        data-message-id={message.id}
        style={{
          padding: "var(--space-2) 0",
          color: "#6a5d4d",
          fontStyle: "italic",
          fontSize: 12,
          textAlign: "center",
        }}
      >
        — {content} —
      </div>
    );
  }

  // Fallback for unknown roles
  return (
    <div data-message-id={message.id} style={{ padding: "var(--space-1) 0" }}>
      <span style={{ color: "#6a5d4d" }}>[{role}]</span> {content}
    </div>
  );
}

function AssistantContent({ content }: { content: string }) {
  // Simple rendering: detect code blocks and render them differently
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("```") && part.endsWith("```")) {
          // Code block
          const inner = part.slice(3, -3);
          const firstNewline = inner.indexOf("\n");
          const code = firstNewline >= 0 ? inner.slice(firstNewline + 1) : inner;
          return (
            <pre
              key={i}
              style={{
                margin: "var(--space-1) 0",
                padding: "var(--space-2) var(--space-3)",
                backgroundColor: "#141110",
                borderRadius: 4,
                border: "1px solid #2e2722",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                color: "#d4c4a8",
                fontSize: 12,
              }}
            >
              {code}
            </pre>
          );
        }

        // Regular text — handle inline formatting simply
        return (
          <span key={i} style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
            {part}
          </span>
        );
      })}
    </>
  );
}
