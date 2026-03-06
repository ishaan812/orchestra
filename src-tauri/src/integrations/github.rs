use crate::db::DbPool;
use serde::{Deserialize, Serialize};
use std::process::Command;
use tauri::{AppHandle, Emitter, State};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PrStatus {
    pub number: u64,
    pub title: String,
    pub state: String,
    pub review_decision: String,
    pub mergeable: String,
    pub url: String,
    pub draft: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CheckRun {
    pub name: String,
    pub status: String,
    pub conclusion: String,
    pub started_at: String,
    pub completed_at: String,
    pub url: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PrComment {
    pub id: u64,
    pub author: String,
    pub body: String,
    pub path: String,
    pub line: u32,
    pub created_at: String,
    pub in_reply_to_id: Option<u64>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WorkflowRun {
    pub id: u64,
    pub name: String,
    pub status: String,
    pub conclusion: String,
    pub head_branch: String,
    pub created_at: String,
    pub updated_at: String,
    pub url: String,
    pub jobs: Vec<WorkflowJob>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WorkflowJob {
    pub id: u64,
    pub name: String,
    pub status: String,
    pub conclusion: String,
    pub started_at: String,
    pub completed_at: String,
}

fn run_gh(args: &[&str], cwd: &str) -> Result<String, String> {
    let output = Command::new("gh")
        .args(args)
        .current_dir(cwd)
        .output()
        .map_err(|e| format!("Failed to run gh: {e}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("gh command failed: {stderr}"));
    }

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

async fn get_workspace_repo_path(
    workspace_id: &str,
    db: &State<'_, DbPool>,
) -> Result<(String, String), String> {
    let row: (String, String) = sqlx::query_as(
        "SELECT r.path, w.branch_name FROM workspaces w JOIN repos r ON w.repo_id = r.id WHERE w.id = ?",
    )
    .bind(workspace_id)
    .fetch_one(&db.0)
    .await
    .map_err(|e| e.to_string())?;
    Ok(row)
}

#[tauri::command]
pub async fn get_pr_status(
    workspace_id: String,
    db: State<'_, DbPool>,
) -> Result<Option<PrStatus>, String> {
    let (repo_path, branch) = get_workspace_repo_path(&workspace_id, &db).await?;

    let output = run_gh(
        &[
            "pr", "view", &branch, "--json",
            "number,title,state,reviewDecision,mergeable,url,isDraft",
        ],
        &repo_path,
    );

    match output {
        Ok(json_str) => {
            let val: serde_json::Value =
                serde_json::from_str(&json_str).map_err(|e| e.to_string())?;

            Ok(Some(PrStatus {
                number: val["number"].as_u64().unwrap_or(0),
                title: val["title"].as_str().unwrap_or("").to_string(),
                state: val["state"].as_str().unwrap_or("").to_string(),
                review_decision: val["reviewDecision"].as_str().unwrap_or("").to_string(),
                mergeable: val["mergeable"].as_str().unwrap_or("").to_string(),
                url: val["url"].as_str().unwrap_or("").to_string(),
                draft: val["isDraft"].as_bool().unwrap_or(false),
            }))
        }
        Err(_) => Ok(None), // No PR exists for this branch
    }
}

#[tauri::command]
pub async fn create_pr(
    workspace_id: String,
    title: String,
    body: String,
    draft: bool,
    db: State<'_, DbPool>,
) -> Result<PrStatus, String> {
    let (repo_path, branch) = get_workspace_repo_path(&workspace_id, &db).await?;

    let mut args = vec![
        "pr", "create",
        "--head", &branch,
        "--title", &title,
        "--body", &body,
    ];
    if draft {
        args.push("--draft");
    }

    run_gh(&args, &repo_path)?;

    // Fetch the created PR
    get_pr_status(workspace_id, db)
        .await?
        .ok_or_else(|| "PR created but could not fetch status".to_string())
}

#[tauri::command]
pub async fn update_pr(
    workspace_id: String,
    title: Option<String>,
    body: Option<String>,
    db: State<'_, DbPool>,
) -> Result<(), String> {
    let (repo_path, branch) = get_workspace_repo_path(&workspace_id, &db).await?;

    let mut args = vec!["pr", "edit", &branch];
    let title_str;
    let body_str;

    if let Some(ref t) = title {
        title_str = t.clone();
        args.push("--title");
        args.push(&title_str);
    }
    if let Some(ref b) = body {
        body_str = b.clone();
        args.push("--body");
        args.push(&body_str);
    }

    run_gh(&args, &repo_path)?;
    Ok(())
}

#[tauri::command]
pub async fn get_pr_checks(
    workspace_id: String,
    db: State<'_, DbPool>,
) -> Result<Vec<CheckRun>, String> {
    let (repo_path, branch) = get_workspace_repo_path(&workspace_id, &db).await?;

    let json_str = run_gh(
        &[
            "pr", "checks", &branch, "--json",
            "name,state,startedAt,completedAt,detailsUrl",
        ],
        &repo_path,
    )?;

    let vals: Vec<serde_json::Value> =
        serde_json::from_str(&json_str).map_err(|e| e.to_string())?;

    let checks = vals
        .iter()
        .map(|v| CheckRun {
            name: v["name"].as_str().unwrap_or("").to_string(),
            status: v["state"].as_str().unwrap_or("").to_string(),
            conclusion: v["state"].as_str().unwrap_or("").to_string(),
            started_at: v["startedAt"].as_str().unwrap_or("").to_string(),
            completed_at: v["completedAt"].as_str().unwrap_or("").to_string(),
            url: v["detailsUrl"].as_str().unwrap_or("").to_string(),
        })
        .collect();

    Ok(checks)
}

#[tauri::command]
pub async fn get_workflow_runs(
    workspace_id: String,
    db: State<'_, DbPool>,
) -> Result<Vec<WorkflowRun>, String> {
    let (repo_path, branch) = get_workspace_repo_path(&workspace_id, &db).await?;

    let json_str = run_gh(
        &[
            "run", "list", "--branch", &branch, "--json",
            "databaseId,name,status,conclusion,headBranch,createdAt,updatedAt,url",
            "--limit", "10",
        ],
        &repo_path,
    )?;

    let vals: Vec<serde_json::Value> =
        serde_json::from_str(&json_str).map_err(|e| e.to_string())?;

    let runs = vals
        .iter()
        .map(|v| WorkflowRun {
            id: v["databaseId"].as_u64().unwrap_or(0),
            name: v["name"].as_str().unwrap_or("").to_string(),
            status: v["status"].as_str().unwrap_or("").to_string(),
            conclusion: v["conclusion"].as_str().unwrap_or("").to_string(),
            head_branch: v["headBranch"].as_str().unwrap_or("").to_string(),
            created_at: v["createdAt"].as_str().unwrap_or("").to_string(),
            updated_at: v["updatedAt"].as_str().unwrap_or("").to_string(),
            url: v["url"].as_str().unwrap_or("").to_string(),
            jobs: vec![],
        })
        .collect();

    Ok(runs)
}

#[tauri::command]
pub async fn rerun_workflow(
    run_id: String,
    workspace_id: String,
    db: State<'_, DbPool>,
) -> Result<(), String> {
    let (repo_path, _) = get_workspace_repo_path(&workspace_id, &db).await?;
    run_gh(&["run", "rerun", &run_id], &repo_path)?;
    Ok(())
}

#[tauri::command]
pub async fn get_pr_comments(
    workspace_id: String,
    db: State<'_, DbPool>,
) -> Result<Vec<PrComment>, String> {
    let (repo_path, branch) = get_workspace_repo_path(&workspace_id, &db).await?;

    let json_str = run_gh(
        &[
            "api",
            &format!(
                "repos/{{owner}}/{{repo}}/pulls/$(gh pr view {branch} --json number --jq .number)/comments"
            ),
        ],
        &repo_path,
    );

    // Fallback: use gh pr view for comments
    let json_str = match json_str {
        Ok(s) => s,
        Err(_) => run_gh(
            &["pr", "view", &branch, "--json", "comments"],
            &repo_path,
        )?,
    };

    let val: serde_json::Value =
        serde_json::from_str(&json_str).map_err(|e| e.to_string())?;

    let comments_arr = if val.is_array() {
        val.as_array().cloned().unwrap_or_default()
    } else {
        val["comments"].as_array().cloned().unwrap_or_default()
    };

    let comments = comments_arr
        .iter()
        .map(|c| PrComment {
            id: c["id"].as_u64().unwrap_or(0),
            author: c["author"]["login"]
                .as_str()
                .or_else(|| c["user"]["login"].as_str())
                .unwrap_or("")
                .to_string(),
            body: c["body"].as_str().unwrap_or("").to_string(),
            path: c["path"].as_str().unwrap_or("").to_string(),
            line: c["line"].as_u64().unwrap_or(0) as u32,
            created_at: c["createdAt"]
                .as_str()
                .or_else(|| c["created_at"].as_str())
                .unwrap_or("")
                .to_string(),
            in_reply_to_id: c["in_reply_to_id"].as_u64(),
        })
        .collect();

    Ok(comments)
}

#[tauri::command]
pub async fn detect_github_enterprise() -> Result<String, String> {
    let output = Command::new("gh")
        .args(["auth", "status"])
        .output()
        .map_err(|e| format!("Failed to run gh: {e}"))?;

    let combined = format!(
        "{}{}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    );

    // Look for hostname in output
    for line in combined.lines() {
        if line.contains("Logged in to") {
            let parts: Vec<&str> = line.split_whitespace().collect();
            for (i, part) in parts.iter().enumerate() {
                if *part == "to" {
                    if let Some(host) = parts.get(i + 1) {
                        let host = host.trim_end_matches(|c: char| !c.is_alphanumeric() && c != '.' && c != '-');
                        return Ok(host.to_string());
                    }
                }
            }
        }
    }

    Ok("github.com".to_string())
}

// --- GitHub Device Flow OAuth ---

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DeviceFlowResponse {
    pub device_code: String,
    pub user_code: String,
    pub verification_uri: String,
    pub expires_in: u64,
    pub interval: u64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DeviceFlowTokenResponse {
    pub access_token: Option<String>,
    pub token_type: Option<String>,
    pub scope: Option<String>,
    pub error: Option<String>,
    pub error_description: Option<String>,
}

/// Start GitHub Device Flow OAuth. Returns a user code and verification URL.
#[tauri::command]
pub async fn github_device_flow_start(
    client_id: String,
) -> Result<DeviceFlowResponse, String> {
    let output = Command::new("curl")
        .args([
            "-s",
            "-X", "POST",
            "https://github.com/login/device/code",
            "-H", "Accept: application/json",
            "-d", &format!("client_id={}&scope=repo,read:org", client_id),
        ])
        .output()
        .map_err(|e| format!("Failed to start device flow: {e}"))?;

    if !output.status.success() {
        return Err("Device flow request failed".to_string());
    }

    let body = String::from_utf8_lossy(&output.stdout);
    serde_json::from_str(&body).map_err(|e| format!("Failed to parse response: {e}"))
}

/// Poll for the device flow token. Returns the token once the user has authorized.
#[tauri::command]
pub async fn github_device_flow_poll(
    client_id: String,
    device_code: String,
) -> Result<DeviceFlowTokenResponse, String> {
    let output = Command::new("curl")
        .args([
            "-s",
            "-X", "POST",
            "https://github.com/login/oauth/access_token",
            "-H", "Accept: application/json",
            "-d", &format!(
                "client_id={}&device_code={}&grant_type=urn:ietf:params:oauth:grant-type:device_code",
                client_id, device_code
            ),
        ])
        .output()
        .map_err(|e| format!("Failed to poll device flow: {e}"))?;

    if !output.status.success() {
        return Err("Device flow poll failed".to_string());
    }

    let body = String::from_utf8_lossy(&output.stdout);
    serde_json::from_str(&body).map_err(|e| format!("Failed to parse response: {e}"))
}

// --- PR Body Generation ---

/// Generate a PR body from the workspace diff. Returns a structured PR body
/// with summary of changes.
#[tauri::command]
pub async fn generate_pr_body(
    workspace_id: String,
    db: State<'_, DbPool>,
) -> Result<String, String> {
    let (repo_path, branch) = get_workspace_repo_path(&workspace_id, &db).await?;

    // Get the worktree path and target branch
    let (worktree_path, target_branch): (String, String) = sqlx::query_as(
        "SELECT w.worktree_path, COALESCE(w.intended_target_branch, r.default_branch, 'main')
         FROM workspaces w JOIN repos r ON w.repo_id = r.id WHERE w.id = ?",
    )
    .bind(&workspace_id)
    .fetch_one(&db.0)
    .await
    .map_err(|e| e.to_string())?;

    // Get diff stats
    let stats = crate::git::get_diff_stats(&worktree_path, &target_branch)?;

    // Get task prompt for context
    let task_prompt: Option<String> =
        sqlx::query_scalar("SELECT task_prompt FROM workspaces WHERE id = ?")
            .bind(&workspace_id)
            .fetch_one(&db.0)
            .await
            .map_err(|e| e.to_string())?;

    // Build PR body
    let mut body = String::new();
    body.push_str("## Summary\n\n");

    if let Some(prompt) = &task_prompt {
        body.push_str(&format!("{}\n\n", prompt));
    }

    body.push_str("## Changes\n\n");
    body.push_str(&format!(
        "**{} files changed**, {} insertions(+), {} deletions(-)\n\n",
        stats.files_changed, stats.insertions, stats.deletions
    ));

    for file in &stats.files {
        let status_icon = match file.status {
            crate::git::FileChangeStatus::Added => "+",
            crate::git::FileChangeStatus::Deleted => "-",
            crate::git::FileChangeStatus::Modified => "~",
            crate::git::FileChangeStatus::Renamed => "->",
        };
        body.push_str(&format!(
            "- `{}` {} (+{}, -{})\n",
            file.path, status_icon, file.insertions, file.deletions
        ));
    }

    Ok(body)
}

// --- Clone from URL ---

/// Clone a repository from a URL and add it to Orchestra.
#[tauri::command]
pub async fn clone_repo_from_url(
    url: String,
    target_dir: Option<String>,
    app: AppHandle,
    db: State<'_, DbPool>,
) -> Result<String, String> {
    // Extract repo name from URL
    let repo_name = url
        .trim_end_matches('/')
        .rsplit('/')
        .next()
        .unwrap_or("repo")
        .trim_end_matches(".git")
        .to_string();

    let home = dirs::home_dir().ok_or("Cannot find home directory")?;
    let clone_dir = if let Some(dir) = target_dir {
        std::path::PathBuf::from(dir)
    } else {
        home.join("open-conductor").join("repos").join(&repo_name)
    };
    let clone_dir_str = clone_dir.to_string_lossy().to_string();

    // Create parent directory
    if let Some(parent) = clone_dir.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    let _ = app.emit(
        "clone:status",
        serde_json::json!({
            "url": url,
            "status": "cloning",
            "target": clone_dir_str,
        }),
    );

    // Clone using git
    let output = Command::new("git")
        .args(["clone", &url, &clone_dir_str])
        .output()
        .map_err(|e| format!("Failed to clone: {e}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let _ = app.emit(
            "clone:status",
            serde_json::json!({
                "url": url,
                "status": "failed",
                "error": stderr.to_string(),
            }),
        );
        return Err(format!("Clone failed: {stderr}"));
    }

    // Detect default branch
    let default_branch = Command::new("git")
        .args(["symbolic-ref", "--short", "HEAD"])
        .current_dir(&clone_dir_str)
        .output()
        .ok()
        .and_then(|o| {
            if o.status.success() {
                String::from_utf8(o.stdout)
                    .ok()
                    .map(|s| s.trim().to_string())
            } else {
                None
            }
        })
        .unwrap_or_else(|| "main".to_string());

    let _ = app.emit(
        "clone:status",
        serde_json::json!({
            "url": url,
            "status": "completed",
            "path": clone_dir_str,
            "default_branch": default_branch,
        }),
    );

    Ok(clone_dir_str)
}
