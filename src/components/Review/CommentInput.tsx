import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface CommentInputProps {
  workspaceId: string;
  filePath: string;
  lineNumber?: number;
  lineContent?: string;
  onCommentAdded?: () => void;
}

export function CommentInput({
  workspaceId,
  filePath,
  lineNumber,
  lineContent,
  onCommentAdded,
}: CommentInputProps) {
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      await invoke('add_line_comment', {
        workspaceId,
        filePath,
        lineNumber: lineNumber ?? 0,
        content: content.trim(),
        lineContent: lineContent ?? null,
      });
      setContent('');
      onCommentAdded?.();
    } catch (e) {
      console.error('Failed to add comment:', e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="comment-input">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Add a review comment..."
        className="comment-input__textarea"
        rows={2}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            handleSubmit();
          }
        }}
      />
      <div className="comment-input__actions">
        <span className="comment-input__hint">Cmd+Enter to submit</span>
        <button
          className="comment-input__submit"
          onClick={handleSubmit}
          disabled={!content.trim() || submitting}
        >
          {submitting ? 'Adding...' : 'Comment'}
        </button>
      </div>
    </div>
  );
}
