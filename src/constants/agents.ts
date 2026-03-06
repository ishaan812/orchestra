/** Agent/provider definitions for the frontend.
 *  Mirrors the Rust ProviderDefinition in providers/config.rs. */

export interface AgentDefinition {
  id: string;
  name: string;
  cli: string;
  description: string;
  color: string;
  iconLabel: string;
  terminalOnly: boolean;
  supportsResume: boolean;
  supportsAutoApprove: boolean;
  supportsSessionId: boolean;
  defaultModel?: string;
  models: AgentModel[];
}

export interface AgentModel {
  id: string;
  name: string;
  provider: string;
}

export const AGENTS: AgentDefinition[] = [
  {
    id: 'claude',
    name: 'Claude Code',
    cli: 'claude',
    description: 'Anthropic\'s agentic coding tool with structured JSON output',
    color: 'var(--accent-primary)',
    iconLabel: 'CC',
    terminalOnly: false,
    supportsResume: true,
    supportsAutoApprove: true,
    supportsSessionId: true,
    defaultModel: 'claude-sonnet-4-6',
    models: [
      { id: 'claude-opus-4-6', name: 'Opus 4.6', provider: 'anthropic' },
      { id: 'claude-sonnet-4-6', name: 'Sonnet 4.6', provider: 'anthropic' },
      { id: 'claude-haiku-4-5-20251001', name: 'Haiku 4.5', provider: 'anthropic' },
    ],
  },
  {
    id: 'codex',
    name: 'Codex',
    cli: 'codex',
    description: 'OpenAI\'s coding agent, terminal-only with full-auto mode',
    color: '#10a37f',
    iconLabel: 'CX',
    terminalOnly: true,
    supportsResume: false,
    supportsAutoApprove: true,
    supportsSessionId: false,
    defaultModel: 'o4-mini',
    models: [
      { id: 'o4-mini', name: 'o4-mini', provider: 'openai' },
      { id: 'o3', name: 'o3', provider: 'openai' },
      { id: 'gpt-4.1', name: 'GPT-4.1', provider: 'openai' },
    ],
  },
];

export function getAgent(id: string): AgentDefinition | undefined {
  return AGENTS.find((a) => a.id === id);
}

export function getAgentModels(agentId: string): AgentModel[] {
  return getAgent(agentId)?.models ?? [];
}
