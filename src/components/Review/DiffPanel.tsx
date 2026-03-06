import { useState } from 'react';
import { DiffToolbar } from './DiffToolbar';
import { ChangesTab } from './ChangesTab';
import { HistoryTab } from './HistoryTab';
import type { WorkspaceChanges } from './types';
import './DiffPanel.css';

interface DiffPanelProps {
  workspaceId: string;
  changes: WorkspaceChanges | null;
  onRefresh: () => void;
}

export type ViewTab = 'changes' | 'history';
export type DiffMode = 'side-by-side' | 'inline' | 'stacked';

export function DiffPanel({ workspaceId, changes, onRefresh }: DiffPanelProps) {
  const [activeTab, setActiveTab] = useState<ViewTab>('changes');
  const [diffMode, setDiffMode] = useState<DiffMode>('inline');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  return (
    <div className="diff-panel">
      <DiffToolbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        diffMode={diffMode}
        onDiffModeChange={setDiffMode}
        onRefresh={onRefresh}
        stats={changes?.stats}
      />
      <div className="diff-panel__content">
        {activeTab === 'changes' && (
          <ChangesTab
            workspaceId={workspaceId}
            changes={changes}
            diffMode={diffMode}
            selectedFile={selectedFile}
            onSelectFile={setSelectedFile}
          />
        )}
        {activeTab === 'history' && (
          <HistoryTab workspaceId={workspaceId} />
        )}
      </div>
    </div>
  );
}
