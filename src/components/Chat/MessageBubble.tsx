import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { MessageInfo } from "../../hooks/useSession";

interface MessageBubbleProps {
  message: MessageInfo;
  onRevert?: (messageId: string, turnId: string) => void;
}

export function MessageBubble({ message, onRevert }: MessageBubbleProps) {
  const [showMeta, setShowMeta] = useState(false);

  const isUser = message.role === "user";
  const isError = message.role === "error";
  const isToolUse = message.role === "tool_use";
  const isToolResult = message.role === "tool_result";
  const isThinking = message.role === "thinking";
  const isSystem = message.role === "system";

  if (isThinking) {
    return <ThinkingBlock content={message.content} />;
  }

  if (isToolUse || isToolResult) {
    return <ToolCallCard message={message} />;
  }

  if (isSystem) {
    return (
      <div style={{ padding: "var(--space-2) var(--space-4)", textAlign: "center" }}>
        <span style={{ color: "var(--text-tertiary)", fontSize: "var(--font-size-xs)", fontStyle: "italic" }}>
          {message.content}
        </span>
      </div>
    );
  }

  return (
    <div
      data-message-id={message.id}
      style={{
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
        padding: "var(--space-2) var(--space-4)",
      }}
    >
      <div
        style={{
          maxWidth: isUser ? "75%" : "90%",
          padding: "var(--space-3) var(--space-4)",
          borderRadius: "var(--radius-lg)",
          backgroundColor: isUser
            ? "var(--accent-bg)"
            : isError
              ? "var(--error-bg)"
              : "var(--bg-surface)",
          borderLeft: isError ? "3px solid var(--error)" : undefined,
          color: isError ? "var(--error)" : "var(--text-primary)",
          fontSize: "var(--font-size-base)",
          lineHeight: 1.6,
          position: "relative",
        }}
        onMouseEnter={() => setShowMeta(true)}
        onMouseLeave={() => setShowMeta(false)}
      >
        {isUser ? (
          <div style={{ whiteSpace: "pre-wrap" }}>{message.content}</div>
        ) : (
          <div className="markdown-body">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ className, children, ...props }) {
                  const isInline = !className;
                  return isInline ? (
                    <code
                      style={{
                        backgroundColor: "var(--bg-input)",
                        padding: "1px 4px",
                        borderRadius: "var(--radius-sm)",
                        fontFamily: "var(--font-mono)",
                        fontSize: "var(--font-size-sm)",
                      }}
                      {...props}
                    >
                      {children}
                    </code>
                  ) : (
                    <code
                      className={className}
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "var(--font-size-sm)",
                      }}
                      {...props}
                    >
                      {children}
                    </code>
                  );
                },
                pre({ children }) {
                  return (
                    <pre
                      style={{
                        backgroundColor: "var(--bg-input)",
                        padding: "var(--space-3)",
                        borderRadius: "var(--radius-md)",
                        overflow: "auto",
                        border: "1px solid var(--border)",
                      }}
                    >
                      {children}
                    </pre>
                  );
                },
                a({ href, children }) {
                  return (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "var(--accent-primary)", textDecoration: "underline" }}
                    >
                      {children}
                    </a>
                  );
                },
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}

        {showMeta && !isUser && (
          <div
            style={{
              position: "absolute",
              top: -28,
              left: 0,
              backgroundColor: "var(--bg-elevated)",
              padding: "var(--space-1) var(--space-2)",
              borderRadius: "var(--radius-sm)",
              fontSize: "var(--font-size-xs)",
              color: "var(--text-tertiary)",
              whiteSpace: "nowrap",
              boxShadow: "var(--shadow-sm)",
              zIndex: 10,
              display: "flex",
              alignItems: "center",
              gap: "var(--space-2)",
            }}
          >
            {message.model && <span>{message.model}</span>}
            {message.sent_at && (
              <span>
                {new Date(message.sent_at).toLocaleTimeString()}
              </span>
            )}
            {onRevert && message.turn_id && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRevert(message.id, message.turn_id!);
                }}
                style={{
                  background: "none",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--text-tertiary)",
                  fontSize: "var(--font-size-xs)",
                  cursor: "pointer",
                  padding: "0 var(--space-1)",
                }}
              >
                Revert to here
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ThinkingBlock({ content }: { content: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{ padding: "var(--space-1) var(--space-4)" }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "var(--text-tertiary)",
          fontSize: "var(--font-size-xs)",
          fontStyle: "italic",
          padding: "var(--space-1) 0",
          display: "flex",
          alignItems: "center",
          gap: "var(--space-1)",
        }}
      >
        <span style={{ transform: expanded ? "rotate(90deg)" : "none", display: "inline-block", transition: "transform 150ms ease" }}>
          ▶
        </span>
        Thinking...
      </button>
      {expanded && (
        <div
          style={{
            padding: "var(--space-2) var(--space-3)",
            color: "var(--text-tertiary)",
            fontStyle: "italic",
            fontSize: "var(--font-size-sm)",
            borderLeft: "2px solid var(--border-subtle)",
            marginLeft: "var(--space-2)",
            whiteSpace: "pre-wrap",
          }}
        >
          {content}
        </div>
      )}
    </div>
  );
}

function ToolCallCard({ message }: { message: MessageInfo }) {
  const [expanded, setExpanded] = useState(false);
  const isResult = message.role === "tool_result";

  // Try to parse the content for tool name
  let toolLabel = isResult ? "Tool Result" : "Tool Call";
  let displayContent = message.content;

  if (!isResult) {
    // For tool_use, content is the tool name
    toolLabel = message.content;
    displayContent = "";
    // Try to get args from full_message
    if (message.full_message) {
      try {
        const parsed = JSON.parse(message.full_message);
        displayContent = parsed.input
          ? JSON.stringify(parsed.input, null, 2)
          : message.full_message;
      } catch {
        displayContent = message.full_message;
      }
    }
  }

  return (
    <div style={{ padding: "var(--space-1) var(--space-4)" }}>
      <div
        style={{
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-md)",
          backgroundColor: "var(--bg-surface)",
          overflow: "hidden",
        }}
      >
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            width: "100%",
            padding: "var(--space-2) var(--space-3)",
            background: "none",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            color: "var(--text-secondary)",
            fontSize: "var(--font-size-sm)",
            textAlign: "left",
          }}
        >
          <span
            style={{
              transform: expanded ? "rotate(90deg)" : "none",
              display: "inline-block",
              transition: "transform 150ms ease",
              fontSize: "var(--font-size-xs)",
            }}
          >
            ▶
          </span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "var(--font-size-sm)",
              color: isResult ? "var(--text-tertiary)" : "var(--accent-primary)",
            }}
          >
            {toolLabel}
          </span>
        </button>

        {expanded && displayContent && (
          <div
            style={{
              borderTop: "1px solid var(--border-subtle)",
              padding: "var(--space-2) var(--space-3)",
            }}
          >
            <pre
              style={{
                margin: 0,
                fontFamily: "var(--font-mono)",
                fontSize: "var(--font-size-sm)",
                color: "var(--text-secondary)",
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
              }}
            >
              {displayContent}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
