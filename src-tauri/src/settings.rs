use crate::db::DbPool;
use std::collections::HashMap;
use tauri::State;

#[tauri::command]
pub async fn get_settings(db: State<'_, DbPool>) -> Result<HashMap<String, String>, String> {
    let rows: Vec<(String, String)> =
        sqlx::query_as("SELECT key, value FROM settings")
            .fetch_all(&db.0)
            .await
            .map_err(|e| e.to_string())?;

    Ok(rows.into_iter().collect())
}

#[tauri::command]
pub async fn get_setting(key: String, db: State<'_, DbPool>) -> Result<Option<String>, String> {
    let val: Option<String> =
        sqlx::query_scalar("SELECT value FROM settings WHERE key = ?")
            .bind(&key)
            .fetch_optional(&db.0)
            .await
            .map_err(|e| e.to_string())?;

    Ok(val)
}

#[tauri::command]
pub async fn set_setting(
    key: String,
    value: String,
    db: State<'_, DbPool>,
) -> Result<(), String> {
    sqlx::query(
        "INSERT INTO settings (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    )
    .bind(&key)
    .bind(&value)
    .execute(&db.0)
    .await
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn detect_installed_ides() -> Result<Vec<String>, String> {
    let ides = [
        ("VS Code", "code"),
        ("Cursor", "cursor"),
        ("Xcode", "xed"),
        ("Android Studio", "studio"),
        ("Sourcetree", "stree"),
        ("Fork", "fork"),
    ];

    let mut found = Vec::new();
    for (name, cmd) in &ides {
        if std::process::Command::new("which")
            .arg(cmd)
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
        {
            found.push(name.to_string());
        }
    }

    Ok(found)
}

#[tauri::command]
pub async fn open_in_ide(
    ide: String,
    path: String,
) -> Result<(), String> {
    let cmd = match ide.as_str() {
        "VS Code" => "code",
        "Cursor" => "cursor",
        "Xcode" => "xed",
        "Android Studio" => "studio",
        "Sourcetree" => "stree",
        "Fork" => "fork",
        _ => return Err(format!("Unknown IDE: {ide}")),
    };

    std::process::Command::new(cmd)
        .arg(&path)
        .spawn()
        .map_err(|e| format!("Failed to open {ide}: {e}"))?;

    Ok(())
}

#[tauri::command]
pub async fn export_workspace(
    workspace_id: String,
    format: String,
    db: State<'_, DbPool>,
) -> Result<String, String> {
    let ws: (String, String, String, Option<String>, Option<String>) = sqlx::query_as(
        "SELECT name, branch_name, state, task_prompt, notes FROM workspaces WHERE id = ?",
    )
    .bind(&workspace_id)
    .fetch_one(&db.0)
    .await
    .map_err(|e| e.to_string())?;

    let (name, branch, state, task_prompt, notes) = ws;

    let messages: Vec<(String, String, String)> = sqlx::query_as(
        "SELECT role, content, sent_at FROM messages
         WHERE session_id IN (SELECT id FROM sessions WHERE workspace_id = ?)
         ORDER BY sent_at",
    )
    .bind(&workspace_id)
    .fetch_all(&db.0)
    .await
    .map_err(|e| e.to_string())?;

    match format.as_str() {
        "md" | "markdown" => {
            let mut md = format!("# {name}\n\n");
            md.push_str(&format!("**Branch:** {branch}\n"));
            md.push_str(&format!("**Status:** {state}\n\n"));

            if let Some(ref prompt) = task_prompt {
                md.push_str(&format!("## Task\n\n{prompt}\n\n"));
            }

            if let Some(ref n) = notes {
                md.push_str(&format!("## Notes\n\n{n}\n\n"));
            }

            md.push_str("## Conversation\n\n");
            for (role, content, sent_at) in &messages {
                md.push_str(&format!("### {role} ({sent_at})\n\n{content}\n\n---\n\n"));
            }

            Ok(md)
        }
        "json" => {
            let export = serde_json::json!({
                "workspace": {
                    "name": name,
                    "branch": branch,
                    "state": state,
                    "task_prompt": task_prompt,
                    "notes": notes,
                },
                "messages": messages.iter().map(|(role, content, sent_at)| {
                    serde_json::json!({
                        "role": role,
                        "content": content,
                        "sent_at": sent_at,
                    })
                }).collect::<Vec<_>>(),
            });

            serde_json::to_string_pretty(&export).map_err(|e| e.to_string())
        }
        _ => Err(format!("Unknown export format: {format}")),
    }
}
