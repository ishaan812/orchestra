use crate::db::DbPool;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Serialize, Deserialize)]
pub struct NotesData {
    pub content: String,
    pub last_saved: String,
}

#[tauri::command]
pub async fn get_notes(
    workspace_id: String,
    db: State<'_, DbPool>,
) -> Result<NotesData, String> {
    // Try loading from DB first
    let row: Option<(Option<String>,)> =
        sqlx::query_as("SELECT notes FROM workspaces WHERE id = ?")
            .bind(&workspace_id)
            .fetch_optional(&db.0)
            .await
            .map_err(|e| e.to_string())?;

    let content = row.and_then(|r| r.0).unwrap_or_default();

    Ok(NotesData {
        content,
        last_saved: chrono::Utc::now().to_rfc3339(),
    })
}

#[tauri::command]
pub async fn save_notes(
    workspace_id: String,
    content: String,
    db: State<'_, DbPool>,
) -> Result<(), String> {
    // Save to DB
    sqlx::query("UPDATE workspaces SET notes = ? WHERE id = ?")
        .bind(&content)
        .bind(&workspace_id)
        .execute(&db.0)
        .await
        .map_err(|e| e.to_string())?;

    // Save to .context/notes.md file
    let worktree_path: String =
        sqlx::query_scalar("SELECT worktree_path FROM workspaces WHERE id = ?")
            .bind(&workspace_id)
            .fetch_one(&db.0)
            .await
            .map_err(|e| e.to_string())?;

    let context_dir = std::path::Path::new(&worktree_path).join(".context");
    std::fs::create_dir_all(&context_dir).map_err(|e| e.to_string())?;

    let notes_path = context_dir.join("notes.md");
    std::fs::write(notes_path, &content).map_err(|e| e.to_string())?;

    Ok(())
}
