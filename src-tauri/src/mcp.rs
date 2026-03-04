use rmcp::handler::server::router::tool::ToolRouter;
use rmcp::handler::server::wrapper::Parameters;
use rmcp::{tool, tool_handler, tool_router, ErrorData as McpError, ServerHandler};
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

/// MCP server providing workspace tools to AI agents.
/// Each workspace session gets its own instance.
#[derive(Debug, Clone)]
pub struct OrchestraMcp {
    tool_router: ToolRouter<Self>,
    worktree_path: PathBuf,
    workspace_id: String,
    session_id: String,
    db_url: String,
}

impl OrchestraMcp {
    pub fn new(
        worktree_path: PathBuf,
        workspace_id: String,
        session_id: String,
        db_url: String,
    ) -> Self {
        Self {
            tool_router: Self::tool_router(),
            worktree_path,
            workspace_id,
            session_id,
            db_url,
        }
    }
}

// --- Tool argument schemas ---

#[derive(Debug, Deserialize, JsonSchema)]
pub struct GetWorkspaceDiffArgs {
    #[schemars(description = "Base branch to diff against (defaults to main)")]
    pub base_branch: Option<String>,
}

#[derive(Debug, Deserialize, JsonSchema)]
pub struct GetTerminalOutputArgs {
    #[schemars(description = "Number of lines to return (default 100)")]
    pub lines: Option<u32>,
}

#[derive(Debug, Deserialize, JsonSchema)]
pub struct AskUserQuestionArgs {
    #[schemars(description = "The question to ask the user")]
    pub question: String,
    #[schemars(description = "Optional list of choices")]
    pub options: Option<Vec<String>>,
}

#[derive(Debug, Deserialize, JsonSchema)]
pub struct DiffCommentArgs {
    #[schemars(description = "File path relative to worktree")]
    pub file_path: String,
    #[schemars(description = "Line number in the file")]
    pub line_number: u32,
    #[schemars(description = "Comment body")]
    pub body: String,
}

#[derive(Debug, Deserialize, JsonSchema)]
pub struct ExitPlanModeArgs {
    #[schemars(description = "Optional plan content")]
    pub plan: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, JsonSchema)]
pub struct FileEdit {
    #[schemars(description = "File path relative to worktree")]
    pub path: String,
    #[schemars(description = "Text to find")]
    pub old_text: String,
    #[schemars(description = "Replacement text")]
    pub new_text: String,
}

#[derive(Debug, Deserialize, JsonSchema)]
pub struct MultiEditArgs {
    #[schemars(description = "List of file edits to apply atomically")]
    pub edits: Vec<FileEdit>,
}

#[derive(Debug, Deserialize, JsonSchema)]
pub struct NotebookEditArgs {
    #[schemars(description = "Path to the Jupyter notebook")]
    pub notebook_path: String,
    #[schemars(description = "Cell number (0-indexed)")]
    pub cell_number: u32,
    #[schemars(description = "New cell source content")]
    pub new_source: String,
    #[schemars(description = "Edit mode: replace, insert, or delete")]
    pub edit_mode: String,
}

const MAX_RESPONSE_CHARS: usize = 100_000;

fn truncate_response(s: String) -> String {
    if s.len() > MAX_RESPONSE_CHARS {
        format!(
            "{}...\n[TRUNCATED: response exceeded {} chars]",
            &s[..MAX_RESPONSE_CHARS],
            MAX_RESPONSE_CHARS
        )
    } else {
        s
    }
}

fn mcp_err(msg: impl std::fmt::Display) -> McpError {
    McpError::new(rmcp::model::ErrorCode::INTERNAL_ERROR, msg.to_string(), None)
}

fn mcp_invalid(msg: impl std::fmt::Display) -> McpError {
    McpError::new(rmcp::model::ErrorCode::INVALID_PARAMS, msg.to_string(), None)
}

#[tool_router]
impl OrchestraMcp {
    /// Get the current diff for the workspace against its base branch
    #[tool(description = "Returns the current git diff for this workspace against the base branch")]
    async fn get_workspace_diff(
        &self,
        Parameters(args): Parameters<GetWorkspaceDiffArgs>,
    ) -> Result<String, McpError> {
        let base = args.base_branch.unwrap_or_else(|| "main".to_string());
        let path = self.worktree_path.to_string_lossy();
        crate::git::get_full_diff(&path, &base)
            .map(truncate_response)
            .map_err(mcp_err)
    }

    /// Get the last N lines of terminal output for this workspace
    #[tool(description = "Returns the last N lines of terminal output (default 100)")]
    async fn get_terminal_output(
        &self,
        Parameters(args): Parameters<GetTerminalOutputArgs>,
    ) -> Result<String, McpError> {
        let _lines = args.lines.unwrap_or(100);
        // Terminal buffer will be implemented in Phase 6
        Ok(format!(
            "[Terminal output for workspace {} not yet available]",
            self.workspace_id
        ))
    }

    /// Ask the user a question and wait for response
    #[tool(description = "Ask the user a question with optional choices. Blocks until response.")]
    async fn ask_user_question(
        &self,
        Parameters(args): Parameters<AskUserQuestionArgs>,
    ) -> Result<String, McpError> {
        // Will emit Tauri event and block on response channel in production
        let _ = &args.options;
        Ok(format!(
            "[AskUserQuestion: \"{}\"] — UI integration pending",
            args.question
        ))
    }

    /// Add a comment on a specific line of a diff
    #[tool(description = "Add a comment on a specific file and line in the workspace diff")]
    async fn diff_comment(
        &self,
        Parameters(args): Parameters<DiffCommentArgs>,
    ) -> Result<String, McpError> {
        let pool = sqlx::SqlitePool::connect(&self.db_url)
            .await
            .map_err(mcp_err)?;

        let id = uuid::Uuid::new_v4().to_string();
        let location = serde_json::json!({
            "file_path": args.file_path,
            "line_number": args.line_number,
        })
        .to_string();

        sqlx::query(
            "INSERT INTO diff_comments (id, workspace_id, body, state, location, author)
             VALUES (?, ?, ?, 'draft', ?, 'claude')",
        )
        .bind(&id)
        .bind(&self.workspace_id)
        .bind(&args.body)
        .bind(&location)
        .execute(&pool)
        .await
        .map_err(mcp_err)?;

        Ok(format!(
            "Comment added on {}:{}",
            args.file_path, args.line_number
        ))
    }

    /// Enter plan mode
    #[tool(description = "Switch the session to plan mode")]
    async fn enter_plan_mode(&self) -> Result<String, McpError> {
        let pool = sqlx::SqlitePool::connect(&self.db_url)
            .await
            .map_err(mcp_err)?;

        sqlx::query("UPDATE sessions SET permission_mode = 'plan' WHERE id = ?")
            .bind(&self.session_id)
            .execute(&pool)
            .await
            .map_err(mcp_err)?;

        Ok("Entered plan mode".to_string())
    }

    /// Exit plan mode
    #[tool(description = "Exit plan mode, optionally providing a plan")]
    async fn exit_plan_mode(
        &self,
        Parameters(args): Parameters<ExitPlanModeArgs>,
    ) -> Result<String, McpError> {
        let pool = sqlx::SqlitePool::connect(&self.db_url)
            .await
            .map_err(mcp_err)?;

        sqlx::query("UPDATE sessions SET permission_mode = 'default' WHERE id = ?")
            .bind(&self.session_id)
            .execute(&pool)
            .await
            .map_err(mcp_err)?;

        match args.plan {
            Some(plan) => Ok(format!("Exited plan mode. Plan:\n{plan}")),
            None => Ok("Exited plan mode".to_string()),
        }
    }

    /// Apply multiple file edits atomically
    #[tool(description = "Apply multiple find-and-replace edits across files")]
    async fn multi_edit(
        &self,
        Parameters(args): Parameters<MultiEditArgs>,
    ) -> Result<String, McpError> {
        let mut applied = 0;

        for edit in &args.edits {
            let full_path = self.worktree_path.join(&edit.path);
            let content = std::fs::read_to_string(&full_path)
                .map_err(|e| mcp_err(format!("Failed to read {}: {}", edit.path, e)))?;

            if !content.contains(&edit.old_text) {
                return Err(mcp_invalid(format!("old_text not found in {}", edit.path)));
            }

            let new_content = content.replacen(&edit.old_text, &edit.new_text, 1);
            std::fs::write(&full_path, new_content)
                .map_err(|e| mcp_err(format!("Failed to write {}: {}", edit.path, e)))?;

            applied += 1;
        }

        Ok(format!("Applied {applied} edits"))
    }

    /// Edit a Jupyter notebook cell
    #[tool(description = "Edit a Jupyter notebook cell (replace, insert, or delete)")]
    async fn notebook_edit(
        &self,
        Parameters(args): Parameters<NotebookEditArgs>,
    ) -> Result<String, McpError> {
        let full_path = self.worktree_path.join(&args.notebook_path);
        let content = std::fs::read_to_string(&full_path)
            .map_err(|e| mcp_err(format!("Failed to read notebook: {e}")))?;

        let mut notebook: serde_json::Value =
            serde_json::from_str(&content).map_err(|e| mcp_err(format!("Invalid notebook JSON: {e}")))?;

        let cells = notebook
            .get_mut("cells")
            .and_then(|c| c.as_array_mut())
            .ok_or_else(|| mcp_err("No cells array in notebook"))?;

        let idx = args.cell_number as usize;

        match args.edit_mode.as_str() {
            "replace" => {
                let cell = cells
                    .get_mut(idx)
                    .ok_or_else(|| mcp_invalid("Cell index out of range"))?;
                let lines: Vec<String> = args.new_source.lines().map(|l| format!("{l}\n")).collect();
                cell["source"] = serde_json::json!(lines);
            }
            "insert" => {
                let new_cell = serde_json::json!({
                    "cell_type": "code",
                    "source": args.new_source.lines().map(|l| format!("{l}\n")).collect::<Vec<_>>(),
                    "metadata": {},
                    "outputs": [],
                    "execution_count": null
                });
                if idx >= cells.len() {
                    cells.push(new_cell);
                } else {
                    cells.insert(idx, new_cell);
                }
            }
            "delete" => {
                if idx >= cells.len() {
                    return Err(mcp_invalid("Cell index out of range"));
                }
                cells.remove(idx);
            }
            mode => {
                return Err(mcp_invalid(format!("Unknown edit_mode: {mode}")));
            }
        }

        let output = serde_json::to_string_pretty(&notebook).map_err(mcp_err)?;
        std::fs::write(&full_path, output)
            .map_err(|e| mcp_err(format!("Failed to write notebook: {e}")))?;

        Ok(format!(
            "Notebook cell {} {}d",
            args.cell_number, args.edit_mode
        ))
    }
}

#[tool_handler(router = self.tool_router)]
impl ServerHandler for OrchestraMcp {}

/// Write the MCP config JSON for Claude Code to connect to our server.
pub fn write_mcp_config(
    worktree_path: &std::path::Path,
    session_id: &str,
) -> Result<PathBuf, String> {
    let config_dir = worktree_path.join(".orchestra");
    std::fs::create_dir_all(&config_dir).map_err(|e| e.to_string())?;

    let config_path = config_dir.join("mcp.json");
    let exe = std::env::current_exe().map_err(|e| e.to_string())?;
    let config = serde_json::json!({
        "mcpServers": {
            "orchestra": {
                "command": exe.to_string_lossy(),
                "args": ["--mcp-server", "--session-id", session_id],
                "env": {}
            }
        }
    });

    std::fs::write(
        &config_path,
        serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?,
    )
    .map_err(|e| e.to_string())?;

    Ok(config_path)
}
