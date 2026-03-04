import { useCallback, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useSessionStore } from "../../hooks/useSession";

interface ReviewButtonProps {
  workspaceId: string;
}

export function ReviewButton({ workspaceId }: ReviewButtonProps) {
  const [reviewing, setReviewing] = useState(false);
  const { createSession } = useSessionStore();

  const handleReview = useCallback(async () => {
    setReviewing(true);
    try {
      // Get the full diff to send to agent
      const diff = await invoke<string>("get_full_workspace_diff", { workspaceId });

      const prompt = `Please review the following code changes and provide feedback on:
1. Code quality and correctness
2. Potential bugs or edge cases
3. Performance concerns
4. Security issues

Here is the diff:

\`\`\`diff
${diff.slice(0, 50000)}
\`\`\`

Provide your review with inline comments referencing specific files and line numbers.`;

      await createSession({
        workspace_id: workspaceId,
        agent_type: "claude-code",
        model: "claude-sonnet-4-6",
        task_prompt: prompt,
        thinking_enabled: false,
      });
    } catch (e) {
      console.error("Review failed:", e);
    } finally {
      setReviewing(false);
    }
  }, [workspaceId, createSession]);

  return (
    <button
      onClick={handleReview}
      disabled={reviewing}
      style={{
        padding: "var(--space-1) var(--space-2)",
        fontSize: "var(--font-size-xs)",
        background: reviewing ? "var(--bg-surface)" : "var(--bg-elevated)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-sm)",
        color: reviewing ? "var(--text-tertiary)" : "var(--accent-primary)",
        cursor: reviewing ? "wait" : "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {reviewing ? "Reviewing..." : "Review"}
    </button>
  );
}
