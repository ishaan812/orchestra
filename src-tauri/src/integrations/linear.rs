use crate::db::DbPool;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LinearIssue {
    pub id: String,
    pub identifier: String,
    pub title: String,
    pub state_name: String,
    pub priority: u8,
    pub url: String,
}

async fn linear_graphql(api_key: &str, query: &str) -> Result<serde_json::Value, String> {
    // Use a simple HTTP request via curl since we don't want to add reqwest
    let output = std::process::Command::new("curl")
        .args([
            "-s",
            "-X", "POST",
            "https://api.linear.app/graphql",
            "-H", &format!("Authorization: {api_key}"),
            "-H", "Content-Type: application/json",
            "-d", &serde_json::json!({ "query": query }).to_string(),
        ])
        .output()
        .map_err(|e| format!("Failed to call Linear API: {e}"))?;

    if !output.status.success() {
        return Err("Linear API request failed".to_string());
    }

    let body = String::from_utf8_lossy(&output.stdout);
    let val: serde_json::Value = serde_json::from_str(&body).map_err(|e| e.to_string())?;

    if let Some(errors) = val.get("errors") {
        return Err(format!("Linear API error: {errors}"));
    }

    Ok(val)
}

#[tauri::command]
pub async fn search_linear_issues(
    api_key: String,
    query: String,
) -> Result<Vec<LinearIssue>, String> {
    let gql = format!(
        r#"{{
            issueSearch(query: "{}", first: 20) {{
                nodes {{
                    id
                    identifier
                    title
                    state {{ name }}
                    priority
                    url
                }}
            }}
        }}"#,
        query.replace('"', r#"\""#)
    );

    let val = linear_graphql(&api_key, &gql).await?;

    let nodes = val["data"]["issueSearch"]["nodes"]
        .as_array()
        .cloned()
        .unwrap_or_default();

    let issues = nodes
        .iter()
        .map(|n| LinearIssue {
            id: n["id"].as_str().unwrap_or("").to_string(),
            identifier: n["identifier"].as_str().unwrap_or("").to_string(),
            title: n["title"].as_str().unwrap_or("").to_string(),
            state_name: n["state"]["name"].as_str().unwrap_or("").to_string(),
            priority: n["priority"].as_u64().unwrap_or(0) as u8,
            url: n["url"].as_str().unwrap_or("").to_string(),
        })
        .collect();

    Ok(issues)
}

#[tauri::command]
pub async fn link_issue_to_workspace(
    workspace_id: String,
    issue_id: String,
    issue_identifier: String,
    issue_title: String,
    db: State<'_, DbPool>,
) -> Result<(), String> {
    // Store in workspace metadata as JSON in notes or a dedicated column
    // For now, store in the workspace's task_prompt or a custom field
    sqlx::query(
        "UPDATE workspaces SET pr_description = json_object('linear_issue_id', ?1, 'linear_issue_identifier', ?2, 'linear_issue_title', ?3) WHERE id = ?4",
    )
    .bind(&issue_id)
    .bind(&issue_identifier)
    .bind(&issue_title)
    .bind(&workspace_id)
    .execute(&db.0)
    .await
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn get_linked_issue(
    workspace_id: String,
    api_key: String,
    db: State<'_, DbPool>,
) -> Result<Option<LinearIssue>, String> {
    let desc: Option<String> =
        sqlx::query_scalar("SELECT pr_description FROM workspaces WHERE id = ?")
            .bind(&workspace_id)
            .fetch_one(&db.0)
            .await
            .map_err(|e| e.to_string())?;

    let desc = match desc {
        Some(d) => d,
        None => return Ok(None),
    };

    let val: serde_json::Value = match serde_json::from_str(&desc) {
        Ok(v) => v,
        Err(_) => return Ok(None),
    };

    let issue_id = match val["linear_issue_id"].as_str() {
        Some(id) => id.to_string(),
        None => return Ok(None),
    };

    let gql = format!(
        r#"{{
            issue(id: "{}") {{
                id
                identifier
                title
                state {{ name }}
                priority
                url
            }}
        }}"#,
        issue_id
    );

    let result = linear_graphql(&api_key, &gql).await?;
    let n = &result["data"]["issue"];

    if n.is_null() {
        return Ok(None);
    }

    Ok(Some(LinearIssue {
        id: n["id"].as_str().unwrap_or("").to_string(),
        identifier: n["identifier"].as_str().unwrap_or("").to_string(),
        title: n["title"].as_str().unwrap_or("").to_string(),
        state_name: n["state"]["name"].as_str().unwrap_or("").to_string(),
        priority: n["priority"].as_u64().unwrap_or(0) as u8,
        url: n["url"].as_str().unwrap_or("").to_string(),
    }))
}
