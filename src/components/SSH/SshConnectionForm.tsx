import { useState, useCallback } from "react";

interface SshConnectionFormProps {
  onSubmit: (params: {
    name: string;
    host: string;
    port?: number;
    username: string;
    auth_type?: string;
    private_key_path?: string;
    use_agent?: boolean;
  }) => Promise<void>;
  onCancel: () => void;
  submitting?: boolean;
}

export function SshConnectionForm({ onSubmit, onCancel, submitting }: SshConnectionFormProps) {
  const [name, setName] = useState("");
  const [host, setHost] = useState("");
  const [port, setPort] = useState("22");
  const [username, setUsername] = useState("");
  const [authType, setAuthType] = useState("key");
  const [privateKeyPath, setPrivateKeyPath] = useState("~/.ssh/id_rsa");
  const [useAgent, setUseAgent] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      if (!name.trim() || !host.trim() || !username.trim()) {
        setError("Name, host, and username are required.");
        return;
      }

      try {
        await onSubmit({
          name: name.trim(),
          host: host.trim(),
          port: parseInt(port, 10) || 22,
          username: username.trim(),
          auth_type: authType,
          private_key_path: authType === "key" ? privateKeyPath.trim() || undefined : undefined,
          use_agent: useAgent,
        });
      } catch (err) {
        setError(String(err));
      }
    },
    [name, host, port, username, authType, privateKeyPath, useAgent, onSubmit]
  );

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "var(--space-2)",
    background: "var(--bg-input)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    color: "var(--text-primary)",
    fontSize: "var(--font-size-sm)",
    fontFamily: "inherit",
    outline: "none",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    color: "var(--text-secondary)",
    fontSize: "var(--font-size-xs)",
    marginBottom: "var(--space-1)",
    fontWeight: 500,
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      <div>
        <label style={labelStyle}>Connection Name</label>
        <input
          style={inputStyle}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My Server"
          autoFocus
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 80px", gap: "var(--space-2)" }}>
        <div>
          <label style={labelStyle}>Host</label>
          <input
            style={inputStyle}
            value={host}
            onChange={(e) => setHost(e.target.value)}
            placeholder="example.com"
          />
        </div>
        <div>
          <label style={labelStyle}>Port</label>
          <input
            style={inputStyle}
            type="number"
            value={port}
            onChange={(e) => setPort(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label style={labelStyle}>Username</label>
        <input
          style={inputStyle}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="root"
        />
      </div>

      <div>
        <label style={labelStyle}>Authentication</label>
        <select
          value={authType}
          onChange={(e) => setAuthType(e.target.value)}
          style={{
            ...inputStyle,
            cursor: "pointer",
          }}
        >
          <option value="key">SSH Key</option>
          <option value="agent">SSH Agent</option>
          <option value="password">Password</option>
        </select>
      </div>

      {authType === "key" && (
        <div>
          <label style={labelStyle}>Private Key Path</label>
          <input
            style={{ ...inputStyle, fontFamily: "var(--font-mono)" }}
            value={privateKeyPath}
            onChange={(e) => setPrivateKeyPath(e.target.value)}
            placeholder="~/.ssh/id_rsa"
          />
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
        <input
          type="checkbox"
          id="use-agent"
          checked={useAgent}
          onChange={(e) => setUseAgent(e.target.checked)}
          style={{ accentColor: "var(--accent-primary)" }}
        />
        <label
          htmlFor="use-agent"
          style={{ color: "var(--text-secondary)", fontSize: "var(--font-size-sm)", cursor: "pointer" }}
        >
          Use SSH agent forwarding
        </label>
      </div>

      {error && (
        <div
          style={{
            color: "var(--error)",
            fontSize: "var(--font-size-xs)",
            padding: "var(--space-2)",
            background: "color-mix(in srgb, var(--error) 10%, transparent)",
            borderRadius: "var(--radius-sm)",
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: "var(--space-2)", justifyContent: "flex-end", marginTop: "var(--space-2)" }}>
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: "var(--space-2) var(--space-4)",
            background: "none",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            color: "var(--text-secondary)",
            fontSize: "var(--font-size-sm)",
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          style={{
            padding: "var(--space-2) var(--space-4)",
            background: "var(--accent-primary)",
            border: "none",
            borderRadius: "var(--radius-sm)",
            color: "var(--bg-base)",
            fontSize: "var(--font-size-sm)",
            fontWeight: 500,
            cursor: submitting ? "default" : "pointer",
            opacity: submitting ? 0.7 : 1,
          }}
        >
          {submitting ? "Adding..." : "Add Connection"}
        </button>
      </div>
    </form>
  );
}
