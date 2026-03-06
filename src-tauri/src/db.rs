use sqlx::sqlite::{SqliteConnectOptions, SqlitePool, SqlitePoolOptions};
use std::str::FromStr;
use tauri::{AppHandle, Manager};
use tracing::info;

/// Wrapper for the SQLite connection pool, stored in Tauri managed state.
pub struct DbPool(pub SqlitePool);

pub async fn get_db_path(app_handle: &AppHandle) -> Result<String, String> {
    let app_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&app_dir).map_err(|e| e.to_string())?;
    let db_path = app_dir.join("openconductor.db");
    Ok(db_path.to_string_lossy().into_owned())
}

pub async fn init_database(app_handle: &AppHandle) -> Result<SqlitePool, String> {
    let db_path = get_db_path(app_handle).await?;
    info!("Initializing database at: {}", db_path);

    let options = SqliteConnectOptions::from_str(&format!("sqlite://{}?mode=rwc", db_path))
        .map_err(|e| e.to_string())?
        .journal_mode(sqlx::sqlite::SqliteJournalMode::Wal)
        .create_if_missing(true);

    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect_with(options)
        .await
        .map_err(|e| e.to_string())?;

    run_migrations(&pool).await?;
    seed_settings(&pool).await?;

    info!("Database initialized successfully");
    Ok(pool)
}

async fn run_migrations(pool: &SqlitePool) -> Result<(), String> {
    sqlx::migrate!("./migrations")
        .run(pool)
        .await
        .map_err(|e| e.to_string())
}

async fn seed_settings(pool: &SqlitePool) -> Result<(), String> {
    let defaults = [
        ("default_model", "opus"),
        ("notifications_enabled", "true"),
        ("sound_effects_enabled", "true"),
        ("always_show_context_wheel", "true"),
        ("using_split_view", "true"),
        ("default_open_in", "cursor"),
        ("markdown_style", "default"),
        ("branch_prefix_type", "github_username"),
        ("default_codex_thinking_level", "high"),
        ("review_codex_thinking_level", "high"),
    ];

    for (key, value) in &defaults {
        sqlx::query("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)")
            .bind(key)
            .bind(value)
            .execute(pool)
            .await
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}
