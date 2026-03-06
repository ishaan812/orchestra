use super::{AgentAdapter, AgentConfig, AgentMessage, AgentMessageType, AgentProcess, ModelInfo};
use std::collections::HashMap;
use std::path::Path;
use std::process::{Command, Stdio};

/// Codex CLI adapter.
/// Codex is terminal-only and uses keystroke injection for prompts.
pub struct CodexAdapter;

impl AgentAdapter for CodexAdapter {
    fn name(&self) -> &'static str {
        "codex"
    }

    fn supported_models(&self) -> Vec<ModelInfo> {
        vec![
            ModelInfo {
                id: "o4-mini".into(),
                name: "o4-mini".into(),
                provider: "openai".into(),
            },
            ModelInfo {
                id: "o3".into(),
                name: "o3".into(),
                provider: "openai".into(),
            },
            ModelInfo {
                id: "gpt-4.1".into(),
                name: "GPT-4.1".into(),
                provider: "openai".into(),
            },
        ]
    }

    fn spawn(
        &self,
        config: &AgentConfig,
        workdir: &Path,
        env: &HashMap<String, String>,
    ) -> Result<AgentProcess, String> {
        let mut cmd = Command::new("codex");

        // Codex uses --full-auto for auto-approve mode
        cmd.arg("--full-auto");

        cmd.current_dir(workdir)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());

        // Forward extra environment variables
        for (key, value) in env {
            cmd.env(key, value);
        }

        let mut child = cmd.spawn().map_err(|e| {
            format!(
                "Failed to spawn codex CLI. Is it installed? Error: {}",
                e
            )
        })?;

        let pid = child.id();

        // Codex uses keystroke injection — write the prompt to stdin
        {
            use std::io::Write;
            if let Some(stdin) = child.stdin.as_mut() {
                let _ = stdin.write_all(config.task_prompt.as_bytes());
                let _ = stdin.write_all(b"\n");
                let _ = stdin.flush();
            }
        }

        Ok(AgentProcess {
            child,
            pid,
            agent_type: "codex".to_string(),
        })
    }

    fn parse_output(&self, raw: &str) -> Vec<AgentMessage> {
        // Codex is terminal-only — output is plain text, not structured JSON.
        // We emit each non-empty line as a Text message.
        let mut messages = Vec::new();

        for line in raw.lines() {
            let line = line.trim();
            if line.is_empty() {
                continue;
            }

            // Try JSON first (codex may emit some structured output in newer versions)
            if line.starts_with('{') {
                if let Ok(json) = serde_json::from_str::<serde_json::Value>(line) {
                    let msg_type = json
                        .get("type")
                        .and_then(|t| t.as_str())
                        .unwrap_or("text");

                    let content = json
                        .get("content")
                        .or_else(|| json.get("message"))
                        .and_then(|v| v.as_str())
                        .unwrap_or(line)
                        .to_string();

                    messages.push(AgentMessage {
                        message_type: if msg_type == "error" {
                            AgentMessageType::Error
                        } else {
                            AgentMessageType::Text
                        },
                        content,
                        tool_name: None,
                        tool_args: None,
                        model: None,
                        raw_json: Some(line.to_string()),
                    });
                    continue;
                }
            }

            // Plain text fallback
            messages.push(AgentMessage {
                message_type: AgentMessageType::Text,
                content: line.to_string(),
                tool_name: None,
                tool_args: None,
                model: None,
                raw_json: None,
            });
        }

        messages
    }
}
