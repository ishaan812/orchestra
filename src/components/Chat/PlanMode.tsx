import { useState, useCallback } from "react";

interface PlanStep {
  number: number;
  text: string;
  completed: boolean;
}

interface PlanModeProps {
  planContent: string;
  onApprove: () => void;
  onApproveWithFeedback: (feedback: string) => void;
  onReject: () => void;
  onSendToNewChat: (planContent: string) => void;
  onSendToWorkspace: (planContent: string) => void;
}

function parsePlanSteps(content: string): PlanStep[] {
  const steps: PlanStep[] = [];
  let stepNum = 0;
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    // Match numbered lists: "1. Step" or "1) Step"
    const numbered = trimmed.match(/^(\d+)[.)]\s+(.+)/);
    if (numbered) {
      stepNum++;
      steps.push({ number: stepNum, text: numbered[2], completed: false });
      continue;
    }
    // Match checkbox lists: "- [ ] Step" or "- [x] Step"
    const checkbox = trimmed.match(/^-\s+\[([ x])\]\s+(.+)/);
    if (checkbox) {
      stepNum++;
      steps.push({
        number: stepNum,
        text: checkbox[2],
        completed: checkbox[1] === "x",
      });
    }
  }
  return steps;
}

export function PlanView({ planContent, onApprove, onApproveWithFeedback, onReject, onSendToNewChat, onSendToWorkspace }: PlanModeProps) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const steps = parsePlanSteps(planContent);

  const handleFeedbackSubmit = useCallback(() => {
    if (feedback.trim()) {
      onApproveWithFeedback(feedback.trim());
      setFeedback("");
      setFeedbackOpen(false);
    }
  }, [feedback, onApproveWithFeedback]);

  return (
    <div
      style={{
        margin: "var(--space-3) var(--space-4)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
        backgroundColor: "var(--bg-surface)",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "var(--space-2) var(--space-3)",
          borderBottom: "1px solid var(--border-subtle)",
          display: "flex",
          alignItems: "center",
          gap: "var(--space-2)",
        }}
      >
        <span style={{ fontSize: "var(--font-size-sm)", fontWeight: 600, color: "var(--text-primary)" }}>
          Implementation Plan
        </span>
        <span
          style={{
            fontSize: "var(--font-size-xs)",
            color: "var(--info)",
            backgroundColor: "var(--bg-elevated)",
            padding: "0 var(--space-2)",
            borderRadius: "var(--radius-full)",
          }}
        >
          {steps.filter((s) => s.completed).length}/{steps.length} steps
        </span>
      </div>

      {/* Steps */}
      {steps.length > 0 ? (
        <div style={{ padding: "var(--space-2) var(--space-3)" }}>
          {steps.map((step) => (
            <div
              key={step.number}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "var(--space-2)",
                padding: "var(--space-1) 0",
              }}
            >
              <span
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: "var(--radius-sm)",
                  border: step.completed
                    ? "none"
                    : "1px solid var(--border)",
                  backgroundColor: step.completed
                    ? "var(--success)"
                    : "transparent",
                  color: step.completed ? "white" : "var(--text-tertiary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "var(--font-size-xs)",
                  fontWeight: 600,
                  flexShrink: 0,
                }}
              >
                {step.completed ? "✓" : step.number}
              </span>
              <span
                style={{
                  fontSize: "var(--font-size-sm)",
                  color: step.completed
                    ? "var(--text-tertiary)"
                    : "var(--text-primary)",
                  textDecoration: step.completed ? "line-through" : "none",
                  lineHeight: "20px",
                }}
              >
                {step.text}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div
          style={{
            padding: "var(--space-3)",
            color: "var(--text-secondary)",
            fontSize: "var(--font-size-sm)",
            whiteSpace: "pre-wrap",
          }}
        >
          {planContent}
        </div>
      )}

      {/* Action buttons */}
      <div
        style={{
          padding: "var(--space-2) var(--space-3)",
          borderTop: "1px solid var(--border-subtle)",
          display: "flex",
          gap: "var(--space-2)",
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={onApprove}
          style={{
            padding: "var(--space-1) var(--space-3)",
            backgroundColor: "var(--success)",
            border: "none",
            borderRadius: "var(--radius-sm)",
            color: "white",
            fontSize: "var(--font-size-xs)",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Approve
        </button>
        <button
          onClick={() => setFeedbackOpen(!feedbackOpen)}
          style={{
            padding: "var(--space-1) var(--space-3)",
            backgroundColor: "var(--accent-primary)",
            border: "none",
            borderRadius: "var(--radius-sm)",
            color: "var(--bg-base)",
            fontSize: "var(--font-size-xs)",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Approve with Feedback
        </button>
        <button
          onClick={onReject}
          style={{
            padding: "var(--space-1) var(--space-3)",
            backgroundColor: "transparent",
            border: "1px solid var(--error)",
            borderRadius: "var(--radius-sm)",
            color: "var(--error)",
            fontSize: "var(--font-size-xs)",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Reject
        </button>

        <div style={{ flex: 1 }} />

        <button
          onClick={() => onSendToNewChat(planContent)}
          style={{
            padding: "var(--space-1) var(--space-3)",
            backgroundColor: "transparent",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            color: "var(--text-secondary)",
            fontSize: "var(--font-size-xs)",
            cursor: "pointer",
          }}
        >
          Send to New Chat
        </button>
        <button
          onClick={() => onSendToWorkspace(planContent)}
          style={{
            padding: "var(--space-1) var(--space-3)",
            backgroundColor: "transparent",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            color: "var(--text-secondary)",
            fontSize: "var(--font-size-xs)",
            cursor: "pointer",
          }}
        >
          Send to Workspace
        </button>
      </div>

      {/* Feedback input */}
      {feedbackOpen && (
        <div
          style={{
            padding: "var(--space-2) var(--space-3)",
            borderTop: "1px solid var(--border-subtle)",
          }}
        >
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Add feedback for the agent..."
            rows={3}
            style={{
              width: "100%",
              padding: "var(--space-2)",
              backgroundColor: "var(--bg-input)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              color: "var(--text-primary)",
              fontSize: "var(--font-size-sm)",
              fontFamily: "var(--font-ui)",
              resize: "vertical",
              marginBottom: "var(--space-2)",
            }}
          />
          <button
            onClick={handleFeedbackSubmit}
            disabled={!feedback.trim()}
            style={{
              padding: "var(--space-1) var(--space-3)",
              backgroundColor: feedback.trim() ? "var(--accent-primary)" : "var(--bg-elevated)",
              border: "none",
              borderRadius: "var(--radius-sm)",
              color: feedback.trim() ? "var(--bg-base)" : "var(--text-tertiary)",
              fontSize: "var(--font-size-xs)",
              fontWeight: 600,
              cursor: feedback.trim() ? "pointer" : "not-allowed",
            }}
          >
            Submit Feedback
          </button>
        </div>
      )}
    </div>
  );
}

interface PlanToggleProps {
  isPlanMode: boolean;
  onToggle: () => void;
}

export function PlanToggle({ isPlanMode, onToggle }: PlanToggleProps) {
  return (
    <button
      onClick={onToggle}
      title={isPlanMode ? "Exit plan mode" : "Enter plan mode"}
      style={{
        background: isPlanMode ? "var(--accent-primary)" : "none",
        border: isPlanMode ? "none" : "1px solid var(--border)",
        borderRadius: "var(--radius-sm)",
        color: isPlanMode ? "var(--bg-base)" : "var(--text-tertiary)",
        fontSize: "var(--font-size-xs)",
        padding: "2px var(--space-2)",
        cursor: "pointer",
        fontWeight: isPlanMode ? 600 : 400,
      }}
    >
      Plan
    </button>
  );
}
