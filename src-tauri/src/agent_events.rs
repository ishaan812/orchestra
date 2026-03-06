use serde::{Deserialize, Serialize};

/// Structured events parsed from agent CLI output.
/// Ported from emdash's AgentEventService.ts.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentEvent {
    pub event_type: AgentEventType,
    pub session_id: String,
    pub timestamp: String,
    pub data: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AgentEventType {
    ToolUse,
    ToolResult,
    CostUpdate,
    ContextUsage,
    TokenCount,
    ModelSwitch,
    Thinking,
    Error,
    Complete,
}

/// Parse structured agent events from a Claude Code JSON stream line.
pub fn parse_claude_event(line: &str, session_id: &str) -> Option<AgentEvent> {
    let json: serde_json::Value = serde_json::from_str(line).ok()?;
    let event_type = json.get("type")?.as_str()?;

    let now = chrono::Utc::now().to_rfc3339();

    match event_type {
        "tool_use" => Some(AgentEvent {
            event_type: AgentEventType::ToolUse,
            session_id: session_id.to_string(),
            timestamp: now,
            data: serde_json::json!({
                "tool_name": json.get("name").and_then(|n| n.as_str()),
                "tool_id": json.get("id").and_then(|n| n.as_str()),
                "input": json.get("input"),
            }),
        }),
        "tool_result" => Some(AgentEvent {
            event_type: AgentEventType::ToolResult,
            session_id: session_id.to_string(),
            timestamp: now,
            data: serde_json::json!({
                "tool_use_id": json.get("tool_use_id").and_then(|n| n.as_str()),
                "content": json.get("content"),
                "is_error": json.get("is_error").and_then(|n| n.as_bool()).unwrap_or(false),
            }),
        }),
        "thinking" => Some(AgentEvent {
            event_type: AgentEventType::Thinking,
            session_id: session_id.to_string(),
            timestamp: now,
            data: serde_json::json!({
                "thinking": json.get("thinking").and_then(|t| t.as_str()),
            }),
        }),
        "error" => Some(AgentEvent {
            event_type: AgentEventType::Error,
            session_id: session_id.to_string(),
            timestamp: now,
            data: serde_json::json!({
                "error": json.get("error").or_else(|| json.get("message")),
            }),
        }),
        "result" => {
            // Extract cost/token info if available
            let usage = json.get("usage");
            Some(AgentEvent {
                event_type: AgentEventType::Complete,
                session_id: session_id.to_string(),
                timestamp: now,
                data: serde_json::json!({
                    "result": json.get("result"),
                    "usage": usage,
                    "cost": json.get("cost_usd"),
                }),
            })
        }
        "system" => {
            // Check for context usage events
            if let Some(usage) = json.get("context_window_usage") {
                return Some(AgentEvent {
                    event_type: AgentEventType::ContextUsage,
                    session_id: session_id.to_string(),
                    timestamp: now,
                    data: serde_json::json!({
                        "used_percent": usage.get("percent_used"),
                        "tokens_used": usage.get("tokens_used"),
                        "tokens_max": usage.get("tokens_max"),
                    }),
                });
            }
            None
        }
        _ => None,
    }
}

/// Parse events from Codex terminal output (best-effort, mostly unstructured).
pub fn parse_codex_event(line: &str, session_id: &str) -> Option<AgentEvent> {
    let now = chrono::Utc::now().to_rfc3339();

    // Codex is terminal-only, try JSON first
    if line.starts_with('{') {
        if let Ok(json) = serde_json::from_str::<serde_json::Value>(line) {
            let event_type = json.get("type").and_then(|t| t.as_str());
            if let Some(et) = event_type {
                return match et {
                    "error" => Some(AgentEvent {
                        event_type: AgentEventType::Error,
                        session_id: session_id.to_string(),
                        timestamp: now,
                        data: json,
                    }),
                    _ => None,
                };
            }
        }
    }

    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_tool_use() {
        let line = r#"{"type":"tool_use","id":"tu_1","name":"Read","input":{"path":"/tmp/test"}}"#;
        let event = parse_claude_event(line, "session-1").unwrap();
        assert!(matches!(event.event_type, AgentEventType::ToolUse));
        assert_eq!(event.data["tool_name"], "Read");
    }

    #[test]
    fn test_parse_error() {
        let line = r#"{"type":"error","error":"Something went wrong"}"#;
        let event = parse_claude_event(line, "session-1").unwrap();
        assert!(matches!(event.event_type, AgentEventType::Error));
    }

    #[test]
    fn test_parse_unknown_returns_none() {
        let line = r#"{"type":"unknown_thing","data":"foo"}"#;
        assert!(parse_claude_event(line, "session-1").is_none());
    }

    #[test]
    fn test_parse_invalid_json_returns_none() {
        assert!(parse_claude_event("not json at all", "session-1").is_none());
    }
}
