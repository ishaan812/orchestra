const FILE_COLORS: Record<string, string> = {
  ts: '#3178c6',
  tsx: '#3178c6',
  js: '#f7df1e',
  jsx: '#f7df1e',
  rs: '#dea584',
  py: '#3776ab',
  css: '#1572b6',
  html: '#e34f26',
  json: '#292929',
  md: '#083fa1',
  toml: '#9c4221',
  yaml: '#cb171e',
  yml: '#cb171e',
  sql: '#336791',
  sh: '#4eaa25',
  svg: '#ffb13b',
};

export function FileIcon({ filename }: { filename: string }) {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  const color = FILE_COLORS[ext] ?? 'var(--text-secondary)';

  return (
    <svg width="14" height="14" viewBox="0 0 14 14" style={{ flexShrink: 0 }}>
      <path
        d="M3 1h5l3 3v8a1 1 0 01-1 1H3a1 1 0 01-1-1V2a1 1 0 011-1z"
        stroke={color}
        strokeWidth="1.2"
        fill="none"
      />
      <path d="M8 1v3h3" stroke={color} strokeWidth="1.2" fill="none" />
    </svg>
  );
}
