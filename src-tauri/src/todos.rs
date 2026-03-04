use crate::db::DbPool;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TodoItem {
    pub id: String,
    pub text: String,
    pub completed: bool,
    pub blocks_merge: bool,
    pub order: i32,
}

#[tauri::command]
pub async fn get_todos(
    workspace_id: String,
    db: State<'_, DbPool>,
) -> Result<Vec<TodoItem>, String> {
    let worktree_path: String =
        sqlx::query_scalar("SELECT worktree_path FROM workspaces WHERE id = ?")
            .bind(&workspace_id)
            .fetch_one(&db.0)
            .await
            .map_err(|e| e.to_string())?;

    let todos_path = std::path::Path::new(&worktree_path)
        .join(".context")
        .join("todos.md");

    match std::fs::read_to_string(&todos_path) {
        Ok(content) => Ok(parse_todos_md(&content)),
        Err(_) => Ok(vec![]),
    }
}

#[tauri::command]
pub async fn save_todos(
    workspace_id: String,
    todos: Vec<TodoItem>,
    db: State<'_, DbPool>,
) -> Result<(), String> {
    let worktree_path: String =
        sqlx::query_scalar("SELECT worktree_path FROM workspaces WHERE id = ?")
            .bind(&workspace_id)
            .fetch_one(&db.0)
            .await
            .map_err(|e| e.to_string())?;

    let context_dir = std::path::Path::new(&worktree_path).join(".context");
    std::fs::create_dir_all(&context_dir).map_err(|e| e.to_string())?;

    let content = todos_to_md(&todos);
    std::fs::write(context_dir.join("todos.md"), content).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn check_blocking_todos(
    workspace_id: String,
    db: State<'_, DbPool>,
) -> Result<Vec<TodoItem>, String> {
    let worktree_path: String =
        sqlx::query_scalar("SELECT worktree_path FROM workspaces WHERE id = ?")
            .bind(&workspace_id)
            .fetch_one(&db.0)
            .await
            .map_err(|e| e.to_string())?;

    let todos_path = std::path::Path::new(&worktree_path)
        .join(".context")
        .join("todos.md");

    match std::fs::read_to_string(&todos_path) {
        Ok(content) => {
            let todos = parse_todos_md(&content);
            Ok(todos
                .into_iter()
                .filter(|t| t.blocks_merge && !t.completed)
                .collect())
        }
        Err(_) => Ok(vec![]),
    }
}

fn parse_todos_md(content: &str) -> Vec<TodoItem> {
    let mut todos = Vec::new();
    let mut order = 0;

    for line in content.lines() {
        let trimmed = line.trim();

        // Match: "- [ ] Text" or "- [x] Text" with optional "[blocks]"
        if let Some(rest) = trimmed.strip_prefix("- [") {
            let (completed, text_start) = if rest.starts_with("x] ") || rest.starts_with("X] ") {
                (true, 4)
            } else if rest.starts_with(" ] ") {
                (false, 3)
            } else {
                continue;
            };

            let text = &rest[text_start..];
            let blocks_merge = text.contains("[blocks]");
            let clean_text = text.replace("[blocks]", "").trim().to_string();

            todos.push(TodoItem {
                id: uuid::Uuid::new_v4().to_string(),
                text: clean_text,
                completed,
                blocks_merge,
                order,
            });
            order += 1;
        }
    }

    todos
}

fn todos_to_md(todos: &[TodoItem]) -> String {
    let mut lines = Vec::with_capacity(todos.len());
    for todo in todos {
        let checkbox = if todo.completed { "x" } else { " " };
        let blocks = if todo.blocks_merge { " [blocks]" } else { "" };
        lines.push(format!("- [{}] {}{}", checkbox, todo.text, blocks));
    }
    lines.join("\n") + "\n"
}
