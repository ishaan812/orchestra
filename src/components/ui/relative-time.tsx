import * as React from 'react';

function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  if (diffDay < 30) return `${Math.floor(diffDay / 7)}w ago`;
  return date.toLocaleDateString();
}

interface RelativeTimeProps {
  date: Date | string;
  className?: string;
}

function RelativeTime({ date, className }: RelativeTimeProps) {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const [text, setText] = React.useState(() => getRelativeTime(dateObj));

  React.useEffect(() => {
    const interval = setInterval(() => {
      setText(getRelativeTime(dateObj));
    }, 60_000);
    return () => clearInterval(interval);
  }, [dateObj]);

  return (
    <time
      dateTime={dateObj.toISOString()}
      title={dateObj.toLocaleString()}
      className={className}
    >
      {text}
    </time>
  );
}

export { RelativeTime };
