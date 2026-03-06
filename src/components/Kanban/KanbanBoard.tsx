import { KanbanColumn } from './KanbanColumn';
import type { WorkspaceGroup, WorkspaceInfo } from '../../hooks/useWorkspaces';
import './KanbanBoard.css';

interface KanbanBoardProps {
  workspaces: WorkspaceGroup;
  onSelectWorkspace: (ws: WorkspaceInfo) => void;
  onStatusChange?: (wsId: string, newStatus: string) => void;
}

const COLUMNS = [
  { key: 'backlog' as const, label: 'Backlog', color: 'var(--text-secondary)' },
  { key: 'in_progress' as const, label: 'In Progress', color: 'var(--accent-primary)' },
  { key: 'in_review' as const, label: 'In Review', color: '#a78bfa' },
  { key: 'done' as const, label: 'Done', color: '#4caf50' },
];

export function KanbanBoard({ workspaces, onSelectWorkspace, onStatusChange }: KanbanBoardProps) {
  const columnData: Record<string, WorkspaceInfo[]> = {
    backlog: workspaces.backlog,
    in_progress: workspaces.in_progress,
    in_review: workspaces.in_review,
    done: workspaces.done,
  };

  const handleDrop = (wsId: string, targetColumn: string) => {
    const statusMap: Record<string, string> = {
      backlog: 'backlog',
      in_progress: 'in-progress',
      in_review: 'in-review',
      done: 'done',
    };
    onStatusChange?.(wsId, statusMap[targetColumn] ?? targetColumn);
  };

  return (
    <div className="kanban-board">
      {COLUMNS.map((col) => (
        <KanbanColumn
          key={col.key}
          columnKey={col.key}
          label={col.label}
          color={col.color}
          workspaces={columnData[col.key] ?? []}
          onSelectWorkspace={onSelectWorkspace}
          onDrop={handleDrop}
        />
      ))}
    </div>
  );
}
