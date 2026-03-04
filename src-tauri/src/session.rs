use crate::agents::claude::ClaudeAdapter;
use crate::agents::{AgentAdapter, AgentConfig, AgentProcess};
use crate::db::DbPool;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tauri::{AppHandle, Emitter, State};
use tokio::sync::Mutex;

/// Holds all active agent processes, keyed by session ID.
#[derive(Default)]
pub struct SessionManager {
    pub processes: Mutex<HashMap<String, AgentProcess>>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SessionInfo {
    pub id: String,
    pub workspace_id: String,
    pub title: Option<String>,
    pub agent_type: String,
    pub model: Option<String>,
    pub permission_mode: String,
    pub thinking_enabled: bool,
    pub context_used_percent: f64,
    pub unread_count: i32,
    pub is_compacting: bool,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MessageInfo {
    pub id: String,
    pub session_id: String,
    pub role: String,
    pub content: String,
    pub full_message: Option<String>,
    pub model: Option<String>,
    pub turn_id: Option<String>,
    pub sent_at: String,
    pub cancelled_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateSessionParams {
    pub workspace_id: String,
    pub agent_type: String,
    pub model: String,
    pub task_prompt: String,
    pub thinking_enabled: bool,
}

#[tauri::command]
pub async fn create_session(
    params: CreateSessionParams,
    app: AppHandle,
    db: State<'_, DbPool>,
    sessions: State<'_, SessionManager>,
) -> Result<SessionInfo, String> {
    let id = uuid::Uuid::new_v4().to_string();

    sqlx::query(
        "INSERT INTO sessions (id, workspace_id, agent_type, model, thinking_enabled)
         VALUES (?, ?, ?, ?, ?)",
    )
    .bind(&id)
    .bind(&params.workspace_id)
    .bind(&params.agent_type)
    .bind(&params.model)
    .bind(params.thinking_enabled as i32)
    .execute(&db.0)
    .await
    .map_err(|e| e.to_string())?;

    // Get workspace worktree path
    let worktree_path: String =
        sqlx::query_scalar("SELECT worktree_path FROM workspaces WHERE id = ?")
            .bind(&params.workspace_id)
            .fetch_one(&db.0)
            .await
            .map_err(|e| e.to_string())?;

    // Get custom instructions from repo
    let custom_instructions: Option<String> = sqlx::query_scalar(
        "SELECT r.custom_prompt_general FROM repos r
         JOIN workspaces w ON w.repo_id = r.id
         WHERE w.id = ?",
    )
    .bind(&params.workspace_id)
    .fetch_optional(&db.0)
    .await
    .map_err(|e| e.to_string())?
    .flatten();

    let config = AgentConfig {
        task_prompt: params.task_prompt.clone(),
        model: params.model.clone(),
        thinking_enabled: params.thinking_enabled,
        thinking_level: None,
        custom_instructions,
    };

    // Spawn the agent
    let adapter = ClaudeAdapter;
    let env = HashMap::new();
    let mut process = adapter.spawn(&config, std::path::Path::new(&worktree_path), &env)?;

    // Take stdout for streaming — child retains stdin for input
    let stdout = process
        .child
        .stdout
        .take()
        .ok_or("Failed to capture agent stdout")?;

    // Store the process (without stdout, but with stdin)
    sessions.processes.lock().await.insert(id.clone(), process);

    // Start async output streaming
    let session_id = id.clone();
    let db_pool = db.0.clone();
    let app_handle = app.clone();

    tokio::spawn(async move {
        stream_agent_output(session_id, stdout, &db_pool, &app_handle, Arc::new(adapter)).await;
    });

    // Insert initial user message
    let msg_id = uuid::Uuid::new_v4().to_string();
    let turn_id = uuid::Uuid::new_v4().to_string();
    sqlx::query(
        "INSERT INTO session_messages (id, session_id, role, content, turn_id)
         VALUES (?, ?, 'user', ?, ?)",
    )
    .bind(&msg_id)
    .bind(&id)
    .bind(&params.task_prompt)
    .bind(&turn_id)
    .execute(&db.0)
    .await
    .map_err(|e| e.to_string())?;

    Ok(SessionInfo {
        id,
        workspace_id: params.workspace_id,
        title: None,
        agent_type: params.agent_type,
        model: Some(params.model),
        permission_mode: "default".to_string(),
        thinking_enabled: params.thinking_enabled,
        context_used_percent: 0.0,
        unread_count: 0,
        is_compacting: false,
        created_at: chrono::Utc::now().to_rfc3339(),
    })
}

#[tauri::command]
pub async fn send_message(
    session_id: String,
    content: String,
    db: State<'_, DbPool>,
    sessions: State<'_, SessionManager>,
) -> Result<MessageInfo, String> {
    let msg_id = uuid::Uuid::new_v4().to_string();
    let turn_id = uuid::Uuid::new_v4().to_string();

    sqlx::query(
        "INSERT INTO session_messages (id, session_id, role, content, turn_id)
         VALUES (?, ?, 'user', ?, ?)",
    )
    .bind(&msg_id)
    .bind(&session_id)
    .bind(&content)
    .bind(&turn_id)
    .execute(&db.0)
    .await
    .map_err(|e| e.to_string())?;

    // Update last_user_message_at
    sqlx::query("UPDATE sessions SET last_user_message_at = datetime('now') WHERE id = ?")
        .bind(&session_id)
        .execute(&db.0)
        .await
        .map_err(|e| e.to_string())?;

    // Send to agent stdin
    let mut processes = sessions.processes.lock().await;
    if let Some(process) = processes.get_mut(&session_id) {
        process.send_input(&format!("{}\n", content))?;
    }

    Ok(MessageInfo {
        id: msg_id,
        session_id,
        role: "user".to_string(),
        content,
        full_message: None,
        model: None,
        turn_id: Some(turn_id),
        sent_at: chrono::Utc::now().to_rfc3339(),
        cancelled_at: None,
    })
}

#[tauri::command]
pub async fn cancel_session(
    session_id: String,
    sessions: State<'_, SessionManager>,
) -> Result<(), String> {
    let processes = sessions.processes.lock().await;
    if let Some(process) = processes.get(&session_id) {
        process.send_cancel()?;
    }
    Ok(())
}

#[tauri::command]
pub async fn stop_session(
    session_id: String,
    sessions: State<'_, SessionManager>,
) -> Result<(), String> {
    let mut processes = sessions.processes.lock().await;
    if let Some(process) = processes.get_mut(&session_id) {
        process.stop()?;
    }
    processes.remove(&session_id);
    Ok(())
}

#[tauri::command]
pub async fn get_session_messages(
    session_id: String,
    limit: Option<i64>,
    offset: Option<i64>,
    db: State<'_, DbPool>,
) -> Result<Vec<MessageInfo>, String> {
    let limit = limit.unwrap_or(100);
    let offset = offset.unwrap_or(0);

    let rows = sqlx::query_as::<_, MessageRow>(
        "SELECT id, session_id, role, content, full_message, model, turn_id, sent_at, cancelled_at
         FROM session_messages WHERE session_id = ?
         ORDER BY sent_at ASC
         LIMIT ? OFFSET ?",
    )
    .bind(&session_id)
    .bind(limit)
    .bind(offset)
    .fetch_all(&db.0)
    .await
    .map_err(|e| e.to_string())?;

    Ok(rows.into_iter().map(MessageInfo::from).collect())
}

#[tauri::command]
pub async fn get_session(
    session_id: String,
    db: State<'_, DbPool>,
) -> Result<SessionInfo, String> {
    let row = sqlx::query_as::<_, SessionRow>(
        "SELECT id, workspace_id, title, agent_type, model, permission_mode,
         thinking_enabled, context_used_percent, unread_count, is_compacting, created_at
         FROM sessions WHERE id = ?",
    )
    .bind(&session_id)
    .fetch_optional(&db.0)
    .await
    .map_err(|e| e.to_string())?
    .ok_or("Session not found")?;

    Ok(SessionInfo::from(row))
}

async fn stream_agent_output(
    session_id: String,
    stdout: std::process::ChildStdout,
    pool: &sqlx::SqlitePool,
    app_handle: &AppHandle,
    adapter: Arc<dyn AgentAdapter>,
) {
    use std::io::BufRead;

    // Move blocking IO to a dedicated thread
    let (tx, mut rx) = tokio::sync::mpsc::channel::<String>(256);

    std::thread::spawn(move || {
        let reader = std::io::BufReader::new(stdout);
        for line in reader.lines() {
            match line {
                Ok(line) if !line.is_empty() => {
                    if tx.blocking_send(line).is_err() {
                        break;
                    }
                }
                Err(_) => break,
                _ => {}
            }
        }
    });

    let turn_id = uuid::Uuid::new_v4().to_string();

    while let Some(line) = rx.recv().await {
        let messages = adapter.parse_output(&line);

        for msg in messages {
            let msg_id = uuid::Uuid::new_v4().to_string();
            let role = match msg.message_type {
                crate::agents::AgentMessageType::Text
                | crate::agents::AgentMessageType::Thinking => "assistant",
                crate::agents::AgentMessageType::ToolUse => "tool_use",
                crate::agents::AgentMessageType::ToolResult => "tool_result",
                crate::agents::AgentMessageType::Error => "error",
                crate::agents::AgentMessageType::Result => "result",
                crate::agents::AgentMessageType::System => "system",
            };

            // Persist to DB
            let _ = sqlx::query(
                "INSERT INTO session_messages (id, session_id, role, content, full_message, model, turn_id)
                 VALUES (?, ?, ?, ?, ?, ?, ?)",
            )
            .bind(&msg_id)
            .bind(&session_id)
            .bind(role)
            .bind(&msg.content)
            .bind(&msg.raw_json)
            .bind(&msg.model)
            .bind(&turn_id)
            .execute(pool)
            .await;

            // Emit to frontend
            let _ = app_handle.emit(
                "agent:message",
                serde_json::json!({
                    "session_id": session_id,
                    "id": msg_id,
                    "role": role,
                    "content": msg.content,
                    "tool_name": msg.tool_name,
                    "tool_args": msg.tool_args,
                    "model": msg.model,
                    "turn_id": turn_id,
                }),
            );
        }
    }

    // Stream ended — process has exited
    let _ = app_handle.emit(
        "agent:status",
        serde_json::json!({
            "session_id": session_id,
            "status": "completed",
        }),
    );

    let _ = sqlx::query(
        "UPDATE workspaces SET state = 'completed'
         WHERE id = (SELECT workspace_id FROM sessions WHERE id = ?)",
    )
    .bind(&session_id)
    .execute(pool)
    .await;
}

#[derive(sqlx::FromRow)]
struct SessionRow {
    id: String,
    workspace_id: String,
    title: Option<String>,
    agent_type: String,
    model: Option<String>,
    permission_mode: String,
    thinking_enabled: i32,
    context_used_percent: f64,
    unread_count: i32,
    is_compacting: i32,
    created_at: String,
}

impl From<SessionRow> for SessionInfo {
    fn from(r: SessionRow) -> Self {
        Self {
            id: r.id,
            workspace_id: r.workspace_id,
            title: r.title,
            agent_type: r.agent_type,
            model: r.model,
            permission_mode: r.permission_mode,
            thinking_enabled: r.thinking_enabled != 0,
            context_used_percent: r.context_used_percent,
            unread_count: r.unread_count,
            is_compacting: r.is_compacting != 0,
            created_at: r.created_at,
        }
    }
}

#[derive(sqlx::FromRow)]
struct MessageRow {
    id: String,
    session_id: String,
    role: String,
    content: String,
    full_message: Option<String>,
    model: Option<String>,
    turn_id: Option<String>,
    sent_at: String,
    cancelled_at: Option<String>,
}

impl From<MessageRow> for MessageInfo {
    fn from(r: MessageRow) -> Self {
        Self {
            id: r.id,
            session_id: r.session_id,
            role: r.role,
            content: r.content,
            full_message: r.full_message,
            model: r.model,
            turn_id: r.turn_id,
            sent_at: r.sent_at,
            cancelled_at: r.cancelled_at,
        }
    }
}
