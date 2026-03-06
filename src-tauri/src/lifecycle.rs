use crate::db::DbPool;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, VecDeque};
use std::sync::Arc;
use tauri::{AppHandle, Emitter, State};
use tokio::sync::Mutex;
use tracing::{info, warn};

/// Maximum number of log lines to keep per phase.
const MAX_LOG_LINES: usize = 1000;

/// Grace period in seconds before SIGKILL after SIGTERM.
const KILL_GRACE_SECS: u64 = 8;

/// Poll interval when waiting for a process to exit after SIGTERM during teardown.
const TEARDOWN_POLL_INTERVAL_MS: u64 = 200;

/// Maximum time to wait for a process to exit during teardown.
const TEARDOWN_WAIT_TIMEOUT_SECS: u64 = 10;

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
    pub setup: VecDeque<String>,
    pub run: VecDeque<String>,
    pub teardown: VecDeque<String>,
}

// ── Internal state ──

struct TaskState {
    lifecycle: TaskLifecycleState,
    logs: LifecycleLogs,
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
        }
    }

    /// Get the run PID from the canonical location (RunPhaseState.pid).
    fn run_pid(&self) -> Option<u32> {
        self.lifecycle.run.pid
    }
}

/// Manages lifecycle states for all tasks.
/// Uses Arc<Mutex<>> so state can be shared with background tasks.
#[derive(Default, Clone)]
pub struct LifecycleManager {
    states: Arc<Mutex<HashMap<String, TaskState>>>,
}

fn now_iso() -> String {
    chrono::Utc::now().to_rfc3339()
}

fn emit_event(app: &AppHandle, event: &LifecycleEvent) {
    let _ = app.emit("lifecycle:event", event);
}

fn make_event(task_id: &str, phase: &str, status: &str) -> LifecycleEvent {
    LifecycleEvent {
        task_id: task_id.to_string(),
        phase: phase.to_string(),
        status: status.to_string(),
        timestamp: now_iso(),
        line: None,
        error: None,
        exit_code: None,
    }
}

fn push_log(logs: &mut VecDeque<String>, line: &str) {
    if logs.len() >= MAX_LOG_LINES {
        logs.pop_front();
    }
    logs.push_back(line.to_string());
}

/// Check if a PID is still alive (without waiting).
fn pid_alive(pid: u32) -> bool {
    unsafe { libc::kill(pid as libc::pid_t, 0) == 0 }
}

// ── Shared phase runner ──

/// Runs a lifecycle phase (setup or teardown) with common state management, event
/// emission, and logging. This eliminates duplication between the two phases.
async fn run_phase(
    workspace_id: &str,
    phase_name: &str,
    script: &str,
    worktree_path: &str,
    app: &AppHandle,
    manager: &LifecycleManager,
) -> Result<(), String> {
    // Guard against re-entry and set Running
    {
        let mut states = manager.states.lock().await;
        let state = states
            .entry(workspace_id.to_string())
            .or_insert_with(|| TaskState::new(workspace_id));

        let phase = match phase_name {
            "setup" => &mut state.lifecycle.setup,
            "teardown" => &mut state.lifecycle.teardown,
            _ => return Err(format!("Unknown phase: {}", phase_name)),
        };

        if phase.status == PhaseStatus::Running {
            return Ok(()); // Already running, deduplicate
        }

        *phase = PhaseState {
            status: PhaseStatus::Running,
            error: None,
            exit_code: None,
            started_at: Some(now_iso()),
            finished_at: None,
        };
    }

    emit_event(app, &make_event(workspace_id, phase_name, "starting"));

    // Run the script
    let result = run_script_with_logging(
        script,
        worktree_path,
        workspace_id,
        phase_name,
        app,
        manager,
    )
    .await;

    // Update state with result
    {
        let mut states = manager.states.lock().await;
        if let Some(state) = states.get_mut(workspace_id) {
            let phase = match phase_name {
                "setup" => &mut state.lifecycle.setup,
                "teardown" => &mut state.lifecycle.teardown,
                _ => return Err(format!("Unknown phase: {}", phase_name)),
            };

            match &result {
                Ok(code) => {
                    phase.status = if *code == 0 {
                        PhaseStatus::Succeeded
                    } else {
                        PhaseStatus::Failed
                    };
                    phase.exit_code = Some(*code);
                }
                Err(e) => {
                    phase.status = PhaseStatus::Failed;
                    phase.error = Some(e.clone());
                }
            }
            phase.finished_at = Some(now_iso());
        }
    }

    let exit_code = result.as_ref().ok().copied();
    let error = result.as_ref().err().cloned();
    emit_event(
        app,
        &LifecycleEvent {
            task_id: workspace_id.to_string(),
            phase: phase_name.to_string(),
            status: if exit_code == Some(0) { "done" } else { "error" }.to_string(),
            timestamp: now_iso(),
            line: None,
            error,
            exit_code,
        },
    );

    result.map(|_| ())
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
        let conductor = crate::scripts::parse_conductor_config(&repo_path);
        if conductor.setup.is_empty() {
            None
        } else {
            Some(conductor.setup.join(" && "))
        }
    });

    let script = match script {
        Some(s) => s,
        None => return Ok(()),
    };

    run_phase(&workspace_id, "setup", &script, &worktree_path, &app, &manager).await
}

#[tauri::command]
pub async fn start_lifecycle_run(
    workspace_id: String,
    app: AppHandle,
    db: State<'_, DbPool>,
    manager: State<'_, LifecycleManager>,
) -> Result<(), String> {
    // Validate setup is not still running
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
                return Ok(());
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

    // Update state — single source of truth for PID in RunPhaseState.pid
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
    }

    emit_event(&app, &make_event(&workspace_id, "run", "starting"));

    // Spawn background task to wait for exit and update state
    let manager_ref = (*manager).clone();
    let ws_id = workspace_id.clone();
    let app_clone = app.clone();
    tokio::spawn(async move {
        let output = child.wait_with_output().await;
        let (exit_code, error_msg) = match output {
            Ok(out) => (out.status.code().unwrap_or(-1), None),
            Err(e) => {
                warn!("Run process error for {}: {}", ws_id, e);
                (-1, Some(e.to_string()))
            }
        };

        // Update lifecycle state on exit
        {
            let mut states = manager_ref.states.lock().await;
            if let Some(state) = states.get_mut(&ws_id) {
                state.lifecycle.run.phase.status = if exit_code == 0 {
                    PhaseStatus::Succeeded
                } else {
                    PhaseStatus::Failed
                };
                state.lifecycle.run.phase.exit_code = Some(exit_code);
                state.lifecycle.run.phase.error = error_msg.clone();
                state.lifecycle.run.phase.finished_at = Some(now_iso());
                state.lifecycle.run.pid = None;
            }
        }

        let _ = app_clone.emit(
            "lifecycle:event",
            LifecycleEvent {
                task_id: ws_id,
                phase: "run".to_string(),
                status: "exit".to_string(),
                timestamp: now_iso(),
                line: None,
                error: error_msg,
                exit_code: Some(exit_code),
            },
        );
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
        states.get(&workspace_id).and_then(|s| s.run_pid())
    };

    if let Some(pid) = pid {
        // Send SIGTERM
        unsafe {
            libc::kill(pid as libc::pid_t, libc::SIGTERM);
        }

        // Wait grace period, then SIGKILL only if still alive
        tokio::spawn(async move {
            tokio::time::sleep(std::time::Duration::from_secs(KILL_GRACE_SECS)).await;
            if pid_alive(pid) {
                unsafe {
                    libc::kill(pid as libc::pid_t, libc::SIGKILL);
                }
            }
        });

        // Update state
        let mut states = manager.states.lock().await;
        if let Some(state) = states.get_mut(&workspace_id) {
            state.lifecycle.run.phase.status = PhaseStatus::Succeeded;
            state.lifecycle.run.phase.finished_at = Some(now_iso());
            state.lifecycle.run.pid = None;
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
        states.get(&workspace_id).and_then(|s| s.run_pid())
    };

    if let Some(pid) = run_pid {
        unsafe {
            libc::kill(pid as libc::pid_t, libc::SIGTERM);
        }
        // Poll for exit instead of unconditionally sleeping
        let deadline = std::time::Instant::now()
            + std::time::Duration::from_secs(TEARDOWN_WAIT_TIMEOUT_SECS);
        while std::time::Instant::now() < deadline && pid_alive(pid) {
            tokio::time::sleep(std::time::Duration::from_millis(TEARDOWN_POLL_INTERVAL_MS)).await;
        }
        // Force kill if still alive
        if pid_alive(pid) {
            unsafe {
                libc::kill(pid as libc::pid_t, libc::SIGKILL);
            }
        }
    }

    let (worktree_path, repo_path) = get_workspace_paths(&workspace_id, &db).await?;
    let config = crate::project_config::OrchestraConfig::load(&repo_path);

    let script = match config.teardown {
        Some(s) => s,
        None => return Ok(()),
    };

    run_phase(&workspace_id, "teardown", &script, &worktree_path, &app, &manager).await
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
