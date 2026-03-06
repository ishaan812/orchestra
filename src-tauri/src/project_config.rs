use serde::{Deserialize, Serialize};
use std::path::Path;

/// Project-level configuration read from `.orchestra.json` in the repo root.
/// Analogous to emdash's `.emdash.json`.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct OrchestraConfig {
    /// File patterns to preserve (copy from main repo to worktree).
    /// e.g. [".env", ".env.local", ".env.keys"]
    #[serde(default)]
    pub preserve_patterns: Vec<String>,

    /// Lifecycle scripts
    #[serde(default)]
    pub setup: Option<String>,

    #[serde(default)]
    pub run: Option<String>,

    #[serde(default)]
    pub teardown: Option<String>,

    /// Branch prefix override
    #[serde(default)]
    pub branch_prefix: Option<String>,

    /// Base branch override (e.g. "develop" instead of "main")
    #[serde(default)]
    pub base_ref: Option<String>,

    /// Whether to push the branch to remote on workspace creation
    #[serde(default)]
    pub push_on_create: Option<bool>,
}

/// Default file patterns to preserve when copying to worktrees.
pub const DEFAULT_PRESERVE_PATTERNS: &[&str] = &[
    ".env",
    ".env.local",
    ".env.keys",
    ".env.development",
    ".env.development.local",
];

/// Patterns to exclude from file preservation (directories that should never be copied).
pub const EXCLUDE_PATTERNS: &[&str] = &[
    "node_modules",
    ".git",
    ".cache",
    "dist",
    "build",
    "target",
    "__pycache__",
    ".next",
    ".nuxt",
];

impl OrchestraConfig {
    /// Load config from a repo root. Returns default config if file doesn't exist.
    pub fn load(repo_path: &str) -> Self {
        let config_path = Path::new(repo_path).join(".orchestra.json");
        match std::fs::read_to_string(config_path) {
            Ok(content) => serde_json::from_str(&content).unwrap_or_default(),
            Err(_) => Self::default(),
        }
    }

    /// Get the effective preserve patterns (user config + defaults).
    pub fn effective_preserve_patterns(&self) -> Vec<String> {
        if self.preserve_patterns.is_empty() {
            DEFAULT_PRESERVE_PATTERNS
                .iter()
                .map(|s| s.to_string())
                .collect()
        } else {
            self.preserve_patterns.clone()
        }
    }
}

/// Copy preserved files from source repo to worktree.
/// Only copies files that exist in source and don't already exist in destination.
pub fn preserve_files(
    source_path: &str,
    worktree_path: &str,
    patterns: &[String],
) -> Result<PreserveResult, String> {
    let source = Path::new(source_path);
    let dest = Path::new(worktree_path);
    let mut result = PreserveResult {
        copied: vec![],
        skipped: vec![],
    };

    for pattern in patterns {
        let src_file = source.join(pattern);
        let dst_file = dest.join(pattern);

        if !src_file.exists() {
            continue;
        }

        if dst_file.exists() {
            result.skipped.push(pattern.clone());
            continue;
        }

        // Ensure parent directory exists
        if let Some(parent) = dst_file.parent() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }

        if src_file.is_file() {
            std::fs::copy(&src_file, &dst_file).map_err(|e| e.to_string())?;
            result.copied.push(pattern.clone());
        } else if src_file.is_dir() {
            // Skip excluded directories
            let name = src_file
                .file_name()
                .map(|n| n.to_string_lossy().to_string())
                .unwrap_or_default();
            if EXCLUDE_PATTERNS.contains(&name.as_str()) {
                continue;
            }
            copy_dir_preserving(&src_file, &dst_file)?;
            result.copied.push(pattern.clone());
        }
    }

    Ok(result)
}

fn copy_dir_preserving(src: &Path, dst: &Path) -> Result<(), String> {
    std::fs::create_dir_all(dst).map_err(|e| e.to_string())?;
    for entry in std::fs::read_dir(src).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let src_path = entry.path();
        let dst_path = dst.join(entry.file_name());

        let name = entry.file_name().to_string_lossy().to_string();
        if EXCLUDE_PATTERNS.contains(&name.as_str()) {
            continue;
        }

        if src_path.is_dir() {
            copy_dir_preserving(&src_path, &dst_path)?;
        } else if !dst_path.exists() {
            std::fs::copy(&src_path, &dst_path).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PreserveResult {
    pub copied: Vec<String>,
    pub skipped: Vec<String>,
}
