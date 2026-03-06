import { useEffect, useState } from 'react';

interface CodeEditorProps {
  content: string;
  filename: string;
  language?: string;
  readOnly?: boolean;
}

function detectLanguage(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    rs: 'rust',
    py: 'python',
    css: 'css',
    html: 'html',
    json: 'json',
    md: 'markdown',
    toml: 'toml',
    yaml: 'yaml',
    yml: 'yaml',
    sql: 'sql',
    sh: 'shell',
    bash: 'shell',
  };
  return map[ext] ?? 'plaintext';
}

// Module-level cache: attempt Monaco import once, reuse across all mounts
let monacoPromise: Promise<any> | null = null;
let cachedMonaco: any = null;
let monacoFailed = false;

function loadMonaco(): Promise<any> {
  if (cachedMonaco) return Promise.resolve(cachedMonaco);
  if (monacoFailed) return Promise.resolve(null);
  if (!monacoPromise) {
    monacoPromise = (
      // @ts-ignore - Monaco may not be installed yet
      import('@monaco-editor/react') as Promise<any>
    )
      .then((mod: any) => {
        cachedMonaco = mod.default;
        return cachedMonaco;
      })
      .catch(() => {
        monacoFailed = true;
        return null;
      });
  }
  return monacoPromise;
}

/**
 * Code editor component. Uses Monaco when available, falls back to a
 * simple <pre> viewer. Monaco is loaded dynamically to avoid blocking
 * initial render.
 */
export function CodeEditor({ content, filename, language, readOnly = true }: CodeEditorProps) {
  const lang = language ?? detectLanguage(filename);
  const [MonacoEditor, setMonacoEditor] = useState<any>(cachedMonaco);

  useEffect(() => {
    if (!MonacoEditor && !monacoFailed) {
      loadMonaco().then((editor) => {
        if (editor) setMonacoEditor(() => editor);
      });
    }
  }, [MonacoEditor]);

  if (MonacoEditor) {
    return (
      <MonacoEditor
        height="100%"
        language={lang}
        value={content}
        theme="vs-dark"
        options={{
          readOnly,
          minimap: { enabled: false },
          fontSize: 13,
          fontFamily: 'var(--font-mono)',
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          lineNumbers: 'on',
          renderLineHighlight: 'none',
          overviewRulerBorder: false,
          padding: { top: 8 },
        }}
      />
    );
  }

  // Fallback: simple code viewer
  return (
    <div className="code-editor-fallback">
      <pre className="code-editor-fallback__pre">
        <code>{content}</code>
      </pre>
    </div>
  );
}
