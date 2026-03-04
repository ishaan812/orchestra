import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";

interface EnvVar {
  key: string;
  value: string;
}

interface EnvSettingsProps {
  repoId: string;
}

const COMMON_VARS = [
  "ANTHROPIC_API_KEY",
  "OPENAI_API_KEY",
  "GITHUB_TOKEN",
];

export function EnvSettings({ repoId }: EnvSettingsProps) {
  const [vars, setVars] = useState<EnvVar[]>([]);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadVars = useCallback(async () => {
    setLoading(true);
    try {
      const result = await invoke<EnvVar[]>("get_env_vars", { repoId });
      setVars(result);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [repoId]);

  useEffect(() => {
    loadVars();
  }, [loadVars]);

  const handleAdd = useCallback(async () => {
    if (!newKey.trim() || !newValue.trim()) return;
    try {
      await invoke("set_env_var", {
        repoId,
        key: newKey.trim(),
        value: newValue.trim(),
      });
      setNewKey("");
      setNewValue("");
      await loadVars();
    } catch (e) {
      setError(String(e));
    }
  }, [repoId, newKey, newValue, loadVars]);

  const handleDelete = useCallback(
    async (key: string) => {
      try {
        await invoke("delete_env_var", { repoId, key });
        await loadVars();
      } catch (e) {
        setError(String(e));
      }
    },
    [repoId, loadVars]
  );

  const handleAddCommon = useCallback(
    (key: string) => {
      setNewKey(key);
      // Focus the value input
    },
    []
  );

  return (
    <div style={{ padding: "var(--space-3)" }}>
      <div
        style={{
          fontSize: "var(--font-size-sm)",
          fontWeight: 600,
          color: "var(--text-primary)",
          marginBottom: "var(--space-3)",
        }}
      >
        Environment Variables
      </div>

      {error && (
        <div
          style={{
            padding: "var(--space-2)",
            backgroundColor: "var(--error-bg)",
            borderRadius: "var(--radius-sm)",
            color: "var(--error)",
            fontSize: "var(--font-size-xs)",
            marginBottom: "var(--space-2)",
          }}
        >
          {error}
        </div>
      )}

      {/* Current vars */}
      {vars.length > 0 && (
        <div style={{ marginBottom: "var(--space-3)" }}>
          {vars.map((v) => (
            <div
              key={v.key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-2)",
                padding: "var(--space-1) 0",
                borderBottom: "1px solid var(--border-subtle)",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--font-size-sm)",
                  color: "var(--text-primary)",
                  minWidth: 140,
                }}
              >
                {v.key}
              </span>
              <span
                style={{
                  flex: 1,
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--font-size-sm)",
                  color: "var(--text-tertiary)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {"•".repeat(Math.min(v.value.length, 20))}
              </span>
              <button
                onClick={() => handleDelete(v.key)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--error)",
                  cursor: "pointer",
                  fontSize: "var(--font-size-xs)",
                  padding: "var(--space-1)",
                }}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      {loading && (
        <div
          style={{
            color: "var(--text-tertiary)",
            fontSize: "var(--font-size-xs)",
            marginBottom: "var(--space-2)",
          }}
        >
          Loading...
        </div>
      )}

      {/* Add new */}
      <div style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-2)" }}>
        <input
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
          placeholder="KEY"
          style={{
            width: 140,
            padding: "var(--space-1) var(--space-2)",
            backgroundColor: "var(--bg-input)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            color: "var(--text-primary)",
            fontSize: "var(--font-size-sm)",
            fontFamily: "var(--font-mono)",
          }}
        />
        <input
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAdd();
          }}
          placeholder="value"
          type="password"
          style={{
            flex: 1,
            padding: "var(--space-1) var(--space-2)",
            backgroundColor: "var(--bg-input)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            color: "var(--text-primary)",
            fontSize: "var(--font-size-sm)",
            fontFamily: "var(--font-mono)",
          }}
        />
        <button
          onClick={handleAdd}
          disabled={!newKey.trim() || !newValue.trim()}
          style={{
            padding: "var(--space-1) var(--space-3)",
            backgroundColor:
              newKey.trim() && newValue.trim()
                ? "var(--accent-primary)"
                : "var(--bg-elevated)",
            border: "none",
            borderRadius: "var(--radius-sm)",
            color:
              newKey.trim() && newValue.trim()
                ? "var(--bg-base)"
                : "var(--text-tertiary)",
            fontSize: "var(--font-size-xs)",
            fontWeight: 600,
            cursor:
              newKey.trim() && newValue.trim() ? "pointer" : "not-allowed",
          }}
        >
          Add
        </button>
      </div>

      {/* Quick add common vars */}
      <div style={{ display: "flex", gap: "var(--space-1)", flexWrap: "wrap" }}>
        {COMMON_VARS.filter(
          (cv) => !vars.some((v) => v.key === cv)
        ).map((cv) => (
          <button
            key={cv}
            onClick={() => handleAddCommon(cv)}
            style={{
              padding: "2px var(--space-2)",
              backgroundColor: "transparent",
              border: "1px dashed var(--border)",
              borderRadius: "var(--radius-sm)",
              color: "var(--text-tertiary)",
              fontSize: "var(--font-size-xs)",
              cursor: "pointer",
              fontFamily: "var(--font-mono)",
            }}
          >
            + {cv}
          </button>
        ))}
      </div>
    </div>
  );
}
