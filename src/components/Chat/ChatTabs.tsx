import { useState, useRef, useCallback } from "react";

interface ChatTab {
  id: string;
  title: string | null;
  unreadCount: number;
  isActive: boolean;
}

interface ChatTabsProps {
  tabs: ChatTab[];
  activeSessionId: string | null;
  onSelect: (sessionId: string) => void;
  onClose: (sessionId: string) => void;
  onNewChat: () => void;
  onRename: (sessionId: string, title: string) => void;
}

export function ChatTabs({
  tabs,
  activeSessionId,
  onSelect,
  onClose,
  onNewChat,
  onRename,
}: ChatTabsProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const startRename = useCallback(
    (id: string, currentTitle: string) => {
      setEditingId(id);
      setEditValue(currentTitle);
      setTimeout(() => inputRef.current?.select(), 0);
    },
    []
  );

  const commitRename = useCallback(() => {
    if (editingId && editValue.trim()) {
      onRename(editingId, editValue.trim());
    }
    setEditingId(null);
  }, [editingId, editValue, onRename]);

  if (tabs.length <= 1) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        borderBottom: "1px solid var(--border-subtle)",
        padding: "0 var(--space-2)",
        minHeight: 32,
        gap: 1,
        overflowX: "auto",
        scrollbarWidth: "none",
      }}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeSessionId;
        const label = tab.title || "New Chat";

        return (
          <div
            key={tab.id}
            onClick={() => onSelect(tab.id)}
            onDoubleClick={() => startRename(tab.id, label)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-1)",
              padding: "var(--space-1) var(--space-2)",
              borderBottom: isActive
                ? "2px solid var(--accent-primary)"
                : "2px solid transparent",
              color: isActive ? "var(--text-primary)" : "var(--text-tertiary)",
              fontSize: "var(--font-size-xs)",
              cursor: "pointer",
              whiteSpace: "nowrap",
              maxWidth: 160,
              flexShrink: 0,
              transition: "color 150ms ease",
            }}
          >
            {editingId === tab.id ? (
              <input
                ref={inputRef}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={commitRename}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitRename();
                  if (e.key === "Escape") setEditingId(null);
                }}
                onClick={(e) => e.stopPropagation()}
                style={{
                  background: "var(--bg-input)",
                  border: "1px solid var(--border-focus)",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--text-primary)",
                  fontSize: "var(--font-size-xs)",
                  padding: "0 var(--space-1)",
                  width: 100,
                  outline: "none",
                }}
              />
            ) : (
              <span
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {label}
              </span>
            )}

            {tab.unreadCount > 0 && (
              <span
                style={{
                  backgroundColor: "var(--accent-primary)",
                  color: "var(--bg-base)",
                  fontSize: 9,
                  fontWeight: 700,
                  borderRadius: "var(--radius-full)",
                  minWidth: 14,
                  height: 14,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0 3px",
                  flexShrink: 0,
                }}
              >
                {tab.unreadCount}
              </span>
            )}

            {tabs.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClose(tab.id);
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-tertiary)",
                  cursor: "pointer",
                  fontSize: 10,
                  padding: 0,
                  lineHeight: 1,
                  flexShrink: 0,
                  opacity: isActive ? 1 : 0.5,
                }}
              >
                ✕
              </button>
            )}
          </div>
        );
      })}

      <button
        onClick={onNewChat}
        title="New chat (Cmd+T)"
        style={{
          background: "none",
          border: "none",
          color: "var(--text-tertiary)",
          cursor: "pointer",
          fontSize: "var(--font-size-sm)",
          padding: "var(--space-1) var(--space-2)",
          flexShrink: 0,
        }}
      >
        +
      </button>
    </div>
  );
}
