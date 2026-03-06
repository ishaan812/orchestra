import { useState } from 'react';

interface Commit {
  hash: string;
  message: string;
  author: string;
  date: string;
}

interface HistoryTabProps {
  workspaceId: string;
}

export function HistoryTab({ workspaceId: _workspaceId }: HistoryTabProps) {
  const [commits] = useState<Commit[]>([]);

  return (
    <div className="history-tab">
      {commits.length === 0 ? (
        <div className="diff-empty">No commits yet</div>
      ) : (
        <div className="history-tab__list">
          {commits.map((commit) => (
            <div key={commit.hash} className="history-tab__commit">
              <div className="history-tab__hash">{commit.hash.slice(0, 7)}</div>
              <div className="history-tab__msg">{commit.message}</div>
              <div className="history-tab__meta">
                {commit.author} &middot; {commit.date}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
