import { useState, useRef, useEffect } from "react";
import type { Repo } from "../../hooks/useRepos";

interface RepoSelectorProps {
  repos: Repo[];
  selectedRepoId: string | null;
  onSelect: (repoId: string) => void;
  onAddRepo: () => void;
}

export function RepoSelector({ repos, selectedRepoId, onSelect, onAddRepo }: RepoSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = repos.find((r) => r.id === selectedRepoId);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          padding: "var(--space-2) var(--space-3)",
          background: "var(--bg-input)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-md)",
          color: "var(--text-primary)",
          fontSize: "var(--font-size-sm)",
          cursor: "pointer",
          textAlign: "left",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>{selected?.name ?? "No repos added"}</span>
        <span style={{ color: "var(--text-tertiary)", fontSize: "var(--font-size-xs)" }}>▾</span>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            marginTop: "var(--space-1)",
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            boxShadow: "var(--shadow-md)",
            zIndex: 100,
            overflow: "hidden",
          }}
        >
          {repos.map((repo) => (
            <button
              key={repo.id}
              onClick={() => {
                onSelect(repo.id);
                setOpen(false);
              }}
              style={{
                width: "100%",
                padding: "var(--space-2) var(--space-3)",
                background: repo.id === selectedRepoId ? "var(--bg-surface-active)" : "transparent",
                border: "none",
                color: "var(--text-primary)",
                fontSize: "var(--font-size-sm)",
                cursor: "pointer",
                textAlign: "left",
              }}
              onMouseEnter={(e) => {
                if (repo.id !== selectedRepoId) {
                  e.currentTarget.style.backgroundColor = "var(--bg-surface-hover)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor =
                  repo.id === selectedRepoId ? "var(--bg-surface-active)" : "transparent";
              }}
            >
              {repo.name}
            </button>
          ))}
          <button
            onClick={() => {
              onAddRepo();
              setOpen(false);
            }}
            style={{
              width: "100%",
              padding: "var(--space-2) var(--space-3)",
              background: "transparent",
              border: "none",
              borderTop: repos.length > 0 ? "1px solid var(--border-subtle)" : "none",
              color: "var(--accent-primary)",
              fontSize: "var(--font-size-sm)",
              cursor: "pointer",
              textAlign: "left",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--bg-surface-hover)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            + Add Repository
          </button>
        </div>
      )}
    </div>
  );
}
