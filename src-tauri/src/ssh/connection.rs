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

#[cfg(test)]
mod tests {
    use super::*;

    fn make_info(host: &str, port: i64, key: Option<&str>) -> SshConnectionInfo {
        SshConnectionInfo {
            id: "test-id".to_string(),
            name: "Test".to_string(),
            host: host.to_string(),
            port,
            username: "testuser".to_string(),
            auth_type: "key".to_string(),
            private_key_path: key.map(|s| s.to_string()),
            use_agent: false,
            last_connected_at: None,
        }
    }

    #[test]
    fn test_ssh_connection_row_to_info_use_agent_true() {
        let row = SshConnectionRow {
            id: "1".to_string(),
            name: "srv".to_string(),
            host: "h".to_string(),
            port: 22,
            username: "u".to_string(),
            auth_type: "key".to_string(),
            private_key_path: None,
            use_agent: 1,
            last_connected_at: None,
        };
        let info = SshConnectionInfo::from(row);
        assert!(info.use_agent);
    }

    #[test]
    fn test_ssh_connection_row_to_info_use_agent_false() {
        let row = SshConnectionRow {
            id: "1".to_string(),
            name: "srv".to_string(),
            host: "h".to_string(),
            port: 22,
            username: "u".to_string(),
            auth_type: "key".to_string(),
            private_key_path: Some("/key".to_string()),
            use_agent: 0,
            last_connected_at: Some("2024-01-01".to_string()),
        };
        let info = SshConnectionInfo::from(row);
        assert!(!info.use_agent);
        assert_eq!(info.private_key_path, Some("/key".to_string()));
        assert_eq!(info.last_connected_at, Some("2024-01-01".to_string()));
    }

    #[test]
    fn test_ssh_connection_info_serialization() {
        let info = make_info("example.com", 22, Some("/home/user/.ssh/id_rsa"));
        let json = serde_json::to_string(&info).unwrap();
        let deserialized: SshConnectionInfo = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.host, "example.com");
        assert_eq!(deserialized.port, 22);
        assert_eq!(deserialized.private_key_path, Some("/home/user/.ssh/id_rsa".to_string()));
    }

    #[test]
    fn test_ssh_test_result_serialization() {
        let result = SshTestResult {
            success: true,
            message: "Connection successful".to_string(),
            latency_ms: Some(42),
        };
        let json = serde_json::to_string(&result).unwrap();
        assert!(json.contains("\"success\":true"));
        assert!(json.contains("\"latency_ms\":42"));
    }
}
