import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useSettingsStore } from "../../hooks/useSettings";
import { EnvSettings } from "./EnvSettings";

interface SettingsPageProps {
  onClose: () => void;
  selectedRepoId: string | null;
}

type SectionId = "chat" | "appearance" | "git" | "env" | "repo" | "integrations" | "about";

const SECTIONS: { id: SectionId; label: string }[] = [
  { id: "chat", label: "Chat" },
  { id: "appearance", label: "Appearance" },
  { id: "git", label: "Git" },
  { id: "env", label: "Environment" },
  { id: "repo", label: "Repository" },
  { id: "integrations", label: "Integrations" },
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
