pub mod claude;
pub mod codex;

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::Path;
use std::sync::Arc;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ModelInfo {
    pub id: String,
    pub name: String,
    pub provider: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AgentConfig {
    pub task_prompt: String,
    pub model: String,
    pub thinking_enabled: bool,
    pub thinking_level: Option<String>,
    pub custom_instructions: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AgentMessageType {
    Text,
    ToolUse,
    ToolResult,
    Thinking,
    Error,
    Result,
    System,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentMessage {
    pub message_type: AgentMessageType,
    pub content: String,
    pub tool_name: Option<String>,
    pub tool_args: Option<String>,
    pub model: Option<String>,
    pub raw_json: Option<String>,
}

pub struct AgentProcess {
    pub child: std::process::Child,
    pub pid: u32,
    pub agent_type: String,
}

impl AgentProcess {
    pub fn is_running(&self) -> bool {
        // Check if the process is still alive by trying waitpid with WNOHANG
        unsafe {
            let mut status: libc::c_int = 0;
            let result = libc::waitpid(self.pid as libc::pid_t, &mut status, libc::WNOHANG);
            result == 0
        }
    }

    pub fn send_input(&mut self, input: &str) -> Result<(), String> {
        use std::io::Write;
        if let Some(stdin) = self.child.stdin.as_mut() {
            stdin
                .write_all(input.as_bytes())
                .map_err(|e| e.to_string())?;
            stdin.flush().map_err(|e| e.to_string())?;
            Ok(())
        } else {
            Err("No stdin available".to_string())
        }
    }

    pub fn send_cancel(&self) -> Result<(), String> {
        unsafe {
            libc::kill(self.pid as libc::pid_t, libc::SIGINT);
        }
        Ok(())
    }

    pub fn stop(&mut self) -> Result<(), String> {
        unsafe {
            libc::kill(self.pid as libc::pid_t, libc::SIGTERM);
        }
        // Give it a moment, then force kill
        std::thread::sleep(std::time::Duration::from_secs(2));
        let _ = self.child.kill();
        Ok(())
    }
}

pub trait AgentAdapter: Send + Sync {
    fn name(&self) -> &'static str;
    fn supported_models(&self) -> Vec<ModelInfo>;
    fn spawn(
        &self,
        config: &AgentConfig,
        workdir: &Path,
        env: &HashMap<String, String>,
    ) -> Result<AgentProcess, String>;
    fn parse_output(&self, raw: &str) -> Vec<AgentMessage>;
}

/// Create an adapter for the given provider ID.
pub fn create_adapter(provider_id: &str) -> Result<Arc<dyn AgentAdapter>, String> {
    match provider_id {
        "claude" | "claude-code" => Ok(Arc::new(claude::ClaudeAdapter)),
        "codex" => Ok(Arc::new(codex::CodexAdapter)),
        _ => Err(format!("Unknown provider: {}", provider_id)),
    }
}
