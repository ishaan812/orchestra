import { getAgent } from '../../constants/agents';

interface AgentLogoProps {
  agentId: string;
  size?: number;
  className?: string;
}

export function AgentLogo({ agentId, size = 24, className }: AgentLogoProps) {
  const agent = getAgent(agentId);
  const label = agent?.iconLabel ?? agentId.slice(0, 2).toUpperCase();
  const color = agent?.color ?? 'var(--text-secondary)';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      style={{ flexShrink: 0 }}
    >
      <rect
        width="32"
        height="32"
        rx="6"
        fill={color}
        fillOpacity={0.15}
      />
      <text
        x="16"
        y="16"
        textAnchor="middle"
        dominantBaseline="central"
        fill={color}
        fontSize="12"
        fontWeight="600"
        fontFamily="var(--font-mono)"
      >
        {label}
      </text>
    </svg>
  );
}
