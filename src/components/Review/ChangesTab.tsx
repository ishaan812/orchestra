import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { WorkspaceChanges } from './types';
import { CommentInput } from './CommentInput';

interface ChangesTabProps {
  workspaceId: string;
  changes: WorkspaceChanges | null;
  diffMode: string;
  selectedFile: string | null;
  onSelectFile: (path: string | null) => void;
}

export function ChangesTab({
  workspaceId,
  changes,
  diffMode,
  selectedFile,
  onSelectFile,
}: ChangesTabProps) {
  const [diffContent, setDiffContent] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedFile) {
      setDiffContent('');
      return;
    }
    setLoading(true);
    invoke<string>('get_file_diff', {
      workspaceId,
      filePath: selectedFile,
    })
      .then(setDiffContent)
      .catch(() => setDiffContent('Failed to load diff'))
      .finally(() => setLoading(false));
  }, [workspaceId, selectedFile]);

  if (!changes) {
    return <div className="diff-empty">No changes detected</div>;
  }

  const allFiles = [...changes.committed, ...changes.uncommitted];

  return (
    <div className="changes-tab">
      {/* File list */}
      <div className="changes-tab__files">
        {allFiles.map((file) => (
          <div
            key={file.path}
            className={`changes-tab__file ${
              selectedFile === file.path ? 'changes-tab__file--selected' : ''
            }`}
            onClick={() => onSelectFile(file.path)}
          >
            <span className={`changes-tab__status changes-tab__status--${file.status.toLowerCase()}`}>
              {file.status[0]}
            </span>
            <span className="changes-tab__path">{file.path}</span>
            <span className="changes-tab__stats">
              {file.insertions > 0 && <span style={{ color: '#4caf50' }}>+{file.insertions}</span>}
              {file.deletions > 0 && <span style={{ color: '#f44336' }}>-{file.deletions}</span>}
            </span>
          </div>
        ))}
      </div>

      {/* Diff view */}
      {selectedFile && (
        <div className="changes-tab__diff">
          <div className="changes-tab__diff-header">
            <span className="changes-tab__diff-path">{selectedFile}</span>
          </div>
          <div className="changes-tab__diff-content">
            {loading ? (
              <div className="diff-loading">Loading diff...</div>
            ) : (
              <DiffDisplay content={diffContent} mode={diffMode} />
            )}
          </div>
          <CommentInput
            workspaceId={workspaceId}
            filePath={selectedFile}
          />
        </div>
      )}
    </div>
  );
}

function DiffDisplay({ content, mode }: { content: string; mode: string }) {
  if (!content) return null;

  const lines = content.split('\n');

  return (
    <pre className={`diff-display diff-display--${mode}`}>
      {lines.map((line, i) => {
        let cls = 'diff-line';
        if (line.startsWith('+')) cls += ' diff-line--add';
        else if (line.startsWith('-')) cls += ' diff-line--del';
        else if (line.startsWith('@@')) cls += ' diff-line--hunk';

        return (
          <div key={i} className={cls}>
            <span className="diff-line__num">{i + 1}</span>
            <span className="diff-line__content">{line}</span>
          </div>
        );
      })}
    </pre>
  );
}
