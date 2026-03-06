import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { AGENTS } from '../../constants/agents';
import { AgentLogo } from './AgentLogo';

interface AgentDropdownProps {
  value: string;
  onChange: (agentId: string) => void;
  children: React.ReactNode;
}

export function AgentDropdown({ value, onChange, children }: AgentDropdownProps) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>{children}</DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="dropdown-menu-content"
          sideOffset={5}
          align="start"
        >
          {AGENTS.map((agent) => (
            <DropdownMenu.Item
              key={agent.id}
              className="dropdown-menu-item"
              onSelect={() => onChange(agent.id)}
            >
              <AgentLogo agentId={agent.id} size={20} />
              <span style={{ flex: 1 }}>{agent.name}</span>
              {value === agent.id && (
                <span style={{ color: 'var(--accent-primary)', fontSize: '14px' }}>
                  ✓
                </span>
              )}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
