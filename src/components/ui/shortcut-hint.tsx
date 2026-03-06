import * as React from 'react';
import { cn } from '../../lib/utils';

interface ShortcutHintProps extends React.HTMLAttributes<HTMLElement> {
  keys: string[];
}

function ShortcutHint({ keys, className, ...props }: ShortcutHintProps) {
  return (
    <span className={cn('ui-shortcut-hint', className)} {...props}>
      {keys.map((key, i) => (
        <kbd key={i} className="ui-kbd">
          {key}
        </kbd>
      ))}
    </span>
  );
}

export { ShortcutHint };
