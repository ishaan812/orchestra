use crate::db::DbPool;
use crate::git;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FileChange {
    pub path: String,
    pub status: String,
    pub insertions: u32,
    pub deletions: u32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WorkspaceChanges {
    pub uncommitted: Vec<FileChange>,
    pub committed: Vec<FileChange>,
    pub stats: git::DiffStats,
    pub has_more: bool,
    pub total_files: u32,
}

#[tauri::command]
pub async fn get_workspace_changes(
    workspace_id: String,
    db: State<'_, DbPool>,
) -> Result<WorkspaceChanges, String> {
    let (worktree_path, target_branch) = get_workspace_paths(&workspace_id, &db).await?;

    // Get uncommitted changes
    let uncommitted_statuses = git::get_uncommitted_changes(&worktree_path)?;
    let uncommitted: Vec<FileChange> = uncommitted_statuses
        .into_iter()
        .map(|s| FileChange {
            path: s.path,
            status: s.status,
            insertions: 0,
            deletions: 0,
        })
        .collect();

    // Get committed diff stats against target branch
    let stats = git::get_diff_stats(&worktree_path, &target_branch)?;

    let committed: Vec<FileChange> = stats
        .files
        .iter()
        .map(|f| FileChange {
            path: f.path.clone(),
            status: format!("{:?}", f.status),
            insertions: f.insertions,
            deletions: f.deletions,
        })
        .collect();

    let total_files = committed.len() as u32 + uncommitted.len() as u32;
    let has_more = total_files > 50;

    // Paginate: return first 50 files
    let committed = if committed.len() > 50 {
        committed[..50].to_vec()
    } else {
        committed
    };

    Ok(WorkspaceChanges {
        uncommitted,
        committed,
        stats,
        has_more,
        total_files,
    })
}

#[tauri::command]
pub async fn get_file_diff(
    workspace_id: String,
    file_path: String,
    db: State<'_, DbPool>,
) -> Result<String, String> {
    let (worktree_path, target_branch) = get_workspace_paths(&workspace_id, &db).await?;
    git::get_file_diff(&worktree_path, &target_branch, &file_path)
}

#[tauri::command]
pub async fn get_file_content(
    workspace_id: String,
    file_path: String,
    db: State<'_, DbPool>,
) -> Result<String, String> {
    let (worktree_path, _) = get_workspace_paths(&workspace_id, &db).await?;
    let full_path = std::path::Path::new(&worktree_path).join(&file_path);
    std::fs::read_to_string(&full_path)
        .map_err(|e| format!("Failed to read {}: {}", file_path, e))
}

#[tauri::command]
pub async fn get_full_workspace_diff(
    workspace_id: String,
    db: State<'_, DbPool>,
) -> Result<String, String> {
    let (worktree_path, target_branch) = get_workspace_paths(&workspace_id, &db).await?;
    git::get_full_diff(&worktree_path, &target_branch)
}

#[tauri::command]
pub async fn merge_workspace(
    workspace_id: String,
    db: State<'_, DbPool>,
) -> Result<git::MergeResult, String> {
    let row: (String, String, String) = sqlx::query_as(
        "SELECT w.worktree_path, w.branch_name, COALESCE(w.intended_target_branch, r.default_branch, 'main')
         FROM workspaces w JOIN repos r ON w.repo_id = r.id WHERE w.id = ?",
    )
    .bind(&workspace_id)
    .fetch_one(&db.0)
    .await
    .map_err(|e| e.to_string())?;

    let (_worktree_path, source_branch, target_branch) = row;

    // Get the main repo path (parent of worktree)
    let repo_path = get_repo_path(&workspace_id, &db).await?;

    let result = git::merge_branch(&repo_path, &source_branch, &target_branch)?;

    // Update workspace state
    if result.conflicts.is_empty() {
        sqlx::query("UPDATE workspaces SET state = 'merged', derived_status = 'done' WHERE id = ?")
            .bind(&workspace_id)
            .execute(&db.0)
            .await
            .map_err(|e| e.to_string())?;
    }

    Ok(result)
}

#[tauri::command]
pub async fn detect_merge_conflicts(
    workspace_id: String,
    db: State<'_, DbPool>,
) -> Result<Vec<String>, String> {
    let (worktree_path, target_branch) = get_workspace_paths(&workspace_id, &db).await?;
    git::detect_conflicts(&worktree_path, &target_branch)
}

#[tauri::command]
pub async fn list_workspace_branches(
    workspace_id: String,
    db: State<'_, DbPool>,
) -> Result<Vec<git::BranchInfo>, String> {
    let repo_path = get_repo_path(&workspace_id, &db).await?;
    git::list_branches(&repo_path)
}

// --- helpers ---

async fn get_workspace_paths(
    workspace_id: &str,
    db: &State<'_, DbPool>,
) -> Result<(String, String), String> {
    let row: (String, String) = sqlx::query_as(
        "SELECT w.worktree_path, COALESCE(w.intended_target_branch, r.default_branch, 'main')
         FROM workspaces w JOIN repos r ON w.repo_id = r.id WHERE w.id = ?",
    )
    .bind(workspace_id)
    .fetch_one(&db.0)
    .await
    .map_err(|e| e.to_string())?;
    Ok(row)
}

async fn get_repo_path(workspace_id: &str, db: &State<'_, DbPool>) -> Result<String, String> {
    let path: String = sqlx::query_scalar(
        "SELECT r.path FROM repos r JOIN workspaces w ON w.repo_id = r.id WHERE w.id = ?",
    )
    .bind(workspace_id)
    .fetch_one(&db.0)
    .await
    .map_err(|e| e.to_string())?;
    Ok(path)
}
