use crate::db::DbPool;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RepoInfo {
    pub id: String,
    pub name: String,
    pub path: String,
    pub remote_url: Option<String>,
    pub default_branch: String,
    pub remote: String,
    pub display_order: i64,
    pub created_at: String,
    pub updated_at: String,
}

#[tauri::command]
pub async fn add_repo(path: String, db: State<'_, DbPool>) -> Result<RepoInfo, String> {
    let repo = git2::Repository::open(&path).map_err(|_| "Not a git repository".to_string())?;

    let name = std::path::Path::new(&path)
        .file_name()
        .map(|n| n.to_string_lossy().into_owned())
        .unwrap_or_else(|| "unknown".to_string());

    let remote_url = repo
        .find_remote("origin")
        .ok()
        .and_then(|r| r.url().map(String::from));

    let default_branch = find_default_branch(&repo);

    let id = uuid::Uuid::new_v4().to_string();

    let max_order: Option<i64> =
        sqlx::query_scalar("SELECT MAX(display_order) FROM repos")
            .fetch_one(&db.0)
            .await
            .map_err(|e| e.to_string())?;

    let display_order = max_order.unwrap_or(0) + 1;

    sqlx::query(
        "INSERT INTO repos (id, name, path, remote_url, default_branch, remote, display_order)
         VALUES (?, ?, ?, ?, ?, 'origin', ?)",
    )
    .bind(&id)
    .bind(&name)
    .bind(&path)
    .bind(&remote_url)
    .bind(&default_branch)
    .bind(display_order)
    .execute(&db.0)
    .await
    .map_err(|e| e.to_string())?;

    Ok(RepoInfo {
        id,
        name,
        path,
        remote_url,
        default_branch,
        remote: "origin".to_string(),
        display_order,
        created_at: chrono::Utc::now().to_rfc3339(),
        updated_at: chrono::Utc::now().to_rfc3339(),
    })
}

#[tauri::command]
pub async fn list_repos(db: State<'_, DbPool>) -> Result<Vec<RepoInfo>, String> {
    let rows = sqlx::query_as::<_, RepoRow>(
        "SELECT id, name, path, remote_url, default_branch, remote, display_order, created_at, updated_at
         FROM repos ORDER BY display_order",
    )
    .fetch_all(&db.0)
    .await
    .map_err(|e| e.to_string())?;

    Ok(rows.into_iter().map(RepoInfo::from).collect())
}

#[tauri::command]
pub async fn get_repo(id: String, db: State<'_, DbPool>) -> Result<RepoInfo, String> {
    let row = sqlx::query_as::<_, RepoRow>(
        "SELECT id, name, path, remote_url, default_branch, remote, display_order, created_at, updated_at
         FROM repos WHERE id = ?",
    )
    .bind(&id)
    .fetch_optional(&db.0)
    .await
    .map_err(|e| e.to_string())?
    .ok_or("Repo not found")?;

    Ok(RepoInfo::from(row))
}

#[tauri::command]
pub async fn remove_repo(id: String, db: State<'_, DbPool>) -> Result<(), String> {
    sqlx::query("DELETE FROM repos WHERE id = ?")
        .bind(&id)
        .execute(&db.0)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn reorder_repos(ids: Vec<String>, db: State<'_, DbPool>) -> Result<(), String> {
    for (i, id) in ids.iter().enumerate() {
        sqlx::query("UPDATE repos SET display_order = ? WHERE id = ?")
            .bind(i as i64)
            .bind(id)
            .execute(&db.0)
            .await
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn find_default_branch(repo: &git2::Repository) -> String {
    if let Ok(head) = repo.head() {
        if let Some(name) = head.shorthand() {
            return name.to_string();
        }
    }

    for candidate in &["main", "master"] {
        if repo
            .find_branch(candidate, git2::BranchType::Local)
            .is_ok()
        {
            return candidate.to_string();
        }
    }

    "main".to_string()
}

#[derive(sqlx::FromRow)]
struct RepoRow {
    id: String,
    name: String,
    path: String,
    remote_url: Option<String>,
    default_branch: String,
    remote: String,
    display_order: i64,
    created_at: String,
    updated_at: String,
}

impl From<RepoRow> for RepoInfo {
    fn from(r: RepoRow) -> Self {
        Self {
            id: r.id,
            name: r.name,
            path: r.path,
            remote_url: r.remote_url,
            default_branch: r.default_branch,
            remote: r.remote,
            display_order: r.display_order,
            created_at: r.created_at,
            updated_at: r.updated_at,
        }
    }
}
