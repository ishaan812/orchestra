use crate::db::DbPool;
use serde::{Deserialize, Serialize};
use std::path::Path;
use tauri::{AppHandle, Emitter, State};

#[derive(Debug, Serialize, Deserialize, Default, Clone)]
pub struct ConductorConfig {
    #[serde(default)]
    pub setup: Vec<String>,
    #[serde(default)]
    pub run: Option<String>,
    #[serde(default)]
    pub scripts: std::collections::HashMap<String, String>,
    #[serde(default)]
    pub run_script_mode: Option<String>, // "concurrent" or "sequential"
}

/// Parse conductor.json from repo root. Returns empty config if missing.
pub fn parse_conductor_config(repo_path: &str) -> ConductorConfig {
    let config_path = Path::new(repo_path).join("conductor.json");
    match std::fs::read_to_string(config_path) {
        Ok(content) => serde_json::from_str(&content).unwrap_or_default(),
        Err(_) => ConductorConfig::default(),
    }
}

#[tauri::command]
pub async fn get_conductor_config(
    repo_id: String,
    db: State<'_, DbPool>,
) -> Result<ConductorConfig, String> {
    let repo_path: String = sqlx::query_scalar("SELECT path FROM repos WHERE id = ?")
        .bind(&repo_id)
        .fetch_one(&db.0)
        .await
        .map_err(|e| e.to_string())?;

    Ok(parse_conductor_config(&repo_path))
}

#[tauri::command]
pub async fn run_setup_scripts(
    workspace_id: String,
    db: State<'_, DbPool>,
    app: AppHandle,
) -> Result<String, String> {
    let (worktree_path, repo_path): (String, String) = sqlx::query_as(
        "SELECT w.worktree_path, r.path FROM workspaces w
         JOIN repos r ON w.repo_id = r.id
         WHERE w.id = ?",
    )
    .bind(&workspace_id)
    .fetch_one(&db.0)
    .await
    .map_err(|e| e.to_string())?;

    let config = parse_conductor_config(&repo_path);
    if config.setup.is_empty() {
        return Ok("No setup scripts configured".to_string());
    }

    let log_path = format!("{}/setup.log", worktree_path);
    let mut log = String::new();

    for script in &config.setup {
        let _ = app.emit(
            "script:status",
            serde_json::json!({
                "workspace_id": workspace_id,
                "script": script,
                "status": "running",
            }),
        );

        let output = tokio::process::Command::new("sh")
            .arg("-c")
            .arg(script)
            .current_dir(&worktree_path)
            .output()
            .await
            .map_err(|e| e.to_string())?;

        let stdout = String::from_utf8_lossy(&output.stdout);
        let stderr = String::from_utf8_lossy(&output.stderr);

        log.push_str("=== ");
        log.push_str(script);
        log.push_str(" ===\n");
        if !stdout.is_empty() {
            log.push_str(&stdout);
        }
        if !stderr.is_empty() {
            log.push_str("STDERR:\n");
            log.push_str(&stderr);
        }
        log.push('\n');

        let status = if output.status.success() {
            "completed"
        } else {
            "failed"
        };

        let _ = app.emit(
            "script:status",
            serde_json::json!({
                "workspace_id": workspace_id,
                "script": script,
                "status": status,
                "exit_code": output.status.code(),
            }),
        );
    }

    // Write log to file
    std::fs::write(&log_path, &log).map_err(|e| e.to_string())?;

    // Update workspace with setup log path
    let _ = sqlx::query("UPDATE workspaces SET setup_log_path = ? WHERE id = ?")
        .bind(&log_path)
        .bind(&workspace_id)
        .execute(&db.0)
        .await;

    Ok(log)
}

#[tauri::command]
pub async fn run_workspace_script(
    workspace_id: String,
    script_name: Option<String>,
    db: State<'_, DbPool>,
    app: AppHandle,
) -> Result<String, String> {
    let (worktree_path, repo_path): (String, String) = sqlx::query_as(
        "SELECT w.worktree_path, r.path FROM workspaces w
         JOIN repos r ON w.repo_id = r.id
         WHERE w.id = ?",
    )
    .bind(&workspace_id)
    .fetch_one(&db.0)
    .await
    .map_err(|e| e.to_string())?;

    let config = parse_conductor_config(&repo_path);

    let script = if let Some(name) = &script_name {
        config
            .scripts
            .get(name)
            .cloned()
            .ok_or_else(|| format!("Script '{}' not found in conductor.json", name))?
    } else {
        config
            .run
            .ok_or("No run script configured in conductor.json")?
    };

    let _ = app.emit(
        "script:status",
        serde_json::json!({
            "workspace_id": workspace_id,
            "script": script,
            "status": "running",
        }),
    );

    let output = tokio::process::Command::new("sh")
        .arg("-c")
        .arg(&script)
        .current_dir(&worktree_path)
        .output()
        .await
        .map_err(|e| e.to_string())?;

    let stdout = String::from_utf8_lossy(&output.stdout).into_owned();
    let stderr = String::from_utf8_lossy(&output.stderr).into_owned();

    let status = if output.status.success() {
        "completed"
    } else {
        "failed"
    };

    let _ = app.emit(
        "script:status",
        serde_json::json!({
            "workspace_id": workspace_id,
            "script": script,
            "status": status,
        }),
    );

    if output.status.success() {
        Ok(stdout)
    } else {
        Err(format!("Script failed:\n{}\n{}", stdout, stderr))
    }
}

#[tauri::command]
pub async fn get_setup_log(
    workspace_id: String,
    db: State<'_, DbPool>,
) -> Result<String, String> {
    let log_path: Option<String> =
        sqlx::query_scalar("SELECT setup_log_path FROM workspaces WHERE id = ?")
            .bind(&workspace_id)
            .fetch_one(&db.0)
            .await
            .map_err(|e| e.to_string())?;

    match log_path {
        Some(path) => std::fs::read_to_string(&path).map_err(|e| e.to_string()),
        None => Ok("No setup log available".to_string()),
    }
}
