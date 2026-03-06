pub mod config;
pub mod detection;

use crate::db::DbPool;
use config::ProviderDefinition;
use detection::{detect_installed_providers, DetectedProvider};
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Serialize, Deserialize)]
pub struct ProviderInfo {
    pub id: String,
    pub name: String,
    pub cli: String,
    pub terminal_only: bool,
    pub supports_resume: bool,
    pub supports_auto_approve: bool,
    pub supports_session_id: bool,
}

impl From<&ProviderDefinition> for ProviderInfo {
    fn from(p: &ProviderDefinition) -> Self {
        Self {
            id: p.id.to_string(),
            name: p.name.to_string(),
            cli: p.cli.to_string(),
            terminal_only: p.terminal_only,
            supports_resume: p.resume_flag.is_some(),
            supports_auto_approve: p.auto_approve_flag.is_some(),
            supports_session_id: p.session_id_flag.is_some(),
        }
    }
}

/// List all known providers with their capabilities.
#[tauri::command]
pub async fn list_providers() -> Result<Vec<ProviderInfo>, String> {
    Ok(config::PROVIDERS.iter().map(ProviderInfo::from).collect())
}

/// Detect which providers are installed on the system.
#[tauri::command]
pub async fn detect_providers() -> Result<Vec<DetectedProvider>, String> {
    // Run detection in a blocking thread to avoid blocking the async runtime
    tokio::task::spawn_blocking(detect_installed_providers)
        .await
        .map_err(|e| e.to_string())
}

/// Get detailed info about a specific provider.
#[tauri::command]
pub async fn get_provider_info(provider_id: String) -> Result<ProviderInfo, String> {
    ProviderDefinition::find(&provider_id)
        .map(ProviderInfo::from)
        .ok_or_else(|| format!("Unknown provider: {}", provider_id))
}

/// Save a provider-specific setting for a workspace.
#[tauri::command]
pub async fn save_provider_setting(
    workspace_id: String,
    provider_id: String,
    key: String,
    value: String,
    db: State<'_, DbPool>,
) -> Result<(), String> {
    sqlx::query(
        "INSERT INTO provider_settings (id, workspace_id, provider_id, key, value)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT (workspace_id, provider_id, key) DO UPDATE SET value = excluded.value",
    )
    .bind(uuid::Uuid::new_v4().to_string())
    .bind(&workspace_id)
    .bind(&provider_id)
    .bind(&key)
    .bind(&value)
    .execute(&db.0)
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
}

/// Get provider settings for a workspace.
#[tauri::command]
pub async fn get_provider_settings(
    workspace_id: String,
    provider_id: String,
    db: State<'_, DbPool>,
) -> Result<Vec<(String, String)>, String> {
    let rows: Vec<(String, String)> = sqlx::query_as(
        "SELECT key, value FROM provider_settings WHERE workspace_id = ? AND provider_id = ?",
    )
    .bind(&workspace_id)
    .bind(&provider_id)
    .fetch_all(&db.0)
    .await
    .map_err(|e| e.to_string())?;
    Ok(rows)
}
