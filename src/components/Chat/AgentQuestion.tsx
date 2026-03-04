import { useState, useEffect, useRef, useCallback } from "react";

interface QuestionOption {
  label: string;
  description?: string;
}

interface AgentQuestionProps {
  questionId: string;
  questionText: string;
  options: QuestionOption[];
  onAnswer: (questionId: string, answer: string) => void;
  answeredWith?: string | null;
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT = 5 * 60 * 1000; // 5 minutes

export function AgentQuestion({
  questionId,
  questionText,
  options,
  onAnswer,
  answeredWith,
  timeoutMs = DEFAULT_TIMEOUT,
}: AgentQuestionProps) {
  const [otherText, setOtherText] = useState("");
  const [showOther, setShowOther] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Timeout handler
  useEffect(() => {
    if (answeredWith || timedOut) return;
    timerRef.current = setTimeout(() => {
      setTimedOut(true);
      onAnswer(questionId, "__TIMEOUT__");
    }, timeoutMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [questionId, answeredWith, timedOut, timeoutMs, onAnswer]);

  const handleSelectOption = useCallback(
    (label: string) => {
      if (answeredWith || timedOut) return;
      onAnswer(questionId, label);
    },
    [questionId, onAnswer, answeredWith, timedOut]
  );

  const handleSubmitOther = useCallback(() => {
    if (!otherText.trim() || answeredWith || timedOut) return;
    onAnswer(questionId, otherText.trim());
  }, [questionId, otherText, onAnswer, answeredWith, timedOut]);

  const isAnswered = !!answeredWith;
  const isDisabled = isAnswered || timedOut;

  return (
    <div
      style={{
        margin: "var(--space-2) var(--space-4)",
        border: "1px solid var(--info)",
        borderRadius: "var(--radius-md)",
        backgroundColor: "var(--bg-surface)",
        overflow: "hidden",
        opacity: isDisabled ? 0.8 : 1,
      }}
    >
      {/* Question header */}
      <div
        style={{
          padding: "var(--space-2) var(--space-3)",
          borderBottom: "1px solid var(--border-subtle)",
          backgroundColor: "var(--bg-elevated)",
        }}
      >
        <span
          style={{
            fontSize: "var(--font-size-xs)",
            color: "var(--info)",
            fontWeight: 600,
            marginRight: "var(--space-2)",
          }}
        >
          Agent Question
        </span>
        {timedOut && (
          <span
            style={{
              fontSize: "var(--font-size-xs)",
              color: "var(--error)",
            }}
          >
            (Timed out)
          </span>
        )}
      </div>

      {/* Question text */}
      <div
        style={{
          padding: "var(--space-3)",
          fontSize: "var(--font-size-sm)",
          color: "var(--text-primary)",
          lineHeight: 1.5,
        }}
      >
        {questionText}
      </div>

      {/* Options */}
      <div style={{ padding: "0 var(--space-3) var(--space-2)" }}>
        {options.map((opt) => {
          const isSelected = answeredWith === opt.label;
          return (
            <button
              key={opt.label}
              onClick={() => handleSelectOption(opt.label)}
              disabled={isDisabled}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "var(--space-2) var(--space-3)",
                marginBottom: "var(--space-1)",
                border: isSelected
                  ? "2px solid var(--accent-primary)"
                  : "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                backgroundColor: isSelected
                  ? "var(--accent-bg)"
                  : "var(--bg-surface)",
                cursor: isDisabled ? "default" : "pointer",
                transition: "border-color 150ms ease",
              }}
            >
              <div
                style={{
                  fontSize: "var(--font-size-sm)",
                  color: "var(--text-primary)",
                  fontWeight: isSelected ? 600 : 400,
                }}
              >
                {opt.label}
              </div>
              {opt.description && (
                <div
                  style={{
                    fontSize: "var(--font-size-xs)",
                    color: "var(--text-tertiary)",
                    marginTop: 2,
                  }}
                >
                  {opt.description}
                </div>
              )}
            </button>
          );
        })}

        {/* Other option */}
        {!isDisabled && (
          <>
            {!showOther ? (
              <button
                onClick={() => setShowOther(true)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "var(--space-2) var(--space-3)",
                  border: "1px dashed var(--border)",
                  borderRadius: "var(--radius-sm)",
                  backgroundColor: "transparent",
                  cursor: "pointer",
                  color: "var(--text-tertiary)",
                  fontSize: "var(--font-size-sm)",
                }}
              >
                Other...
              </button>
            ) : (
              <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-1)" }}>
                <input
                  value={otherText}
                  onChange={(e) => setOtherText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSubmitOther();
                  }}
                  placeholder="Type your answer..."
                  style={{
                    flex: 1,
                    padding: "var(--space-1) var(--space-2)",
                    backgroundColor: "var(--bg-input)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-sm)",
                    color: "var(--text-primary)",
                    fontSize: "var(--font-size-sm)",
                    outline: "none",
                  }}
                />
                <button
                  onClick={handleSubmitOther}
                  disabled={!otherText.trim()}
                  style={{
                    padding: "var(--space-1) var(--space-3)",
                    backgroundColor: otherText.trim()
                      ? "var(--accent-primary)"
                      : "var(--bg-elevated)",
                    border: "none",
                    borderRadius: "var(--radius-sm)",
                    color: otherText.trim()
                      ? "var(--bg-base)"
                      : "var(--text-tertiary)",
                    fontSize: "var(--font-size-xs)",
                    fontWeight: 600,
                    cursor: otherText.trim() ? "pointer" : "not-allowed",
                  }}
                >
                  Submit
                </button>
              </div>
            )}
          </>
        )}

        {/* Show answered state */}
        {isAnswered && answeredWith && (
          <div
            style={{
              padding: "var(--space-2)",
              marginTop: "var(--space-1)",
              fontSize: "var(--font-size-xs)",
              color: "var(--success)",
              display: "flex",
              alignItems: "center",
              gap: "var(--space-1)",
            }}
          >
            <span>✓</span>
            <span>
              Answered: <strong>{answeredWith}</strong>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
