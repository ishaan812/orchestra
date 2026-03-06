import { OpenInMenu } from './OpenInMenu';
import './Titlebar.css';

interface TitlebarProps {
  repoName?: string;
  workspaceName?: string;
  worktreePath?: string;
  leftSidebarOpen: boolean;
  rightSidebarOpen: boolean;
  onToggleLeftSidebar: () => void;
  onToggleRightSidebar: () => void;
  viewMode: 'list' | 'kanban';
  onViewModeChange: (mode: 'list' | 'kanban') => void;
}

export function Titlebar({
  repoName,
  workspaceName,
  worktreePath,
  leftSidebarOpen,
  rightSidebarOpen,
  onToggleLeftSidebar,
  onToggleRightSidebar,
  viewMode,
  onViewModeChange,
}: TitlebarProps) {
  return (
    <div className="titlebar" data-tauri-drag-region>
      <div className="titlebar__left">
        <button
          className={`titlebar__toggle ${leftSidebarOpen ? 'titlebar__toggle--active' : ''}`}
          onClick={onToggleLeftSidebar}
          title="Toggle sidebar"
        >
          <SidebarIcon />
        </button>
        {repoName && (
          <span className="titlebar__repo">{repoName}</span>
        )}
        {workspaceName && (
          <>
            <span className="titlebar__separator">/</span>
            <span className="titlebar__workspace">{workspaceName}</span>
          </>
        )}
      </div>

      <div className="titlebar__center" data-tauri-drag-region>
        <div className="titlebar__view-switcher">
          <button
            className={`titlebar__view-btn ${viewMode === 'list' ? 'titlebar__view-btn--active' : ''}`}
            onClick={() => onViewModeChange('list')}
            title="List view"
          >
            <ListIcon />
          </button>
          <button
            className={`titlebar__view-btn ${viewMode === 'kanban' ? 'titlebar__view-btn--active' : ''}`}
            onClick={() => onViewModeChange('kanban')}
            title="Kanban view"
          >
            <KanbanIcon />
          </button>
        </div>
      </div>

      <div className="titlebar__right">
        {worktreePath && <OpenInMenu worktreePath={worktreePath} />}
        <button
          className={`titlebar__toggle ${rightSidebarOpen ? 'titlebar__toggle--active' : ''}`}
          onClick={onToggleRightSidebar}
          title="Toggle right panel"
        >
          <SidebarRightIcon />
        </button>
      </div>
    </div>
  );
}

function SidebarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="2" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <line x1="5.5" y1="2" x2="5.5" y2="14" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function SidebarRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="2" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <line x1="10.5" y1="2" x2="10.5" y2="14" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <line x1="3" y1="3" x2="11" y2="3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="3" y1="7" x2="11" y2="7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="3" y1="11" x2="11" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function KanbanIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1" y="2" width="3" height="8" rx="1" stroke="currentColor" strokeWidth="1.2" />
      <rect x="5.5" y="2" width="3" height="10" rx="1" stroke="currentColor" strokeWidth="1.2" />
      <rect x="10" y="2" width="3" height="6" rx="1" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}
