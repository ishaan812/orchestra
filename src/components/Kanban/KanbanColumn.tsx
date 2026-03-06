import { KanbanCard } from './KanbanCard';
import type { WorkspaceInfo } from '../../hooks/useWorkspaces';

interface KanbanColumnProps {
  columnKey: string;
  label: string;
  color: string;
  workspaces: WorkspaceInfo[];
  onSelectWorkspace: (ws: WorkspaceInfo) => void;
  onDrop: (wsId: string, targetColumn: string) => void;
}

export function KanbanColumn({
  columnKey,
  label,
  color,
  workspaces,
  onSelectWorkspace,
  onDrop,
}: KanbanColumnProps) {
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const wsId = e.dataTransfer.getData('text/plain');
    if (wsId) {
      onDrop(wsId, columnKey);
    }
  };

  return (
    <div
      className="kanban-column"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="kanban-column__header">
        <span className="kanban-column__dot" style={{ background: color }} />
        <span className="kanban-column__label">{label}</span>
        <span className="kanban-column__count">{workspaces.length}</span>
      </div>
      <div className="kanban-column__cards">
        {workspaces.map((ws) => (
          <KanbanCard
            key={ws.id}
            workspace={ws}
            onClick={() => onSelectWorkspace(ws)}
          />
        ))}
      </div>
    </div>
  );
}
