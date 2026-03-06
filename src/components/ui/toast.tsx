import { cn } from '../../lib/utils';
import { X } from 'lucide-react';

export interface ToastProps {
  id: string;
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success';
  duration?: number;
  onDismiss?: (id: string) => void;
}

function Toast({ id, title, description, variant = 'default', onDismiss }: ToastProps) {
  return (
    <div className={cn('ui-toast', `ui-toast--${variant}`)} role="alert">
      <div className="ui-toast-body">
        {title && <div className="ui-toast-title">{title}</div>}
        {description && <div className="ui-toast-description">{description}</div>}
      </div>
      {onDismiss && (
        <button className="ui-toast-close" onClick={() => onDismiss(id)}>
          <X size={14} />
        </button>
      )}
    </div>
  );
}

export { Toast };
