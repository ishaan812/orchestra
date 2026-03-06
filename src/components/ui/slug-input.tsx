import * as React from 'react';
import { cn } from '../../lib/utils';

interface SlugInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  prefix?: string;
}

const SlugInput = React.forwardRef<HTMLInputElement, SlugInputProps>(
  ({ className, prefix, onChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      // Auto-slugify: lowercase, replace spaces with hyphens, remove special chars
      const slugified = e.target.value
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
      e.target.value = slugified;
      onChange?.(e);
    };

    return (
      <div className={cn('ui-slug-input', className)}>
        {prefix && <span className="ui-slug-input-prefix">{prefix}</span>}
        <input
          ref={ref}
          type="text"
          className="ui-slug-input-field"
          onChange={handleChange}
          {...props}
        />
      </div>
    );
  }
);
SlugInput.displayName = 'SlugInput';

export { SlugInput };
