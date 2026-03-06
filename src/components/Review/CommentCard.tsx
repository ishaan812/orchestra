interface CommentCardProps {
  id: string;
  filePath: string;
  lineNumber: number;
  content: string;
  sentAt: string | null;
  createdAt: string;
  onDelete?: (id: string) => void;
}

export function CommentCard({
  id,
  filePath,
  lineNumber,
  content,
  sentAt,
  createdAt,
  onDelete,
}: CommentCardProps) {
  return (
    <div className="comment-card">
      <div className="comment-card__header">
        <span className="comment-card__location">
          {filePath}:{lineNumber}
        </span>
        {sentAt && <span className="comment-card__sent">Sent</span>}
      </div>
      <div className="comment-card__body">{content}</div>
      <div className="comment-card__footer">
        <span className="comment-card__time">
          {new Date(createdAt).toLocaleTimeString()}
        </span>
        {onDelete && !sentAt && (
          <button
            className="comment-card__delete"
            onClick={() => onDelete(id)}
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
