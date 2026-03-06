use serde::{Deserialize, Serialize};

/// Defines a provider (CLI agent) that Orchestra can launch.
/// Ported from emdash's ProviderDefinition in shared/providers/registry.ts,
/// scoped to Claude Code and Codex only.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderDefinition {
    /// Unique identifier (e.g. "claude", "codex")
    pub id: &'static str,
    /// Display name (e.g. "Claude Code", "Codex")
    pub name: &'static str,
    /// CLI binary name (e.g. "claude", "codex")
    pub cli: &'static str,
    /// Subcommands to invoke the agent (empty = just run the CLI)
    pub commands: &'static [&'static str],
    /// Args to check version (e.g. ["--version"])
    pub version_args: &'static [&'static str],
    /// Flag to enable auto-approve / full-auto mode
    pub auto_approve_flag: Option<&'static str>,
    /// Flag to pass initial prompt text
    pub initial_prompt_flag: Option<&'static str>,
    /// Whether this provider uses keystroke injection instead of CLI flags
    pub use_keystroke_injection: bool,
    /// Flag/args to resume a previous session
    pub resume_flag: Option<&'static str>,
    /// Flag to specify a session ID
    pub session_id_flag: Option<&'static str>,
    /// Default arguments always passed
    pub default_args: &'static [&'static str],
    /// Command to activate plan mode (e.g. "/plan")
    pub plan_activate_command: Option<&'static str>,
    /// Command string that auto-starts the agent
    pub auto_start_command: Option<&'static str>,
    /// If true, this agent runs only in the terminal (no structured JSON output)
    pub terminal_only: bool,
}

/// Static provider definitions for Claude Code and Codex.
pub static PROVIDERS: &[ProviderDefinition] = &[
    ProviderDefinition {
        id: "claude",
        name: "Claude Code",
        cli: "claude",
        commands: &[],
        version_args: &["--version"],
        auto_approve_flag: Some("--dangerously-skip-permissions"),
        initial_prompt_flag: Some("-p"),
        use_keystroke_injection: false,
        resume_flag: Some("-c -r"),
        session_id_flag: Some("--session-id"),
        default_args: &["--output-format", "stream-json", "--verbose"],
        plan_activate_command: Some("/plan"),
        auto_start_command: None,
        terminal_only: false,
    },
    ProviderDefinition {
        id: "codex",
        name: "Codex",
        cli: "codex",
        commands: &[],
        version_args: &["--version"],
        auto_approve_flag: Some("--full-auto"),
        initial_prompt_flag: None,
        use_keystroke_injection: true,
        resume_flag: None,
        session_id_flag: None,
        default_args: &[],
        plan_activate_command: None,
        auto_start_command: None,
        terminal_only: true,
    },
];

impl ProviderDefinition {
    /// Find a provider by its ID.
    pub fn find(id: &str) -> Option<&'static ProviderDefinition> {
        PROVIDERS.iter().find(|p| p.id == id)
    }
}
