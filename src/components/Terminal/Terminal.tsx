import { useEffect, useRef, useCallback, useState } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { WebglAddon } from "@xterm/addon-webgl";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { invoke } from "@tauri-apps/api/core";
import "@xterm/xterm/css/xterm.css";

interface TerminalProps {
  workspaceId: string;
  bigMode?: boolean;
}

export function TerminalPanel({ workspaceId, bigMode }: TerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<XTerm | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const [shell, setShell] = useState<string | null>(null);
  const [cwd, setCwd] = useState<string | null>(null);
  const [localhostUrls, setLocalhostUrls] = useState<string[]>([]);

  // Initialize terminal
  useEffect(() => {
    if (!containerRef.current) return;

    const term = new XTerm({
      fontFamily: "var(--font-mono), 'JetBrains Mono', 'Fira Code', monospace",
      fontSize: 13,
      lineHeight: 1.3,
      theme: {
        background: "#1a1612",
        foreground: "#d4c4a8",
        cursor: "#d4c4a8",
        selectionBackground: "#4a3f33",
        black: "#1a1612",
        red: "#c14a4a",
        green: "#6c8a2f",
        yellow: "#b4812e",
        blue: "#4a7b9b",
        magenta: "#945e80",
        cyan: "#5b8d7a",
        white: "#d4c4a8",
        brightBlack: "#6a5d4d",
        brightRed: "#e06c75",
        brightGreen: "#98c379",
        brightYellow: "#e5c07b",
        brightBlue: "#61afef",
        brightMagenta: "#c678dd",
        brightCyan: "#56b6c2",
        brightWhite: "#f0e6d3",
      },
      cursorBlink: true,
      scrollback: 10000,
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    // Web links addon for clickable URLs
    term.loadAddon(
      new WebLinksAddon((_event, uri) => {
        window.open(uri, "_blank");
      })
    );

    term.open(containerRef.current);

    // Try WebGL addon
    try {
      term.loadAddon(new WebglAddon());
    } catch {
      // Fallback to canvas renderer
    }

    fitAddon.fit();

    termRef.current = term;
    fitRef.current = fitAddon;

    // Capture terminal output for ring buffer
    term.onData((data) => {
      // Send terminal output to backend ring buffer
      invoke("push_terminal_output", {
        workspaceId,
        data,
      }).catch(() => {});
    });

    // Load terminal info
    invoke<{ shell: string; cwd: string }>("get_terminal_info", {
      workspaceId,
    }).then((info) => {
      setShell(info.shell);
      setCwd(info.cwd);
      // Show shell prompt
      term.writeln(`\x1b[2m$ ${info.shell} in ${info.cwd}\x1b[0m`);
      term.writeln("");
    }).catch(() => {});

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      term.dispose();
      termRef.current = null;
      fitRef.current = null;
    };
  }, [workspaceId]);

  // Cmd+K to clear
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey && e.key === "k" && termRef.current) {
        // Only clear if terminal is focused
        if (containerRef.current?.contains(document.activeElement)) {
          e.preventDefault();
          termRef.current.clear();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Ctrl+backtick to focus
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "`") {
        e.preventDefault();
        termRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Cmd+Shift+O to detect localhost URLs
  const detectLocalhost = useCallback(async () => {
    const urls = await invoke<string[]>("detect_localhost_urls", {
      workspaceId,
    });
    setLocalhostUrls(urls);
  }, [workspaceId]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey && e.shiftKey && e.key === "O") {
        e.preventDefault();
        detectLocalhost();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [detectLocalhost]);

  return (
    <div
      style={{
        height: bigMode ? "100%" : "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Terminal header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "var(--space-1) var(--space-3)",
          borderBottom: "1px solid var(--border-subtle)",
          gap: "var(--space-2)",
        }}
      >
        <span
          style={{
            fontSize: "var(--font-size-xs)",
            color: "var(--text-tertiary)",
            fontFamily: "var(--font-mono)",
          }}
        >
          {shell ?? "Terminal"}
        </span>
        {cwd && (
          <span
            style={{
              fontSize: "var(--font-size-xs)",
              color: "var(--text-tertiary)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              flex: 1,
            }}
          >
            {cwd}
          </span>
        )}
      </div>

      {/* Localhost URLs bar */}
      {localhostUrls.length > 0 && (
        <div
          style={{
            padding: "var(--space-1) var(--space-3)",
            borderBottom: "1px solid var(--border-subtle)",
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontSize: "var(--font-size-xs)",
              color: "var(--text-tertiary)",
            }}
          >
            Localhost:
          </span>
          {localhostUrls.map((url) => (
            <a
              key={url}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: "var(--font-size-xs)",
                color: "var(--accent-primary)",
                textDecoration: "underline",
              }}
            >
              {url}
            </a>
          ))}
          <button
            onClick={() => setLocalhostUrls([])}
            style={{
              background: "none",
              border: "none",
              color: "var(--text-tertiary)",
              cursor: "pointer",
              fontSize: 10,
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* xterm.js container */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          backgroundColor: "#1a1612",
          padding: "var(--space-1)",
        }}
      />
    </div>
  );
}
