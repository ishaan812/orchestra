use crate::db::DbPool;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tauri::{AppHandle, Emitter, State};
use tokio::sync::Mutex;

const RING_BUFFER_SIZE: usize = 10_000;

/// Ring buffer for terminal output lines.
struct RingBuffer {
    lines: Vec<String>,
    head: usize,
    count: usize,
}

impl RingBuffer {
    fn new() -> Self {
        Self {
            lines: vec![String::new(); RING_BUFFER_SIZE],
            head: 0,
            count: 0,
        }
    }

    fn push(&mut self, line: String) {
        self.lines[self.head] = line;
        self.head = (self.head + 1) % RING_BUFFER_SIZE;
        if self.count < RING_BUFFER_SIZE {
            self.count += 1;
        }
    }

    fn last_n(&self, n: usize) -> Vec<String> {
        let n = n.min(self.count);
        let mut result = Vec::with_capacity(n);
        let start = if self.count < RING_BUFFER_SIZE {
            self.count.saturating_sub(n)
        } else {
            (self.head + RING_BUFFER_SIZE - n) % RING_BUFFER_SIZE
        };
        for i in 0..n {
            let idx = (start + i) % RING_BUFFER_SIZE;
            result.push(self.lines[idx].clone());
        }
        result
    }
}

struct TerminalInstance {
    _pty_id: u32,
    buffer: RingBuffer,
}

/// Manages terminal instances per workspace.
#[derive(Default)]
pub struct TerminalManager {
    terminals: Mutex<HashMap<String, TerminalInstance>>,
    next_pty_id: Mutex<u32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TerminalInfo {
    pub workspace_id: String,
    pub pty_id: u32,
    pub shell: String,
    pub cwd: String,
}

#[tauri::command]
pub async fn spawn_terminal(
    workspace_id: String,
    db: State<'_, DbPool>,
    terminals: State<'_, TerminalManager>,
    app: AppHandle,
) -> Result<TerminalInfo, String> {
    // Get workspace worktree path
    let worktree_path: String =
        sqlx::query_scalar("SELECT worktree_path FROM workspaces WHERE id = ?")
            .bind(&workspace_id)
            .fetch_one(&db.0)
            .await
            .map_err(|e| e.to_string())?;

    let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".to_string());

    let mut next_id = terminals.next_pty_id.lock().await;
    let pty_id = *next_id;
    *next_id += 1;

    // Spawn shell process via tauri-plugin-shell
    // The actual PTY management happens on the frontend with xterm.js
    // Backend provides: shell path, working directory, and output buffer
    let instance = TerminalInstance {
        _pty_id: pty_id,
        buffer: RingBuffer::new(),
    };

    terminals
        .terminals
        .lock()
        .await
        .insert(workspace_id.clone(), instance);

    // Notify frontend
    let _ = app.emit(
        "terminal:spawned",
        serde_json::json!({
            "workspace_id": workspace_id,
            "pty_id": pty_id,
            "shell": shell,
            "cwd": worktree_path,
        }),
    );

    Ok(TerminalInfo {
        workspace_id,
        pty_id,
        shell,
        cwd: worktree_path,
    })
}

#[tauri::command]
pub async fn get_terminal_output(
    workspace_id: String,
    lines: Option<usize>,
    terminals: State<'_, TerminalManager>,
) -> Result<Vec<String>, String> {
    let n = lines.unwrap_or(100);
    let map = terminals.terminals.lock().await;
    if let Some(instance) = map.get(&workspace_id) {
        Ok(instance.buffer.last_n(n))
    } else {
        Ok(vec![])
    }
}

#[tauri::command]
pub async fn push_terminal_output(
    workspace_id: String,
    data: String,
    terminals: State<'_, TerminalManager>,
) -> Result<(), String> {
    let mut map = terminals.terminals.lock().await;
    if let Some(instance) = map.get_mut(&workspace_id) {
        for line in data.lines() {
            instance.buffer.push(line.to_string());
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn detect_localhost_urls(
    workspace_id: String,
    terminals: State<'_, TerminalManager>,
) -> Result<Vec<String>, String> {
    let map = terminals.terminals.lock().await;
    let mut urls = Vec::new();

    if let Some(instance) = map.get(&workspace_id) {
        let recent = instance.buffer.last_n(200);
        let re_patterns = [
            "http://localhost:",
            "http://127.0.0.1:",
            "http://0.0.0.0:",
            "https://localhost:",
        ];

        for line in &recent {
            for pattern in &re_patterns {
                if let Some(start) = line.find(pattern) {
                    let url_part = &line[start..];
                    let end = url_part
                        .find(|c: char| c.is_whitespace() || c == '\'' || c == '"' || c == ')')
                        .unwrap_or(url_part.len());
                    let url = &url_part[..end];
                    if !urls.contains(&url.to_string()) {
                        urls.push(url.to_string());
                    }
                }
            }
        }
    }

    Ok(urls)
}

/// Get workspace worktree path and shell for terminal spawning.
#[tauri::command]
pub async fn get_terminal_info(
    workspace_id: String,
    db: State<'_, DbPool>,
) -> Result<TerminalInfo, String> {
    let worktree_path: String =
        sqlx::query_scalar("SELECT worktree_path FROM workspaces WHERE id = ?")
            .bind(&workspace_id)
            .fetch_one(&db.0)
            .await
            .map_err(|e| e.to_string())?;

    let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".to_string());

    Ok(TerminalInfo {
        workspace_id,
        pty_id: 0,
        shell,
        cwd: worktree_path,
    })
}
