use super::{AgentAdapter, AgentConfig, AgentMessage, AgentMessageType, AgentProcess, ModelInfo};
use std::collections::HashMap;
use std::path::Path;
use std::process::{Command, Stdio};

pub struct ClaudeAdapter;

impl AgentAdapter for ClaudeAdapter {
    fn name(&self) -> &'static str {
        "claude-code"
    }

    fn supported_models(&self) -> Vec<ModelInfo> {
        vec![
            ModelInfo {
                id: "claude-opus-4-6".into(),
                name: "Opus 4.6".into(),
                provider: "anthropic".into(),
            },
            ModelInfo {
                id: "claude-sonnet-4-6".into(),
                name: "Sonnet 4.6".into(),
                provider: "anthropic".into(),
            },
            ModelInfo {
                id: "claude-haiku-4-5-20251001".into(),
                name: "Haiku 4.5".into(),
                provider: "anthropic".into(),
            },
        ]
    }

    fn spawn(
        &self,
        config: &AgentConfig,
        workdir: &Path,
        env: &HashMap<String, String>,
    ) -> Result<AgentProcess, String> {
        let mut cmd = Command::new("claude");
        cmd.arg("--print")
            .arg("--output-format")
            .arg("stream-json")
            .arg("--model")
            .arg(&config.model)
            .current_dir(workdir)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());

        if let Some(instructions) = &config.custom_instructions {
            cmd.env("CLAUDE_CODE_SYSTEM_PROMPT", instructions);
        }

        // Forward extra environment variables
        for (key, value) in env {
            cmd.env(key, value);
        }

        // Send the initial prompt via stdin
        cmd.arg("--verbose");

        let mut child = cmd.spawn().map_err(|e| {
            format!(
                "Failed to spawn claude CLI. Is it installed? Error: {}",
                e
            )
        })?;

        let pid = child.id();

        // Write initial prompt to stdin
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
            agent_type: "claude-code".to_string(),
        })
    }

    fn parse_output(&self, raw: &str) -> Vec<AgentMessage> {
        let mut messages = Vec::new();

        for line in raw.lines() {
            let line = line.trim();
            if line.is_empty() {
                continue;
            }

            // Try to parse as JSON
            if let Ok(json) = serde_json::from_str::<serde_json::Value>(line) {
                let msg_type = json
                    .get("type")
                    .and_then(|t| t.as_str())
                    .unwrap_or("unknown");

                let message = match msg_type {
                    "assistant" => {
                        let content = json
                            .get("message")
                            .and_then(|m| m.get("content"))
                            .and_then(|c| {
                                if let Some(arr) = c.as_array() {
                                    arr.iter()
                                        .filter_map(|block| {
                                            if block.get("type").and_then(|t| t.as_str())
                                                == Some("text")
                                            {
                                                block.get("text").and_then(|t| t.as_str())
                                            } else {
                                                None
                                            }
                                        })
                                        .collect::<Vec<_>>()
                                        .join("")
                                        .into()
                                } else {
                                    c.as_str().map(String::from)
                                }
                            })
                            .unwrap_or_default();

                        AgentMessage {
                            message_type: AgentMessageType::Text,
                            content,
                            tool_name: None,
                            tool_args: None,
                            model: json
                                .get("message")
                                .and_then(|m| m.get("model"))
                                .and_then(|m| m.as_str())
                                .map(String::from),
                            raw_json: Some(line.to_string()),
                        }
                    }

                    "tool_use" => AgentMessage {
                        message_type: AgentMessageType::ToolUse,
                        content: json
                            .get("name")
                            .and_then(|n| n.as_str())
                            .unwrap_or("unknown")
                            .to_string(),
                        tool_name: json
                            .get("name")
                            .and_then(|n| n.as_str())
                            .map(String::from),
                        tool_args: json.get("input").map(|i| i.to_string()),
                        model: None,
                        raw_json: Some(line.to_string()),
                    },

                    "tool_result" => AgentMessage {
                        message_type: AgentMessageType::ToolResult,
                        content: json
                            .get("content")
                            .and_then(|c| c.as_str())
                            .unwrap_or("")
                            .to_string(),
                        tool_name: None,
                        tool_args: None,
                        model: None,
                        raw_json: Some(line.to_string()),
                    },

                    "thinking" => AgentMessage {
                        message_type: AgentMessageType::Thinking,
                        content: json
                            .get("thinking")
                            .and_then(|t| t.as_str())
                            .unwrap_or("")
                            .to_string(),
                        tool_name: None,
                        tool_args: None,
                        model: None,
                        raw_json: Some(line.to_string()),
                    },

                    "error" => AgentMessage {
                        message_type: AgentMessageType::Error,
                        content: json
                            .get("error")
                            .and_then(|e| e.as_str())
                            .or_else(|| json.get("message").and_then(|m| m.as_str()))
                            .unwrap_or("Unknown error")
                            .to_string(),
                        tool_name: None,
                        tool_args: None,
                        model: None,
                        raw_json: Some(line.to_string()),
                    },

                    "result" => AgentMessage {
                        message_type: AgentMessageType::Result,
                        content: json
                            .get("result")
                            .and_then(|r| r.as_str())
                            .unwrap_or("")
                            .to_string(),
                        tool_name: None,
                        tool_args: None,
                        model: None,
                        raw_json: Some(line.to_string()),
                    },

                    _ => AgentMessage {
                        message_type: AgentMessageType::System,
                        content: line.to_string(),
                        tool_name: None,
                        tool_args: None,
                        model: None,
                        raw_json: Some(line.to_string()),
                    },
                };

                messages.push(message);
            }
        }

        messages
    }
}
