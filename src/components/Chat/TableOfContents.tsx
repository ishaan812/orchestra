import { useState, useMemo } from "react";
import type { MessageInfo } from "../../hooks/useSession";

interface TocEntry {
  id: string;
  label: string;
  type: "user" | "assistant" | "tool" | "plan" | "checkpoint";
  preview: string;
}

interface TableOfContentsProps {
  open: boolean;
  onClose: () => void;
  messages: MessageInfo[];
  onScrollToMessage: (messageId: string) => void;
}

export function TableOfContents({
  open,
  onClose,
  messages,
  onScrollToMessage,
}: TableOfContentsProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const entries = useMemo(() => {
    const result: TocEntry[] = [];
    for (const msg of messages) {
      if (msg.role === "user") {
        result.push({
          id: msg.id,
          label: truncate(msg.content, 50),
          type: "user",
          preview: truncate(msg.content, 100),
        });
      } else if (msg.role === "assistant" || msg.role === "result") {
        result.push({
          id: msg.id,
          label: truncate(msg.content, 50),
          type: "assistant",
          preview: truncate(msg.content, 100),
        });
      } else if (msg.role === "tool_use") {
        result.push({
          id: msg.id,
          label: msg.content,
          type: "tool",
          preview: `Tool: ${msg.content}`,
        });
      }
    }
    return result;
  }, [messages]);

  if (!open) return null;

  const hoveredEntry = entries.find((e) => e.id === hoveredId);

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        width: 280,
        height: "100%",
        backgroundColor: "var(--bg-elevated)",
        borderLeft: "1px solid var(--border)",
        zIndex: 20,
        display: "flex",
        flexDirection: "column",
        boxShadow: "var(--shadow-lg)",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "var(--space-2) var(--space-3)",
          borderBottom: "1px solid var(--border-subtle)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            fontSize: "var(--font-size-sm)",
            fontWeight: 600,
            color: "var(--text-primary)",
          }}
        >
          Table of Contents
        </span>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: "var(--text-tertiary)",
            cursor: "pointer",
            fontSize: "var(--font-size-sm)",
          }}
        >
          ✕
        </button>
      </div>

      {/* Entries */}
      <div style={{ flex: 1, overflow: "auto", padding: "var(--space-2) 0" }}>
        {entries.map((entry) => (
          <button
            key={entry.id}
            onClick={() => onScrollToMessage(entry.id)}
            onMouseEnter={() => setHoveredId(entry.id)}
            onMouseLeave={() => setHoveredId(null)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-2)",
              width: "100%",
              padding: "var(--space-1) var(--space-3)",
              background:
                hoveredId === entry.id ? "var(--bg-surface-hover)" : "none",
              border: "none",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <TypeIcon type={entry.type} />
            <span
              style={{
                fontSize: "var(--font-size-xs)",
                color: "var(--text-secondary)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                flex: 1,
              }}
            >
              {entry.label}
            </span>
          </button>
        ))}

        {entries.length === 0 && (
          <div
            style={{
              padding: "var(--space-4)",
              textAlign: "center",
              color: "var(--text-tertiary)",
              fontSize: "var(--font-size-xs)",
            }}
          >
            No messages yet
          </div>
        )}
      </div>

      {/* Preview tooltip */}
      {hoveredEntry && (
        <div
          style={{
            borderTop: "1px solid var(--border-subtle)",
            padding: "var(--space-2) var(--space-3)",
            fontSize: "var(--font-size-xs)",
            color: "var(--text-tertiary)",
            lineHeight: 1.4,
            maxHeight: 80,
            overflow: "hidden",
          }}
        >
          {hoveredEntry.preview}
        </div>
      )}
    </div>
  );
}

function TypeIcon({ type }: { type: TocEntry["type"] }) {
  const config = {
    user: { icon: "→", color: "var(--accent-primary)" },
    assistant: { icon: "←", color: "var(--text-secondary)" },
    tool: { icon: "⚙", color: "var(--info)" },
    plan: { icon: "📋", color: "var(--warning)" },
    checkpoint: { icon: "◆", color: "var(--success)" },
  };
  const { icon, color } = config[type];

  return (
    <span
      style={{
        fontSize: "var(--font-size-xs)",
        color,
        width: 14,
        textAlign: "center",
        flexShrink: 0,
      }}
    >
      {icon}
    </span>
  );
}

function truncate(text: string, maxLen: number): string {
  const firstLine = text.split("\n")[0];
  if (firstLine.length <= maxLen) return firstLine;
  return firstLine.slice(0, maxLen) + "...";
}

interface TocToggleProps {
  onClick: () => void;
}

export function TocToggleButton({ onClick }: TocToggleProps) {
  return (
    <button
      onClick={onClick}
      title="Table of Contents"
      style={{
        background: "none",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-sm)",
        color: "var(--text-tertiary)",
        cursor: "pointer",
        fontSize: "var(--font-size-xs)",
        padding: "2px var(--space-2)",
      }}
    >
      ToC
    </button>
  );
}
