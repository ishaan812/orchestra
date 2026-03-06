import type { ViewTab, DiffMode } from './DiffPanel';

interface DiffToolbarProps {
  activeTab: ViewTab;
  onTabChange: (tab: ViewTab) => void;
  diffMode: DiffMode;
  onDiffModeChange: (mode: DiffMode) => void;
  onRefresh: () => void;
  stats?: { files_changed: number; insertions: number; deletions: number } | null;
}

export function DiffToolbar({
  activeTab,
  onTabChange,
  diffMode,
  onDiffModeChange,
  onRefresh,
  stats,
}: DiffToolbarProps) {
  return (
    <div className="diff-toolbar">
      <div className="diff-toolbar__tabs">
        <button
          className={`diff-toolbar__tab ${activeTab === 'changes' ? 'diff-toolbar__tab--active' : ''}`}
          onClick={() => onTabChange('changes')}
        >
          Changes
          {stats && (
            <span className="diff-toolbar__badge">{stats.files_changed}</span>
          )}
        </button>
        <button
          className={`diff-toolbar__tab ${activeTab === 'history' ? 'diff-toolbar__tab--active' : ''}`}
          onClick={() => onTabChange('history')}
        >
          History
        </button>
      </div>

      <div className="diff-toolbar__actions">
        {activeTab === 'changes' && (
          <div className="diff-toolbar__mode-switcher">
            {(['inline', 'side-by-side', 'stacked'] as const).map((mode) => (
              <button
                key={mode}
                className={`diff-toolbar__mode-btn ${diffMode === mode ? 'diff-toolbar__mode-btn--active' : ''}`}
                onClick={() => onDiffModeChange(mode)}
                title={mode}
              >
                {mode === 'inline' ? 'Inline' : mode === 'side-by-side' ? 'Split' : 'Stacked'}
              </button>
            ))}
          </div>
        )}
        <button className="diff-toolbar__refresh" onClick={onRefresh} title="Refresh">
          <svg width="14" height="14" viewBox="0 0 14 14">
            <path
              d="M11.5 7a4.5 4.5 0 11-1.35-3.2M11.5 2v1.8h-1.8"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {stats && (
        <div className="diff-toolbar__stats">
          <span style={{ color: '#4caf50' }}>+{stats.insertions}</span>
          <span style={{ color: '#f44336' }}>-{stats.deletions}</span>
        </div>
      )}
    </div>
  );
}
