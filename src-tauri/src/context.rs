use crate::db::DbPool;
use serde::Serialize;
use std::path::Path;
use tauri::State;

const CONTEXT_SUBDIRS: &[&str] = &["attachments", "plans"];

#[derive(Debug, Serialize)]
pub struct ContextInfo {
    pub exists: bool,
    pub file_count: usize,
    pub notes_exists: bool,
    pub todos_exists: bool,
    pub plan_count: usize,
    pub attachment_count: usize,
}

/// Create .context/ directory with all subdirectories.
pub fn create_context_dir(worktree_path: &str) -> Result<(), String> {
    let context_dir = Path::new(worktree_path).join(".context");
    std::fs::create_dir_all(&context_dir).map_err(|e| e.to_string())?;

    for subdir in CONTEXT_SUBDIRS {
        std::fs::create_dir_all(context_dir.join(subdir)).map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
pub async fn init_context_dir(
    workspace_id: String,
    db: State<'_, DbPool>,
) -> Result<(), String> {
    let worktree_path: String =
        sqlx::query_scalar("SELECT worktree_path FROM workspaces WHERE id = ?")
            .bind(&workspace_id)
            .fetch_one(&db.0)
            .await
            .map_err(|e| e.to_string())?;

    create_context_dir(&worktree_path)
}

#[tauri::command]
pub async fn get_context_info(
    workspace_id: String,
    db: State<'_, DbPool>,
) -> Result<ContextInfo, String> {
    let worktree_path: String =
        sqlx::query_scalar("SELECT worktree_path FROM workspaces WHERE id = ?")
            .bind(&workspace_id)
            .fetch_one(&db.0)
            .await
            .map_err(|e| e.to_string())?;

    let context_dir = Path::new(&worktree_path).join(".context");

    if !context_dir.exists() {
        return Ok(ContextInfo {
            exists: false,
            file_count: 0,
            notes_exists: false,
            todos_exists: false,
            plan_count: 0,
            attachment_count: 0,
        });
    }

    let notes_exists = context_dir.join("notes.md").exists();
    let todos_exists = context_dir.join("todos.md").exists();

    let plan_count = count_files_in_dir(&context_dir.join("plans"));
    let attachment_count = count_files_in_dir(&context_dir.join("attachments"));
    let file_count = plan_count + attachment_count + notes_exists as usize + todos_exists as usize;

    Ok(ContextInfo {
        exists: true,
        file_count,
        notes_exists,
        todos_exists,
        plan_count,
        attachment_count,
    })
}

fn count_files_in_dir(dir: &Path) -> usize {
    if !dir.exists() {
        return 0;
    }
    std::fs::read_dir(dir)
        .map(|entries| entries.filter_map(Result::ok).count())
        .unwrap_or(0)
}

#[tauri::command]
pub async fn archive_context(
    workspace_id: String,
    db: State<'_, DbPool>,
) -> Result<(), String> {
    let (worktree_path, repo_path): (String, String) = sqlx::query_as(
        "SELECT w.worktree_path, r.path FROM workspaces w
         JOIN repos r ON w.repo_id = r.id WHERE w.id = ?",
    )
    .bind(&workspace_id)
    .fetch_one(&db.0)
    .await
    .map_err(|e| e.to_string())?;

    let source = Path::new(&worktree_path).join(".context");
    if !source.exists() {
        return Ok(());
    }

    let home = dirs::home_dir().ok_or("No home directory")?;
    let repo_name = Path::new(&repo_path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown");

    let dest = home
        .join("open-conductor")
        .join("archived-contexts")
        .join(repo_name)
        .join(&workspace_id);

    std::fs::create_dir_all(&dest).map_err(|e| e.to_string())?;

    // Copy .context/ to archive
    copy_dir_recursive(&source, &dest)?;

    // Remove source
    std::fs::remove_dir_all(&source).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn unarchive_context(
    workspace_id: String,
    db: State<'_, DbPool>,
) -> Result<(), String> {
    let (worktree_path, repo_path): (String, String) = sqlx::query_as(
        "SELECT w.worktree_path, r.path FROM workspaces w
         JOIN repos r ON w.repo_id = r.id WHERE w.id = ?",
    )
    .bind(&workspace_id)
    .fetch_one(&db.0)
    .await
    .map_err(|e| e.to_string())?;

    let home = dirs::home_dir().ok_or("No home directory")?;
    let repo_name = Path::new(&repo_path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown");

    let source = home
        .join("open-conductor")
        .join("archived-contexts")
        .join(repo_name)
        .join(&workspace_id);

    if !source.exists() {
        return Ok(());
    }

    let dest = Path::new(&worktree_path).join(".context");
    std::fs::create_dir_all(&dest).map_err(|e| e.to_string())?;

    copy_dir_recursive(&source, &dest)?;

    // Remove archive copy
    std::fs::remove_dir_all(&source).map_err(|e| e.to_string())?;

    Ok(())
}

pub(crate) fn copy_dir_recursive(src: &Path, dst: &Path) -> Result<(), String> {
    std::fs::create_dir_all(dst).map_err(|e| e.to_string())?;

    for entry in std::fs::read_dir(src).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let src_path = entry.path();
        let dst_path = dst.join(entry.file_name());

        if src_path.is_dir() {
            copy_dir_recursive(&src_path, &dst_path)?;
        } else {
            std::fs::copy(&src_path, &dst_path).map_err(|e| e.to_string())?;
        }
    }

    Ok(())
}

#[tauri::command]
pub async fn save_plan(
    workspace_id: String,
    plan_name: String,
    content: String,
    db: State<'_, DbPool>,
) -> Result<String, String> {
    let worktree_path: String =
        sqlx::query_scalar("SELECT worktree_path FROM workspaces WHERE id = ?")
            .bind(&workspace_id)
            .fetch_one(&db.0)
            .await
            .map_err(|e| e.to_string())?;

    let plans_dir = Path::new(&worktree_path).join(".context").join("plans");
    std::fs::create_dir_all(&plans_dir).map_err(|e| e.to_string())?;

    let filename = format!("{}.md", plan_name.replace(' ', "-").to_lowercase());
    let plan_path = plans_dir.join(&filename);
    std::fs::write(&plan_path, content).map_err(|e| e.to_string())?;

    Ok(filename)
}
