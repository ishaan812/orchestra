use crate::db::DbPool;
use tauri::State;

#[tauri::command]
pub async fn activate_spotlight(
    workspace_id: String,
    db: State<'_, DbPool>,
) -> Result<(), String> {
    let worktree_path: String =
        sqlx::query_scalar("SELECT worktree_path FROM workspaces WHERE id = ?")
            .bind(&workspace_id)
            .fetch_one(&db.0)
            .await
            .map_err(|e| e.to_string())?;

    // Check if git is busy
    if crate::git::is_git_busy(&worktree_path) {
        return Err("Cannot activate spotlight: git rebase/merge in progress".to_string());
    }

    // Mark workspace as spotlight-active
    sqlx::query("UPDATE workspaces SET derived_status = 'spotlight' WHERE id = ?")
        .bind(&workspace_id)
        .execute(&db.0)
        .await
        .map_err(|e| e.to_string())?;

    tracing::info!("Spotlight activated for workspace {}", workspace_id);
    Ok(())
}

#[tauri::command]
pub async fn deactivate_spotlight(
    workspace_id: String,
    db: State<'_, DbPool>,
) -> Result<(), String> {
    // Reset derived_status
    sqlx::query("UPDATE workspaces SET derived_status = 'idle' WHERE id = ?")
        .bind(&workspace_id)
        .execute(&db.0)
        .await
        .map_err(|e| e.to_string())?;

    tracing::info!("Spotlight deactivated for workspace {}", workspace_id);
    Ok(())
}
