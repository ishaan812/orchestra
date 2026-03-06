use serde::{Deserialize, Serialize};
use std::process::Command;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SshConnectionInfo {
    pub id: String,
    pub name: String,
    pub host: String,
    pub port: i64,
    pub username: String,
    pub auth_type: String,
    pub private_key_path: Option<String>,
    pub use_agent: bool,
    pub last_connected_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SshTestResult {
    pub success: bool,
    pub message: String,
    pub latency_ms: Option<u64>,
}

#[derive(sqlx::FromRow)]
pub struct SshConnectionRow {
    pub id: String,
    pub name: String,
    pub host: String,
    pub port: i64,
    pub username: String,
    pub auth_type: String,
    pub private_key_path: Option<String>,
    pub use_agent: i32,
    pub last_connected_at: Option<String>,
}

impl From<SshConnectionRow> for SshConnectionInfo {
    fn from(r: SshConnectionRow) -> Self {
        Self {
            id: r.id,
            name: r.name,
            host: r.host,
            port: r.port,
            username: r.username,
            auth_type: r.auth_type,
            private_key_path: r.private_key_path,
            use_agent: r.use_agent != 0,
            last_connected_at: r.last_connected_at,
        }
    }
}

/// Test an SSH connection by running `ssh -o ConnectTimeout=5 -o BatchMode=yes` to check connectivity.
/// We use the system `ssh` binary rather than an SSH library to leverage the user's SSH config,
/// agent forwarding, and key management.
pub async fn test_ssh_connection(info: &SshConnectionInfo) -> SshTestResult {
    let start = std::time::Instant::now();

    let mut args = vec![
        "-o".to_string(),
        "ConnectTimeout=5".to_string(),
        "-o".to_string(),
        "BatchMode=yes".to_string(),
        "-o".to_string(),
        "StrictHostKeyChecking=accept-new".to_string(),
        "-p".to_string(),
        info.port.to_string(),
    ];

    if let Some(ref key_path) = info.private_key_path {
        args.push("-i".to_string());
        args.push(key_path.clone());
    }

    args.push(format!("{}@{}", info.username, info.host));
    args.push("echo".to_string());
    args.push("ok".to_string());

    let result = tokio::task::spawn_blocking(move || {
        Command::new("ssh").args(&args).output()
    })
    .await;

    let elapsed = start.elapsed().as_millis() as u64;

    match result {
        Ok(Ok(output)) if output.status.success() => SshTestResult {
            success: true,
            message: "Connection successful".to_string(),
            latency_ms: Some(elapsed),
        },
        Ok(Ok(output)) => {
            let stderr = String::from_utf8_lossy(&output.stderr);
            SshTestResult {
                success: false,
                message: format!("Connection failed: {}", stderr.trim()),
                latency_ms: Some(elapsed),
            }
        }
        Ok(Err(e)) => SshTestResult {
            success: false,
            message: format!("Failed to run ssh: {}", e),
            latency_ms: None,
        },
        Err(e) => SshTestResult {
            success: false,
            message: format!("Task error: {}", e),
            latency_ms: None,
        },
    }
}
