import { useMemo } from "react";
import type { MessageInfo } from "../../hooks/useSession";

interface CostBreakdown {
  inputTokens: number;
  outputTokens: number;
  totalCost: number;
}

function parseCostFromMessage(msg: MessageInfo): CostBreakdown | null {
  if (!msg.full_message) return null;

  try {
    const parsed = JSON.parse(msg.full_message);
    const usage = parsed.usage;
    if (!usage) return null;

    const inputTokens = usage.input_tokens ?? 0;
    const outputTokens = usage.output_tokens ?? 0;

    // Approximate costs per token (Sonnet 4.6 pricing)
    const inputCostPer1k = 0.003;
    const outputCostPer1k = 0.015;
    const totalCost =
      (inputTokens / 1000) * inputCostPer1k +
      (outputTokens / 1000) * outputCostPer1k;

    return { inputTokens, outputTokens, totalCost };
  } catch {
    return null;
  }
}

interface MessageCostTooltipProps {
  message: MessageInfo;
}

export function MessageCostTooltip({ message }: MessageCostTooltipProps) {
  const cost = parseCostFromMessage(message);
  if (!cost) return null;

  return (
    <span
      style={{
        fontSize: "var(--font-size-xs)",
        color: "var(--text-tertiary)",
        fontFamily: "var(--font-mono)",
      }}
    >
      {cost.inputTokens.toLocaleString()}↓ {cost.outputTokens.toLocaleString()}↑
      ${cost.totalCost.toFixed(4)}
    </span>
  );
}

interface SessionCostProps {
  messages: MessageInfo[];
}

export function SessionCostDisplay({ messages }: SessionCostProps) {
  const totalCost = useMemo(() => {
    let total = 0;
    for (const msg of messages) {
      const cost = parseCostFromMessage(msg);
      if (cost) total += cost.totalCost;
    }
    return total;
  }, [messages]);

  if (totalCost === 0) return null;

  return (
    <span
      style={{
        fontSize: "var(--font-size-xs)",
        color: "var(--text-tertiary)",
        fontFamily: "var(--font-mono)",
      }}
      title={`Session total: $${totalCost.toFixed(4)}`}
    >
      ${totalCost.toFixed(2)}
    </span>
  );
}
