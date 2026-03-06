use crate::db::DbPool;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tauri::{AppHandle, Emitter, State};
use tokio::sync::Mutex;
use tracing::{info, warn};

/// Maximum number of log lines to keep per phase.
const MAX_LOG_LINES: usize = 1000;

/// Timeout in seconds for waiting for the run process to exit during teardown.
const TEARDOWN_WAIT_TIMEOUT_SECS: u64 = 10;

/// Grace period in seconds before SIGKILL after SIGTERM.
const KILL_GRACE_SECS: u64 = 8;

// ── Data structures ──

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskLifecycleState {
    pub task_id: String,
    pub setup: PhaseState,
    pub run: RunPhaseState,
    pub teardown: PhaseState,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct PhaseState {
    pub status: PhaseStatus,
    pub error: Option<String>,
    pub exit_code: Option<i32>,
    pub started_at: Option<String>,
    pub finished_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct RunPhaseState {
    #[serde(flatten)]
    pub phase: PhaseState,
    pub pid: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum PhaseStatus {
    #[default]
    Idle,
    Running,
    Succeeded,
    Failed,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LifecycleEvent {
    pub task_id: String,
    pub phase: String,
    pub status: String,
    pub timestamp: String,
    pub line: Option<String>,
    pub error: Option<String>,
    pub exit_code: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct LifecycleLogs {
    pub setup: Vec<String>,
    pub run: Vec<String>,
    pub teardown: Vec<String>,
}

// ── Internal state ──

struct TaskState {
    lifecycle: TaskLifecycleState,
    logs: LifecycleLogs,
    run_pid: Option<u32>,
}

impl TaskState {
    fn new(task_id: &str) -> Self {
        Self {
            lifecycle: TaskLifecycleState {
                task_id: task_id.to_string(),
                setup: PhaseState::default(),
                run: RunPhaseState::default(),
                teardown: PhaseState::default(),
            },
            logs: LifecycleLogs::default(),
            run_pid: None,
        }
    }
}

/// Manages lifecycle states for all tasks.
#[derive(Default)]
pub struct LifecycleManager {
    states: Mutex<HashMap<String, TaskState>>,
}

fn now_iso() -> String {
    chrono::Utc::now().to_rfc3339()
}

fn emit_event(app: &AppHandle, event: &LifecycleEvent) {
    let _ = app.emit("lifecycle:event", event);
}

fn push_log(logs: &mut Vec<String>, line: &str) {
    if logs.len() >= MAX_LOG_LINES {
        logs.remove(0);
    }
    logs.push(line.to_string());
}

// ── Tauri commands ──

#[tauri::command]
pub async fn run_lifecycle_setup(
    workspace_id: String,
    app: AppHandle,
    db: State<'_, DbPool>,
    manager: State<'_, LifecycleManager>,
) -> Result<(), String> {
    let (worktree_path, repo_path) = get_workspace_paths(&workspace_id, &db).await?;
    let config = crate::project_config::OrchestraConfig::load(&repo_path);

    let script = config.setup.or_else(|| {
        // Fall back to conductor.json setup scripts
        let conductor = crate::scripts::parse_conductor_config(&repo_path);
        if conductor.setup.is_empty() {
            None
        } else {
            Some(conductor.setup.join(" && "))
        }
    });

    let script = match script {
        Some(s) => s,
        None => return Ok(()), // No setup script configured
    };

    // Initialize state
    {
        let mut states = manager.states.lock().await;
        let state = states
            .entry(workspace_id.clone())
            .or_insert_with(|| TaskState::new(&workspace_id));

        if state.lifecycle.setup.status == PhaseStatus::Running {
            return Ok(()); // Already running, deduplicate
        }

        state.lifecycle.setup = PhaseState {
            status: PhaseStatus::Running,
            error: None,
            exit_code: None,
            started_at: Some(now_iso()),
            finished_at: None,
        };
    }

    emit_event(
        &app,
        &LifecycleEvent {
            task_id: workspace_id.clone(),
            phase: "setup".to_string(),
            status: "starting".to_string(),
            timestamp: now_iso(),
            line: None,
            error: None,
            exit_code: None,
        },
    );

    // Run the script
    let result = run_script_with_logging(
        &script,
        &worktree_path,
        &workspace_id,
        "setup",
        &app,
        &manager,
    )
    .await;

    // Update state
    {
        let mut states = manager.states.lock().await;
        if let Some(state) = states.get_mut(&workspace_id) {
            match &result {
                Ok(code) => {
                    state.lifecycle.setup.status = if *code == 0 {
                        PhaseStatus::Succeeded
                    } else {
                        PhaseStatus::Failed
                    };
                    state.lifecycle.setup.exit_code = Some(*code);
                }
                Err(e) => {
                    state.lifecycle.setup.status = PhaseStatus::Failed;
                    state.lifecycle.setup.error = Some(e.clone());
                }
            }
            state.lifecycle.setup.finished_at = Some(now_iso());
        }
    }

    let exit_code = result.as_ref().ok().copied();
    let error = result.as_ref().err().cloned();
    emit_event(
        &app,
        &LifecycleEvent {
            task_id: workspace_id,
            phase: "setup".to_string(),
            status: if exit_code == Some(0) {
                "done"
            } else {
                "error"
            }
            .to_string(),
            timestamp: now_iso(),
            line: None,
            error,
            exit_code,
        },
    );

    result.map(|_| ())
}

#[tauri::command]
pub async fn start_lifecycle_run(
    workspace_id: String,
    app: AppHandle,
    db: State<'_, DbPool>,
    manager: State<'_, LifecycleManager>,
) -> Result<(), String> {
    // Validate setup succeeded
    {
        let states = manager.states.lock().await;
        if let Some(state) = states.get(&workspace_id) {
            if state.lifecycle.setup.status == PhaseStatus::Running {
                return Err("Setup is still running".to_string());
            }
        }
    }

    let (worktree_path, repo_path) = get_workspace_paths(&workspace_id, &db).await?;
    let config = crate::project_config::OrchestraConfig::load(&repo_path);

    let script = config.run.or_else(|| {
        let conductor = crate::scripts::parse_conductor_config(&repo_path);
        conductor.run
    });

    let script = match script {
        Some(s) => s,
        None => return Ok(()),
    };

    // Check if already running
    {
        let states = manager.states.lock().await;
        if let Some(state) = states.get(&workspace_id) {
            if state.lifecycle.run.phase.status == PhaseStatus::Running {
                return Ok(()); // Already running
            }
        }
    }

    // Spawn detached process
    let child = tokio::process::Command::new("sh")
        .arg("-c")
        .arg(&script)
        .current_dir(&worktree_path)
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| e.to_string())?;

    let pid = child.id().unwrap_or(0);

    // Update state
    {
        let mut states = manager.states.lock().await;
        let state = states
            .entry(workspace_id.clone())
            .or_insert_with(|| TaskState::new(&workspace_id));
        state.lifecycle.run = RunPhaseState {
            phase: PhaseState {
                status: PhaseStatus::Running,
                error: None,
                exit_code: None,
                started_at: Some(now_iso()),
                finished_at: None,
            },
            pid: Some(pid),
        };
        state.run_pid = Some(pid);
    }

    emit_event(
        &app,
        &LifecycleEvent {
            task_id: workspace_id.clone(),
            phase: "run".to_string(),
            status: "starting".to_string(),
            timestamp: now_iso(),
            line: None,
            error: None,
            exit_code: None,
        },
    );

    // Spawn background task to stream output and wait for exit
    let manager_arc = Arc::new(Mutex::new(()));
    let ws_id = workspace_id.clone();
    let app_clone = app.clone();
    tokio::spawn(async move {
        let output = child.wait_with_output().await;
        match output {
            Ok(out) => {
                let exit_code = out.status.code().unwrap_or(-1);
                let _ = app_clone.emit(
                    "lifecycle:event",
                    LifecycleEvent {
                        task_id: ws_id.clone(),
                        phase: "run".to_string(),
                        status: "exit".to_string(),
                        timestamp: now_iso(),
                        line: None,
                        error: None,
                        exit_code: Some(exit_code),
                    },
                );
            }
            Err(e) => {
                warn!("Run process error for {}: {}", ws_id, e);
            }
        }
        drop(manager_arc);
    });

    Ok(())
}

#[tauri::command]
pub async fn stop_lifecycle_run(
    workspace_id: String,
    manager: State<'_, LifecycleManager>,
) -> Result<(), String> {
    let pid = {
        let states = manager.states.lock().await;
        states
            .get(&workspace_id)
            .and_then(|s| s.run_pid)
    };

    if let Some(pid) = pid {
        // Send SIGTERM
        unsafe {
            libc::kill(pid as libc::pid_t, libc::SIGTERM);
        }

        // Wait grace period, then SIGKILL
        let pid_copy = pid;
        tokio::spawn(async move {
            tokio::time::sleep(std::time::Duration::from_secs(KILL_GRACE_SECS)).await;
            unsafe {
                libc::kill(pid_copy as libc::pid_t, libc::SIGKILL);
            }
        });

        // Update state
        let mut states = manager.states.lock().await;
        if let Some(state) = states.get_mut(&workspace_id) {
            state.lifecycle.run.phase.status = PhaseStatus::Succeeded;
            state.lifecycle.run.phase.finished_at = Some(now_iso());
            state.run_pid = None;
        }
    }

    Ok(())
}

#[tauri::command]
pub async fn run_lifecycle_teardown(
    workspace_id: String,
    app: AppHandle,
    db: State<'_, DbPool>,
    manager: State<'_, LifecycleManager>,
) -> Result<(), String> {
    // Ensure run process is stopped first
    let run_pid = {
        let states = manager.states.lock().await;
        states.get(&workspace_id).and_then(|s| s.run_pid)
    };

    if let Some(pid) = run_pid {
        // Stop the run process
        unsafe {
            libc::kill(pid as libc::pid_t, libc::SIGTERM);
        }
        // Wait for it to exit
        tokio::time::sleep(std::time::Duration::from_secs(TEARDOWN_WAIT_TIMEOUT_SECS)).await;
    }

    let (worktree_path, repo_path) = get_workspace_paths(&workspace_id, &db).await?;
    let config = crate::project_config::OrchestraConfig::load(&repo_path);

    let script = match config.teardown {
        Some(s) => s,
        None => return Ok(()),
    };

    // Update state
    {
        let mut states = manager.states.lock().await;
        let state = states
            .entry(workspace_id.clone())
            .or_insert_with(|| TaskState::new(&workspace_id));

        if state.lifecycle.teardown.status == PhaseStatus::Running {
            return Ok(()); // Already running
        }

        state.lifecycle.teardown = PhaseState {
            status: PhaseStatus::Running,
            error: None,
            exit_code: None,
            started_at: Some(now_iso()),
            finished_at: None,
        };
    }

    emit_event(
        &app,
        &LifecycleEvent {
            task_id: workspace_id.clone(),
            phase: "teardown".to_string(),
            status: "starting".to_string(),
            timestamp: now_iso(),
            line: None,
            error: None,
            exit_code: None,
        },
    );

    let result = run_script_with_logging(
        &script,
        &worktree_path,
        &workspace_id,
        "teardown",
        &app,
        &manager,
    )
    .await;

    // Update state
    {
        let mut states = manager.states.lock().await;
        if let Some(state) = states.get_mut(&workspace_id) {
            match &result {
                Ok(code) => {
                    state.lifecycle.teardown.status = if *code == 0 {
                        PhaseStatus::Succeeded
                    } else {
                        PhaseStatus::Failed
                    };
                    state.lifecycle.teardown.exit_code = Some(*code);
                }
                Err(e) => {
                    state.lifecycle.teardown.status = PhaseStatus::Failed;
                    state.lifecycle.teardown.error = Some(e.clone());
                }
            }
            state.lifecycle.teardown.finished_at = Some(now_iso());
        }
    }

    result.map(|_| ())
}

#[tauri::command]
pub async fn get_lifecycle_state(
    workspace_id: String,
    manager: State<'_, LifecycleManager>,
) -> Result<TaskLifecycleState, String> {
    let states = manager.states.lock().await;
    states
        .get(&workspace_id)
        .map(|s| s.lifecycle.clone())
        .ok_or_else(|| {
            // Return default state if not tracked
            serde_json::to_string(&TaskLifecycleState {
                task_id: workspace_id.clone(),
                setup: PhaseState::default(),
                run: RunPhaseState::default(),
                teardown: PhaseState::default(),
            })
            .unwrap_or_default()
        })
}

#[tauri::command]
pub async fn get_lifecycle_logs(
    workspace_id: String,
    manager: State<'_, LifecycleManager>,
) -> Result<LifecycleLogs, String> {
    let states = manager.states.lock().await;
    Ok(states
        .get(&workspace_id)
        .map(|s| s.logs.clone())
        .unwrap_or_default())
}

// ── Helpers ──

async fn get_workspace_paths(
    workspace_id: &str,
    db: &DbPool,
) -> Result<(String, String), String> {
    let row: (String, String) = sqlx::query_as(
        "SELECT w.worktree_path, r.path FROM workspaces w
         JOIN repos r ON w.repo_id = r.id
         WHERE w.id = ?",
    )
    .bind(workspace_id)
    .fetch_one(&db.0)
    .await
    .map_err(|e| e.to_string())?;
    Ok(row)
}

async fn run_script_with_logging(
    script: &str,
    workdir: &str,
    workspace_id: &str,
    phase: &str,
    app: &AppHandle,
    manager: &LifecycleManager,
) -> Result<i32, String> {
    let output = tokio::process::Command::new("sh")
        .arg("-c")
        .arg(script)
        .current_dir(workdir)
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .output()
        .await
        .map_err(|e| e.to_string())?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);

    // Store logs
    {
        let mut states = manager.states.lock().await;
        if let Some(state) = states.get_mut(workspace_id) {
            let logs = match phase {
                "setup" => &mut state.logs.setup,
                "run" => &mut state.logs.run,
                "teardown" => &mut state.logs.teardown,
                _ => return Err(format!("Unknown phase: {}", phase)),
            };
            for line in stdout.lines() {
                push_log(logs, line);
                emit_event(
                    app,
                    &LifecycleEvent {
                        task_id: workspace_id.to_string(),
                        phase: phase.to_string(),
                        status: "line".to_string(),
                        timestamp: now_iso(),
                        line: Some(line.to_string()),
                        error: None,
                        exit_code: None,
                    },
                );
            }
            for line in stderr.lines() {
                push_log(logs, &format!("[stderr] {}", line));
            }
        }
    }

    let exit_code = output.status.code().unwrap_or(-1);
    if exit_code != 0 && !stderr.is_empty() {
        info!(
            "Lifecycle {} for {} exited with code {}: {}",
            phase,
            workspace_id,
            exit_code,
            stderr.trim()
        );
    }

    Ok(exit_code)
}
