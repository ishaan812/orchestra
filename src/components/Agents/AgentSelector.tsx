import { AGENTS, type AgentDefinition } from '../../constants/agents';
import { AgentLogo } from './AgentLogo';
import './AgentSelector.css';

interface AgentSelectorProps {
  value: string;
  onChange: (agentId: string) => void;
  detectedAgents?: string[];
}

export function AgentSelector({ value, onChange, detectedAgents }: AgentSelectorProps) {
  return (
    <div className="agent-selector">
      {AGENTS.map((agent) => (
        <AgentOption
          key={agent.id}
          agent={agent}
          selected={value === agent.id}
          detected={detectedAgents?.includes(agent.id)}
          onClick={() => onChange(agent.id)}
        />
      ))}
    </div>
  );
}

function AgentOption({
  agent,
  selected,
  detected,
  onClick,
}: {
  agent: AgentDefinition;
  selected: boolean;
  detected?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`agent-option ${selected ? 'agent-option--selected' : ''}`}
      onClick={onClick}
      type="button"
    >
      <AgentLogo agentId={agent.id} size={32} />
      <div className="agent-option__info">
        <div className="agent-option__name">
          {agent.name}
          {agent.terminalOnly && (
            <span className="agent-option__badge">Terminal</span>
          )}
        </div>
        <div className="agent-option__desc">{agent.description}</div>
      </div>
      {detected !== undefined && (
        <span
          className={`agent-option__status ${
            detected ? 'agent-option__status--installed' : 'agent-option__status--missing'
          }`}
        >
          {detected ? 'Installed' : 'Not found'}
        </span>
      )}
    </button>
  );
}
