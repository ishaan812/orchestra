use super::config::PROVIDERS;
use serde::{Deserialize, Serialize};
use std::process::Command;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DetectedProvider {
    pub id: String,
    pub name: String,
    pub installed: bool,
    pub version: Option<String>,
    pub path: Option<String>,
}

/// Detect which providers are installed by checking for their CLI binaries.
pub fn detect_installed_providers() -> Vec<DetectedProvider> {
    PROVIDERS
        .iter()
        .map(|provider| {
            let (installed, path) = check_cli_exists(provider.cli);
            let version = if installed {
                get_cli_version(provider.cli, provider.version_args)
            } else {
                None
            };

            DetectedProvider {
                id: provider.id.to_string(),
                name: provider.name.to_string(),
                installed,
                version,
                path,
            }
        })
        .collect()
}

/// Check if a CLI binary exists using `which`.
fn check_cli_exists(cli: &str) -> (bool, Option<String>) {
    match Command::new("which").arg(cli).output() {
        Ok(output) if output.status.success() => {
            let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
            (true, Some(path))
        }
        _ => (false, None),
    }
}

/// Get the version string of a CLI binary.
fn get_cli_version(cli: &str, version_args: &[&str]) -> Option<String> {
    Command::new(cli)
        .args(version_args)
        .output()
        .ok()
        .and_then(|output| {
            if output.status.success() {
                let ver = String::from_utf8_lossy(&output.stdout).trim().to_string();
                if ver.is_empty() {
                    None
                } else {
                    Some(ver)
                }
            } else {
                None
            }
        })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_detect_returns_all_providers() {
        let detected = detect_installed_providers();
        assert_eq!(detected.len(), 2);
        assert_eq!(detected[0].id, "claude");
        assert_eq!(detected[1].id, "codex");
    }

    #[test]
    fn test_check_cli_exists_for_known_binary() {
        // `ls` should exist on any Unix system
        let (exists, path) = check_cli_exists("ls");
        assert!(exists);
        assert!(path.is_some());
    }

    #[test]
    fn test_check_cli_exists_for_missing_binary() {
        let (exists, path) = check_cli_exists("definitely_not_a_real_binary_xyz");
        assert!(!exists);
        assert!(path.is_none());
    }
}
