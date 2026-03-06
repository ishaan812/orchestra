pub mod connection;

use crate::db::DbPool;
use connection::{SshConnectionInfo, SshTestResult};
use serde::Deserialize;
use tauri::State;

#[derive(Debug, Deserialize)]
pub struct AddConnectionParams {
    pub name: String,
    pub host: String,
    pub port: Option<i64>,
    pub username: String,
    pub auth_type: Option<String>,
    pub private_key_path: Option<String>,
    pub use_agent: Option<bool>,
}

#[tauri::command]
pub async fn ssh_add_connection(
    params: AddConnectionParams,
    db: State<'_, DbPool>,
) -> Result<SshConnectionInfo, String> {
    let id = uuid::Uuid::new_v4().to_string();
    let port = params.port.unwrap_or(22);
    let auth_type = params.auth_type.unwrap_or_else(|| "key".to_string());
    let use_agent = params.use_agent.unwrap_or(false);

    sqlx::query(
        "INSERT INTO ssh_connections (id, name, host, port, username, auth_type, private_key_path, use_agent)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(&id)
    .bind(&params.name)
    .bind(&params.host)
    .bind(port)
    .bind(&params.username)
    .bind(&auth_type)
    .bind(&params.private_key_path)
    .bind(use_agent as i32)
    .execute(&db.0)
    .await
    .map_err(|e| e.to_string())?;

    Ok(SshConnectionInfo {
        id,
        name: params.name,
        host: params.host,
        port,
        username: params.username,
        auth_type,
        private_key_path: params.private_key_path,
        use_agent,
        last_connected_at: None,
    })
}

#[tauri::command]
pub async fn ssh_list_connections(
    db: State<'_, DbPool>,
) -> Result<Vec<SshConnectionInfo>, String> {
    let rows: Vec<connection::SshConnectionRow> = sqlx::query_as(
        "SELECT id, name, host, port, username, auth_type, private_key_path, use_agent, last_connected_at
         FROM ssh_connections ORDER BY name ASC",
    )
    .fetch_all(&db.0)
    .await
    .map_err(|e| e.to_string())?;

    Ok(rows.into_iter().map(SshConnectionInfo::from).collect())
}

#[tauri::command]
pub async fn ssh_remove_connection(
    connection_id: String,
    db: State<'_, DbPool>,
) -> Result<(), String> {
    sqlx::query("DELETE FROM ssh_connections WHERE id = ?")
        .bind(&connection_id)
        .execute(&db.0)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn ssh_test_connection(
    connection_id: String,
    db: State<'_, DbPool>,
) -> Result<SshTestResult, String> {
    let row: connection::SshConnectionRow = sqlx::query_as(
        "SELECT id, name, host, port, username, auth_type, private_key_path, use_agent, last_connected_at
         FROM ssh_connections WHERE id = ?",
    )
    .bind(&connection_id)
    .fetch_one(&db.0)
    .await
    .map_err(|e| e.to_string())?;

    let info = SshConnectionInfo::from(row);
    let result = connection::test_ssh_connection(&info).await;

    // Update last_connected_at if successful
    if result.success {
        let _ = sqlx::query("UPDATE ssh_connections SET last_connected_at = datetime('now') WHERE id = ?")
            .bind(&connection_id)
            .execute(&db.0)
            .await;
    }

    Ok(result)
}
