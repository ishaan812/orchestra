use crate::db::DbPool;
use crate::git;
use crate::names;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WorkspaceInfo {
    pub id: String,
    pub repo_id: String,
    pub name: String,
    pub branch_name: String,
    pub worktree_path: String,
    pub state: String,
    pub derived_status: String,
    pub task_prompt: Option<String>,
    pub agent_type: Option<String>,
    pub model: Option<String>,
    pub unread: bool,
    pub pinned_at: Option<String>,
    pub intended_target_branch: Option<String>,
    pub pr_title: Option<String>,
    pub pr_description: Option<String>,
    pub notes: Option<String>,
    pub insertions: u32,
    pub deletions: u32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WorkspaceGroup {
    pub backlog: Vec<WorkspaceInfo>,
    pub in_progress: Vec<WorkspaceInfo>,
    pub in_review: Vec<WorkspaceInfo>,
    pub done: Vec<WorkspaceInfo>,
}

#[tauri::command]
pub async fn create_workspace(
    repo_id: String,
    task_prompt: Option<String>,
    agent_type: Option<String>,
    model: Option<String>,
    target_branch: Option<String>,
    db: State<'_, DbPool>,
) -> Result<WorkspaceInfo, String> {
    // Get repo info
    let repo = sqlx::query_as::<_, RepoRow>(
        "SELECT id, name, path, default_branch FROM repos WHERE id = ?",
    )
    .bind(&repo_id)
    .fetch_optional(&db.0)
    .await
    .map_err(|e| e.to_string())?
    .ok_or("Repo not found")?;

    // Generate workspace name
    let ws_name = names::generate_workspace_name(&repo_id, &db.0).await?;

    // Get branch prefix from settings
    let branch_prefix: Option<String> =
        sqlx::query_scalar("SELECT value FROM settings WHERE key = 'branch_prefix_type'")
            .fetch_optional(&db.0)
            .await
            .map_err(|e| e.to_string())?;

    let prefix = match branch_prefix.as_deref() {
        Some("github_username") => {
            // Try to get GitHub username from gh CLI
            std::process::Command::new("gh")
                .args(["api", "user", "--jq", ".login"])
                .output()
                .ok()
                .and_then(|out| {
                    if out.status.success() {
                        String::from_utf8(out.stdout).ok().map(|s| s.trim().to_string())
                    } else {
                        None
                    }
                })
                .unwrap_or_else(|| "orchestra".to_string())
        }
        Some(custom) => custom.to_string(),
        None => "orchestra".to_string(),
    };

    let branch_name = format!("{}/{}", prefix, ws_name);
    let target = target_branch.unwrap_or(repo.default_branch.clone());

    // Build worktree path
    let home = dirs::home_dir().ok_or("Cannot find home directory")?;
    let worktree_path = home
        .join("open-conductor")
        .join("workspaces")
        .join(&repo.name)
        .join(&ws_name);
    let worktree_path_str = worktree_path.to_string_lossy().to_string();

    // Create git worktree
    git::create_worktree(&repo.path, &branch_name, &worktree_path_str)?;

    // Preserve project files (.env, etc.) from main repo to worktree
    let orch_config = crate::project_config::OrchestraConfig::load(&repo.path);
    let patterns = orch_config.effective_preserve_patterns();
    if let Err(e) = crate::project_config::preserve_files(&repo.path, &worktree_path_str, &patterns) {
        tracing::warn!("Failed to preserve files: {}", e);
    }

    // Create .context directory
    let context_dir = worktree_path.join(".context");
    std::fs::create_dir_all(context_dir.join("attachments")).map_err(|e| e.to_string())?;
    std::fs::create_dir_all(context_dir.join("plans")).map_err(|e| e.to_string())?;
    std::fs::write(context_dir.join("notes.md"), "").map_err(|e| e.to_string())?;
    std::fs::write(context_dir.join("todos.md"), "").map_err(|e| e.to_string())?;

    let id = uuid::Uuid::new_v4().to_string();

    sqlx::query(
        "INSERT INTO workspaces (id, repo_id, name, branch_name, worktree_path, state, derived_status,
         task_prompt, agent_type, model, initialization_parent_branch, intended_target_branch, placeholder_branch_name)
         VALUES (?, ?, ?, ?, ?, 'ready', 'in-progress', ?, ?, ?, ?, ?, ?)",
    )
    .bind(&id)
    .bind(&repo_id)
    .bind(&ws_name)
    .bind(&branch_name)
    .bind(&worktree_path_str)
    .bind(&task_prompt)
    .bind(&agent_type)
    .bind(&model)
    .bind(&repo.default_branch)
    .bind(&target)
    .bind(&branch_name)
    .execute(&db.0)
    .await
    .map_err(|e| e.to_string())?;

    Ok(WorkspaceInfo {
        id,
        repo_id,
        name: ws_name,
        branch_name,
        worktree_path: worktree_path_str,
        state: "ready".to_string(),
        derived_status: "in-progress".to_string(),
        task_prompt,
        agent_type,
        model,
        unread: false,
        pinned_at: None,
        intended_target_branch: Some(target),
        pr_title: None,
        pr_description: None,
        notes: None,
        insertions: 0,
        deletions: 0,
        created_at: chrono::Utc::now().to_rfc3339(),
        updated_at: chrono::Utc::now().to_rfc3339(),
    })
}

#[tauri::command]
pub async fn list_workspaces(
    repo_id: String,
    db: State<'_, DbPool>,
) -> Result<WorkspaceGroup, String> {
    let rows = sqlx::query_as::<_, WorkspaceRow>(
        "SELECT id, repo_id, name, branch_name, worktree_path, state, derived_status,
         task_prompt, agent_type, model, unread, pinned_at, intended_target_branch,
         pr_title, pr_description, notes, created_at, updated_at
         FROM workspaces WHERE repo_id = ? AND state != 'archived'
         ORDER BY pinned_at DESC NULLS LAST, created_at DESC",
    )
    .bind(&repo_id)
    .fetch_all(&db.0)
    .await
    .map_err(|e| e.to_string())?;

    let mut group = WorkspaceGroup {
        backlog: vec![],
        in_progress: vec![],
        in_review: vec![],
        done: vec![],
    };

    for row in rows {
        let info = WorkspaceInfo::from(row);
        match info.derived_status.as_str() {
            "backlog" => group.backlog.push(info),
            "in-progress" => group.in_progress.push(info),
            "in-review" => group.in_review.push(info),
            "done" => group.done.push(info),
            _ => group.in_progress.push(info),
        }
    }

    Ok(group)
}

#[tauri::command]
pub async fn get_workspace(id: String, db: State<'_, DbPool>) -> Result<WorkspaceInfo, String> {
    let row = sqlx::query_as::<_, WorkspaceRow>(
        "SELECT id, repo_id, name, branch_name, worktree_path, state, derived_status,
         task_prompt, agent_type, model, unread, pinned_at, intended_target_branch,
         pr_title, pr_description, notes, created_at, updated_at
         FROM workspaces WHERE id = ?",
    )
    .bind(&id)
    .fetch_optional(&db.0)
    .await
    .map_err(|e| e.to_string())?
    .ok_or("Workspace not found")?;

    Ok(WorkspaceInfo::from(row))
}

#[tauri::command]
pub async fn archive_workspace(id: String, db: State<'_, DbPool>) -> Result<(), String> {
    let ws = sqlx::query_as::<_, WorkspaceRow>(
        "SELECT id, repo_id, name, branch_name, worktree_path, state, derived_status,
         task_prompt, agent_type, model, unread, pinned_at, intended_target_branch,
         pr_title, pr_description, notes, created_at, updated_at
         FROM workspaces WHERE id = ?",
    )
    .bind(&id)
    .fetch_optional(&db.0)
    .await
    .map_err(|e| e.to_string())?
    .ok_or("Workspace not found")?;

    // Get repo name for archive path
    let repo_name: String =
        sqlx::query_scalar("SELECT name FROM repos WHERE id = ?")
            .bind(&ws.repo_id)
            .fetch_one(&db.0)
            .await
            .map_err(|e| e.to_string())?;

    // Move .context/ to archived-contexts
    let context_src = std::path::Path::new(&ws.worktree_path).join(".context");
    if context_src.exists() {
        let home = dirs::home_dir().ok_or("Cannot find home directory")?;
        let context_dst = home
            .join("open-conductor")
            .join("archived-contexts")
            .join(&repo_name)
            .join(&ws.name);
        std::fs::create_dir_all(&context_dst).map_err(|e| e.to_string())?;
        copy_dir_recursive(&context_src, &context_dst)?;
        std::fs::remove_dir_all(&context_src).map_err(|e| e.to_string())?;
    }

    sqlx::query("UPDATE workspaces SET state = 'archived', derived_status = 'done' WHERE id = ?")
        .bind(&id)
        .execute(&db.0)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn unarchive_workspace(id: String, db: State<'_, DbPool>) -> Result<(), String> {
    let ws = sqlx::query_as::<_, WorkspaceRow>(
        "SELECT id, repo_id, name, branch_name, worktree_path, state, derived_status,
         task_prompt, agent_type, model, unread, pinned_at, intended_target_branch,
         pr_title, pr_description, notes, created_at, updated_at
         FROM workspaces WHERE id = ?",
    )
    .bind(&id)
    .fetch_optional(&db.0)
    .await
    .map_err(|e| e.to_string())?
    .ok_or("Workspace not found")?;

    let repo_name: String =
        sqlx::query_scalar("SELECT name FROM repos WHERE id = ?")
            .bind(&ws.repo_id)
            .fetch_one(&db.0)
            .await
            .map_err(|e| e.to_string())?;

    // Restore .context/ from archived-contexts
    let home = dirs::home_dir().ok_or("Cannot find home directory")?;
    let context_src = home
        .join("open-conductor")
        .join("archived-contexts")
        .join(&repo_name)
        .join(&ws.name);
    let context_dst = std::path::Path::new(&ws.worktree_path).join(".context");

    if context_src.exists() {
        std::fs::create_dir_all(&context_dst).map_err(|e| e.to_string())?;
        copy_dir_recursive(&context_src, &context_dst)?;
        std::fs::remove_dir_all(&context_src).map_err(|e| e.to_string())?;
    }

    sqlx::query("UPDATE workspaces SET state = 'active', derived_status = 'in-progress' WHERE id = ?")
        .bind(&id)
        .execute(&db.0)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn delete_workspace(id: String, db: State<'_, DbPool>) -> Result<(), String> {
    let ws = sqlx::query_as::<_, WorkspaceRow>(
        "SELECT id, repo_id, name, branch_name, worktree_path, state, derived_status,
         task_prompt, agent_type, model, unread, pinned_at, intended_target_branch,
         pr_title, pr_description, notes, created_at, updated_at
         FROM workspaces WHERE id = ?",
    )
    .bind(&id)
    .fetch_optional(&db.0)
    .await
    .map_err(|e| e.to_string())?
    .ok_or("Workspace not found")?;

    // Get repo path
    let repo_path: String =
        sqlx::query_scalar("SELECT path FROM repos WHERE id = ?")
            .bind(&ws.repo_id)
            .fetch_one(&db.0)
            .await
            .map_err(|e| e.to_string())?;

    // Remove worktree
    let _ = git::remove_worktree(&repo_path, &ws.worktree_path, true);

    // Delete from DB (cascades to sessions, messages)
    sqlx::query("DELETE FROM workspaces WHERE id = ?")
        .bind(&id)
        .execute(&db.0)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[derive(Debug, Deserialize)]
pub struct WorkspaceUpdate {
    pub name: Option<String>,
    pub intended_target_branch: Option<String>,
    pub derived_status: Option<String>,
    pub notes: Option<String>,
    pub pr_title: Option<String>,
    pub pr_description: Option<String>,
    pub big_terminal_mode: Option<bool>,
}

#[tauri::command]
pub async fn update_workspace(
    id: String,
    updates: WorkspaceUpdate,
    db: State<'_, DbPool>,
) -> Result<(), String> {
    let WorkspaceUpdate {
        name,
        intended_target_branch,
        derived_status,
        notes,
        pr_title,
        pr_description,
        big_terminal_mode,
    } = updates;
    if let Some(val) = name {
        sqlx::query("UPDATE workspaces SET name = ? WHERE id = ?")
            .bind(&val)
            .bind(&id)
            .execute(&db.0)
            .await
            .map_err(|e| e.to_string())?;
    }
    if let Some(val) = intended_target_branch {
        sqlx::query("UPDATE workspaces SET intended_target_branch = ? WHERE id = ?")
            .bind(&val)
            .bind(&id)
            .execute(&db.0)
            .await
            .map_err(|e| e.to_string())?;
    }
    if let Some(val) = derived_status {
        sqlx::query("UPDATE workspaces SET derived_status = ? WHERE id = ?")
            .bind(&val)
            .bind(&id)
            .execute(&db.0)
            .await
            .map_err(|e| e.to_string())?;
    }
    if let Some(val) = notes {
        sqlx::query("UPDATE workspaces SET notes = ? WHERE id = ?")
            .bind(&val)
            .bind(&id)
            .execute(&db.0)
            .await
            .map_err(|e| e.to_string())?;
    }
    if let Some(val) = pr_title {
        sqlx::query("UPDATE workspaces SET pr_title = ? WHERE id = ?")
            .bind(&val)
            .bind(&id)
            .execute(&db.0)
            .await
            .map_err(|e| e.to_string())?;
    }
    if let Some(val) = pr_description {
        sqlx::query("UPDATE workspaces SET pr_description = ? WHERE id = ?")
            .bind(&val)
            .bind(&id)
            .execute(&db.0)
            .await
            .map_err(|e| e.to_string())?;
    }
    if let Some(val) = big_terminal_mode {
        sqlx::query("UPDATE workspaces SET big_terminal_mode = ? WHERE id = ?")
            .bind(val as i32)
            .bind(&id)
            .execute(&db.0)
            .await
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn pin_workspace(id: String, db: State<'_, DbPool>) -> Result<(), String> {
    sqlx::query("UPDATE workspaces SET pinned_at = datetime('now') WHERE id = ?")
        .bind(&id)
        .execute(&db.0)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn unpin_workspace(id: String, db: State<'_, DbPool>) -> Result<(), String> {
    sqlx::query("UPDATE workspaces SET pinned_at = NULL WHERE id = ?")
        .bind(&id)
        .execute(&db.0)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn mark_workspace_unread(id: String, db: State<'_, DbPool>) -> Result<(), String> {
    sqlx::query("UPDATE workspaces SET unread = 1 WHERE id = ?")
        .bind(&id)
        .execute(&db.0)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn mark_workspace_read(id: String, db: State<'_, DbPool>) -> Result<(), String> {
    sqlx::query("UPDATE workspaces SET unread = 0 WHERE id = ?")
        .bind(&id)
        .execute(&db.0)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

fn copy_dir_recursive(src: &std::path::Path, dst: &std::path::Path) -> Result<(), String> {
    for entry in std::fs::read_dir(src).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let src_path = entry.path();
        let dst_path = dst.join(entry.file_name());

        if src_path.is_dir() {
            std::fs::create_dir_all(&dst_path).map_err(|e| e.to_string())?;
            copy_dir_recursive(&src_path, &dst_path)?;
        } else {
            std::fs::copy(&src_path, &dst_path).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn fork_workspace(
    workspace_id: String,
    db: State<'_, DbPool>,
) -> Result<WorkspaceInfo, String> {
    let original: WorkspaceRow = sqlx::query_as(
        "SELECT * FROM workspaces WHERE id = ?",
    )
    .bind(&workspace_id)
    .fetch_one(&db.0)
    .await
    .map_err(|e| e.to_string())?;

    let task_prompt = original.task_prompt.map(|t| format!("(Fork) {t}"));

    create_workspace(
        original.repo_id,
        task_prompt,
        original.agent_type,
        original.model,
        original.intended_target_branch,
        db,
    )
    .await
}

#[derive(sqlx::FromRow)]
struct RepoRow {
    #[allow(dead_code)]
    id: String,
    name: String,
    path: String,
    default_branch: String,
}

#[derive(sqlx::FromRow)]
struct WorkspaceRow {
    id: String,
    repo_id: String,
    name: String,
    branch_name: String,
    worktree_path: String,
    state: String,
    derived_status: String,
    task_prompt: Option<String>,
    agent_type: Option<String>,
    model: Option<String>,
    unread: i32,
    pinned_at: Option<String>,
    intended_target_branch: Option<String>,
    pr_title: Option<String>,
    pr_description: Option<String>,
    notes: Option<String>,
    created_at: String,
    updated_at: String,
}

impl From<WorkspaceRow> for WorkspaceInfo {
    fn from(r: WorkspaceRow) -> Self {
        Self {
            id: r.id,
            repo_id: r.repo_id,
            name: r.name,
            branch_name: r.branch_name,
            worktree_path: r.worktree_path,
            state: r.state,
            derived_status: r.derived_status,
            task_prompt: r.task_prompt,
            agent_type: r.agent_type,
            model: r.model,
            unread: r.unread != 0,
            pinned_at: r.pinned_at,
            intended_target_branch: r.intended_target_branch,
            pr_title: r.pr_title,
            pr_description: r.pr_description,
            notes: r.notes,
            insertions: 0,
            deletions: 0,
            created_at: r.created_at,
            updated_at: r.updated_at,
        }
    }
}
