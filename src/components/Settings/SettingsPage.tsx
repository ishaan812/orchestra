import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useSettingsStore } from "../../hooks/useSettings";
import { EnvSettings } from "./EnvSettings";
import { SshSettingsCard } from "../SSH/SshSettingsCard";

interface SettingsPageProps {
  onClose: () => void;
  selectedRepoId: string | null;
}

type SectionId = "agents" | "chat" | "appearance" | "git" | "env" | "repo" | "integrations" | "github" | "terminal" | "ssh" | "about";

const SECTIONS: { id: SectionId; label: string }[] = [
  { id: "agents", label: "Agents" },
  { id: "chat", label: "Chat" },
  { id: "appearance", label: "Appearance" },
  { id: "git", label: "Git" },
  { id: "terminal", label: "Terminal" },
  { id: "env", label: "Environment" },
  { id: "repo", label: "Repository" },
  { id: "github", label: "GitHub" },
  { id: "integrations", label: "Integrations" },
  { id: "ssh", label: "SSH" },
  { id: "about", label: "About" },
];

export function SettingsPage({ onClose, selectedRepoId }: SettingsPageProps) {
  const [activeSection, setActiveSection] = useState<SectionId>("chat");
  const { settings, fetchSettings, setSetting, loading } = useSettingsStore();
  const [installedIdes, setInstalledIdes] = useState<string[]>([]);

  useEffect(() => {
    fetchSettings();
    invoke<string[]>("detect_installed_ides").then(setInstalledIdes).catch(() => {});
  }, [fetchSettings]);

  const handleChange = useCallback(
    (key: string, value: string) => {
      setSetting(key, value);
    },
    [setSetting]
  );

  if (loading) {
    return (
      <div style={{ padding: "var(--space-6)", color: "var(--text-tertiary)" }}>
        Loading settings...
      </div>
    );
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div
        style={{
          padding: "var(--space-3) var(--space-4)",
          borderBottom: "1px solid var(--border-subtle)",
          display: "flex",
          alignItems: "center",
          gap: "var(--space-3)",
        }}
      >
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: "var(--accent-primary)",
            cursor: "pointer",
            fontSize: "var(--font-size-sm)",
          }}
        >
          ← Back
        </button>
        <h1
          style={{
            color: "var(--text-primary)",
            fontSize: "var(--font-size-lg)",
            fontWeight: 600,
            margin: 0,
          }}
        >
          Settings
        </h1>
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Section nav */}
        <div
          style={{
            width: 180,
            borderRight: "1px solid var(--border-subtle)",
            padding: "var(--space-2)",
          }}
        >
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "var(--space-2) var(--space-3)",
                background: activeSection === s.id ? "var(--bg-hover)" : "none",
                border: "none",
                borderRadius: "var(--radius-sm)",
                color: activeSection === s.id ? "var(--text-primary)" : "var(--text-secondary)",
                fontSize: "var(--font-size-sm)",
                cursor: "pointer",
              }}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Section content */}
        <div style={{ flex: 1, overflow: "auto", padding: "var(--space-4)" }}>
          {activeSection === "agents" && (
            <AgentSettings settings={settings} onChange={handleChange} />
          )}
          {activeSection === "chat" && (
            <ChatSettings settings={settings} onChange={handleChange} />
          )}
          {activeSection === "appearance" && (
            <AppearanceSettings settings={settings} onChange={handleChange} />
          )}
          {activeSection === "git" && (
            <GitSettings settings={settings} onChange={handleChange} />
          )}
          {activeSection === "env" && selectedRepoId && (
            <EnvSettings repoId={selectedRepoId} />
          )}
          {activeSection === "env" && !selectedRepoId && (
            <p style={{ color: "var(--text-tertiary)", fontSize: "var(--font-size-sm)" }}>
              Select a repository to manage environment variables.
            </p>
          )}
          {activeSection === "terminal" && (
            <TerminalSettings settings={settings} onChange={handleChange} />
          )}
          {activeSection === "github" && (
            <GitHubSettings settings={settings} onChange={handleChange} />
          )}
          {activeSection === "ssh" && <SshSettingsCard />}
          {activeSection === "integrations" && (
            <IntegrationSettings
              settings={settings}
              onChange={handleChange}
              installedIdes={installedIdes}
            />
          )}
          {activeSection === "about" && <AboutSection />}
        </div>
      </div>
    </div>
  );
}

// --- Section components ---

interface SectionProps {
  settings: Record<string, string>;
  onChange: (key: string, value: string) => void;
}

function SettingRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "var(--space-2) 0",
        borderBottom: "1px solid var(--border-subtle)",
      }}
    >
      <span style={{ color: "var(--text-primary)", fontSize: "var(--font-size-sm)" }}>
        {label}
      </span>
      {children}
    </div>
  );
}

function SelectSetting({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { label: string; value: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-sm)",
        color: "var(--text-primary)",
        fontSize: "var(--font-size-sm)",
        padding: "var(--space-1) var(--space-2)",
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function ToggleSetting({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{
        width: 40,
        height: 22,
        borderRadius: 11,
        border: "none",
        backgroundColor: value ? "var(--accent-primary)" : "var(--bg-surface)",
        cursor: "pointer",
        position: "relative",
        transition: "background-color 150ms ease",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: value ? 20 : 2,
          width: 18,
          height: 18,
          borderRadius: 9,
          backgroundColor: "var(--text-primary)",
          transition: "left 150ms ease",
        }}
      />
    </button>
  );
}

function AgentSettings({ settings, onChange }: SectionProps) {
  return (
    <div>
      <h2 style={{ color: "var(--text-primary)", fontSize: "var(--font-size-md)", fontWeight: 600, marginBottom: "var(--space-3)" }}>
        Default Agent Settings
      </h2>
      <SettingRow label="Default Agent">
        <SelectSetting
          value={settings.default_agent ?? "claude"}
          options={[
            { label: "Claude Code", value: "claude" },
            { label: "Codex", value: "codex" },
          ]}
          onChange={(v) => onChange("default_agent", v)}
        />
      </SettingRow>
      <SettingRow label="Default Model">
        <SelectSetting
          value={settings.default_model ?? "claude-sonnet-4-6"}
          options={[
            { label: "Opus 4.6", value: "claude-opus-4-6" },
            { label: "Sonnet 4.6", value: "claude-sonnet-4-6" },
            { label: "Haiku 4.5", value: "claude-haiku-4-5-20251001" },
            { label: "o4-mini", value: "o4-mini" },
            { label: "o3", value: "o3" },
            { label: "GPT-4.1", value: "gpt-4.1" },
          ]}
          onChange={(v) => onChange("default_model", v)}
        />
      </SettingRow>
      <SettingRow label="Auto-approve Mode">
        <ToggleSetting
          value={settings.auto_approve === "true"}
          onChange={(v) => onChange("auto_approve", String(v))}
        />
      </SettingRow>
      <SettingRow label="Extended Thinking">
        <ToggleSetting
          value={settings.thinking_enabled === "true"}
          onChange={(v) => onChange("thinking_enabled", String(v))}
        />
      </SettingRow>
    </div>
  );
}

function ChatSettings({ settings, onChange }: SectionProps) {
  return (
    <div>
      <h2 style={{ color: "var(--text-primary)", fontSize: "var(--font-size-md)", fontWeight: 600, marginBottom: "var(--space-3)" }}>
        Chat
      </h2>
      <SettingRow label="Default Model">
        <SelectSetting
          value={settings.default_model ?? "opus"}
          options={[
            { label: "Opus", value: "opus" },
            { label: "Sonnet", value: "sonnet" },
            { label: "Haiku", value: "haiku" },
          ]}
          onChange={(v) => onChange("default_model", v)}
        />
      </SettingRow>
      <SettingRow label="Notifications">
        <ToggleSetting
          value={settings.notifications_enabled === "true"}
          onChange={(v) => onChange("notifications_enabled", String(v))}
        />
      </SettingRow>
      <SettingRow label="Sound Effects">
        <ToggleSetting
          value={settings.sound_effects_enabled === "true"}
          onChange={(v) => onChange("sound_effects_enabled", String(v))}
        />
      </SettingRow>
    </div>
  );
}

function AppearanceSettings({ settings, onChange }: SectionProps) {
  return (
    <div>
      <h2 style={{ color: "var(--text-primary)", fontSize: "var(--font-size-md)", fontWeight: 600, marginBottom: "var(--space-3)" }}>
        Appearance
      </h2>
      <SettingRow label="Markdown Style">
        <SelectSetting
          value={settings.markdown_style ?? "default"}
          options={[
            { label: "Default", value: "default" },
            { label: "Tufte", value: "tufte" },
          ]}
          onChange={(v) => onChange("markdown_style", v)}
        />
      </SettingRow>
      <SettingRow label="Show Context Wheel">
        <ToggleSetting
          value={settings.always_show_context_wheel === "true"}
          onChange={(v) => onChange("always_show_context_wheel", String(v))}
        />
      </SettingRow>
      <SettingRow label="Split View">
        <ToggleSetting
          value={settings.using_split_view === "true"}
          onChange={(v) => onChange("using_split_view", String(v))}
        />
      </SettingRow>
    </div>
  );
}

function GitSettings({ settings, onChange }: SectionProps) {
  return (
    <div>
      <h2 style={{ color: "var(--text-primary)", fontSize: "var(--font-size-md)", fontWeight: 600, marginBottom: "var(--space-3)" }}>
        Git
      </h2>
      <SettingRow label="Branch Prefix">
        <SelectSetting
          value={settings.branch_prefix_type ?? "github_username"}
          options={[
            { label: "GitHub Username", value: "github_username" },
            { label: "Custom", value: "custom" },
            { label: "None", value: "none" },
          ]}
          onChange={(v) => onChange("branch_prefix_type", v)}
        />
      </SettingRow>
    </div>
  );
}

function TerminalSettings({ settings, onChange }: SectionProps) {
  return (
    <div>
      <h2 style={{ color: "var(--text-primary)", fontSize: "var(--font-size-md)", fontWeight: 600, marginBottom: "var(--space-3)" }}>
        Terminal
      </h2>
      <SettingRow label="Font Size">
        <SelectSetting
          value={settings.terminal_font_size ?? "13"}
          options={[
            { label: "11px", value: "11" },
            { label: "12px", value: "12" },
            { label: "13px", value: "13" },
            { label: "14px", value: "14" },
            { label: "15px", value: "15" },
            { label: "16px", value: "16" },
          ]}
          onChange={(v) => onChange("terminal_font_size", v)}
        />
      </SettingRow>
      <SettingRow label="Scrollback Lines">
        <SelectSetting
          value={settings.terminal_scrollback ?? "5000"}
          options={[
            { label: "1000", value: "1000" },
            { label: "5000", value: "5000" },
            { label: "10000", value: "10000" },
            { label: "50000", value: "50000" },
          ]}
          onChange={(v) => onChange("terminal_scrollback", v)}
        />
      </SettingRow>
    </div>
  );
}

function GitHubSettings({ settings, onChange }: SectionProps) {
  return (
    <div>
      <h2 style={{ color: "var(--text-primary)", fontSize: "var(--font-size-md)", fontWeight: 600, marginBottom: "var(--space-3)" }}>
        GitHub
      </h2>
      <div style={{
        padding: "var(--space-3)",
        background: "var(--bg-surface)",
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--border)",
        marginBottom: "var(--space-3)",
      }}>
        <div style={{ fontSize: "var(--font-size-sm)", color: "var(--text-secondary)", marginBottom: "var(--space-2)" }}>
          GitHub CLI Status
        </div>
        <div style={{ fontSize: "var(--font-size-sm)", color: "var(--text-primary)" }}>
          Using <code style={{ fontFamily: "var(--font-mono)" }}>gh</code> CLI for authentication.
          Run <code style={{ fontFamily: "var(--font-mono)" }}>gh auth login</code> to authenticate.
        </div>
      </div>
      <SettingRow label="Auto-create PR">
        <ToggleSetting
          value={settings.auto_create_pr === "true"}
          onChange={(v) => onChange("auto_create_pr", String(v))}
        />
      </SettingRow>
      <SettingRow label="Default PR Draft">
        <ToggleSetting
          value={settings.default_pr_draft === "true"}
          onChange={(v) => onChange("default_pr_draft", String(v))}
        />
      </SettingRow>
    </div>
  );
}

function IntegrationSettings({
  settings,
  onChange,
  installedIdes,
}: SectionProps & { installedIdes: string[] }) {
  return (
    <div>
      <h2 style={{ color: "var(--text-primary)", fontSize: "var(--font-size-md)", fontWeight: 600, marginBottom: "var(--space-3)" }}>
        Integrations
      </h2>
      <SettingRow label="Default IDE">
        <SelectSetting
          value={settings.default_open_in ?? "cursor"}
          options={installedIdes.map((ide) => ({ label: ide, value: ide }))}
          onChange={(v) => onChange("default_open_in", v)}
        />
      </SettingRow>
      <SettingRow label="Linear API Key">
        <input
          type="password"
          value={settings.linear_api_key ?? ""}
          onChange={(e) => onChange("linear_api_key", e.target.value)}
          placeholder="lin_api_..."
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            color: "var(--text-primary)",
            fontSize: "var(--font-size-sm)",
            padding: "var(--space-1) var(--space-2)",
            width: 200,
          }}
        />
      </SettingRow>
    </div>
  );
}

function AboutSection() {
  return (
    <div>
      <h2 style={{ color: "var(--text-primary)", fontSize: "var(--font-size-md)", fontWeight: 600, marginBottom: "var(--space-3)" }}>
        About
      </h2>
      <div style={{ fontSize: "var(--font-size-sm)", color: "var(--text-secondary)", lineHeight: 1.8 }}>
        <div><strong>Orchestra</strong> v0.1.0</div>
        <div>Tauri 2.0 + React 19</div>
        <div>Built with Claude Code</div>
      </div>
    </div>
  );
}
