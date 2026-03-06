import { getAgent } from '../../constants/agents';
import { AgentLogo } from './AgentLogo';

interface AgentInfoCardProps {
  agentId: string;
  version?: string;
}

export function AgentInfoCard({ agentId, version }: AgentInfoCardProps) {
  const agent = getAgent(agentId);
  if (!agent) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '10px 12px',
        borderRadius: 'var(--radius-md)',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
      }}
    >
      <AgentLogo agentId={agentId} size={28} />
      <div>
        <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
          {agent.name}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
          {version ? `v${version}` : agent.cli}
          {agent.terminalOnly && ' (terminal only)'}
        </div>
      </div>
    </div>
  );
}
