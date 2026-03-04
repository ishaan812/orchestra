import { useState, useRef, useCallback, useEffect } from "react";
import { PlanToggle } from "./PlanMode";

interface ComposerProps {
  onSend: (content: string) => void;
  disabled: boolean;
  workspaceId: string;
  model: string;
  onModelChange: (model: string) => void;
  contextPercent: number;
  isPlanMode?: boolean;
  onPlanModeToggle?: () => void;
  onSlashCommand?: (command: string) => void;
}

const DRAFT_PREFIX = "orchestra-draft-";

const MODELS = [
  { id: "claude-opus-4-6", label: "Opus 4.6" },
  { id: "claude-sonnet-4-6", label: "Sonnet 4.6" },
  { id: "claude-haiku-4-5-20251001", label: "Haiku 4.5" },
];

export function Composer({
  onSend,
  disabled,
  workspaceId,
  model,
  onModelChange,
  contextPercent,
  isPlanMode,
  onPlanModeToggle,
  onSlashCommand,
}: ComposerProps) {
  const [text, setText] = useState(() => {
    try {
      return localStorage.getItem(DRAFT_PREFIX + workspaceId) ?? "";
    } catch {
      return "";
    }
  });
  const [showModelPicker, setShowModelPicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Restore draft when workspace changes
  useEffect(() => {
    try {
      setText(localStorage.getItem(DRAFT_PREFIX + workspaceId) ?? "");
    } catch {
      setText("");
    }
  }, [workspaceId]);

  // Save draft on change
  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_PREFIX + workspaceId, text);
    } catch {
      // ignore
    }
  }, [text, workspaceId]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }, [text]);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;

    // Handle slash commands
    if (trimmed.startsWith("/") && onSlashCommand) {
      onSlashCommand(trimmed);
      setText("");
      return;
    }

    onSend(trimmed);
    setText("");
    try {
      localStorage.removeItem(DRAFT_PREFIX + workspaceId);
    } catch {
      // ignore
    }
  }, [text, disabled, onSend, onSlashCommand, workspaceId]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const currentModel = MODELS.find((m) => m.id === model) ?? MODELS[0];

  return (
    <div
      style={{
        borderTop: "1px solid var(--border)",
        padding: "var(--space-3) var(--space-4)",
        backgroundColor: "var(--bg-surface)",
      }}
    >
      {/* Top row: model picker + context indicator */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-2)",
          marginBottom: "var(--space-2)",
        }}
      >
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setShowModelPicker(!showModelPicker)}
            style={{
              background: "none",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              color: "var(--text-secondary)",
              fontSize: "var(--font-size-xs)",
              padding: "2px var(--space-2)",
              cursor: "pointer",
              fontFamily: "var(--font-mono)",
            }}
          >
            {currentModel.label}
          </button>

          {showModelPicker && (
            <div
              style={{
                position: "absolute",
                bottom: "100%",
                left: 0,
                marginBottom: 4,
                backgroundColor: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                boxShadow: "var(--shadow-md)",
                zIndex: 20,
                minWidth: 160,
              }}
            >
              {MODELS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    onModelChange(m.id);
                    setShowModelPicker(false);
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    padding: "var(--space-2) var(--space-3)",
                    background: m.id === model ? "var(--bg-surface-active)" : "none",
                    border: "none",
                    color: "var(--text-primary)",
                    fontSize: "var(--font-size-sm)",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {onPlanModeToggle && (
          <PlanToggle isPlanMode={isPlanMode ?? false} onToggle={onPlanModeToggle} />
        )}

        {contextPercent > 0 && (
          <ContextRing percent={contextPercent} />
        )}

        <div style={{ flex: 1 }} />
      </div>

      {/* Input row */}
      <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "flex-end" }}>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask the agent to do something..."
          disabled={disabled}
          rows={1}
          style={{
            flex: 1,
            resize: "none",
            padding: "var(--space-2) var(--space-3)",
            backgroundColor: "var(--bg-input)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            color: "var(--text-primary)",
            fontSize: "var(--font-size-base)",
            fontFamily: "var(--font-ui)",
            lineHeight: 1.5,
            outline: "none",
            minHeight: 36,
            maxHeight: 200,
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "var(--border-focus)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "var(--border)";
          }}
        />
        <button
          onClick={handleSend}
          disabled={disabled || !text.trim()}
          style={{
            padding: "var(--space-2) var(--space-4)",
            backgroundColor:
              disabled || !text.trim() ? "var(--bg-elevated)" : "var(--accent-primary)",
            border: "none",
            borderRadius: "var(--radius-md)",
            color:
              disabled || !text.trim() ? "var(--text-tertiary)" : "var(--bg-base)",
            fontSize: "var(--font-size-sm)",
            fontWeight: 600,
            cursor: disabled || !text.trim() ? "not-allowed" : "pointer",
            minHeight: 36,
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}

function ContextRing({ percent }: { percent: number }) {
  const size = 18;
  const strokeWidth = 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  const color =
    percent > 80 ? "var(--error)" : percent > 50 ? "var(--warning)" : "var(--accent-muted)";

  return (
    <div
      style={{ display: "flex", alignItems: "center", gap: "var(--space-1)" }}
      title={`Context: ${percent.toFixed(0)}% used`}
    >
      <svg width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span style={{ color: "var(--text-tertiary)", fontSize: "var(--font-size-xs)" }}>
        {percent.toFixed(0)}%
      </span>
    </div>
  );
}
