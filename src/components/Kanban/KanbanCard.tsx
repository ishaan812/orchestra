import { AgentLogo } from '../Agents/AgentLogo';
import type { WorkspaceInfo } from '../../hooks/useWorkspaces';

interface KanbanCardProps {
  workspace: WorkspaceInfo;
  onClick: () => void;
}

export function KanbanCard({ workspace, onClick }: KanbanCardProps) {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', workspace.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      className="kanban-card"
      draggable
      onDragStart={handleDragStart}
      onClick={onClick}
    >
      <div className="kanban-card__header">
        <AgentLogo agentId={workspace.agent_type ?? 'claude'} size={18} />
        <span className="kanban-card__name">{workspace.name}</span>
        {workspace.unread && <span className="kanban-card__unread" />}
      </div>
      {workspace.task_prompt && (
        <div className="kanban-card__prompt">{workspace.task_prompt}</div>
      )}
      <div className="kanban-card__footer">
        <span className="kanban-card__branch">{workspace.branch_name}</span>
        {(workspace.insertions > 0 || workspace.deletions > 0) && (
          <span className="kanban-card__changes">
            <span style={{ color: '#4caf50' }}>+{workspace.insertions}</span>
            <span style={{ color: '#f44336' }}>-{workspace.deletions}</span>
          </span>
        )}
      </div>
    </div>
  );
}
