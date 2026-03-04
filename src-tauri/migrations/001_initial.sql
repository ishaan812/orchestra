-- Orchestra initial schema

-- Repos table
CREATE TABLE IF NOT EXISTS repos (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    path TEXT NOT NULL UNIQUE,
    remote_url TEXT,
    default_branch TEXT NOT NULL DEFAULT 'main',
    remote TEXT NOT NULL DEFAULT 'origin',
    storage_version INTEGER NOT NULL DEFAULT 1,
    display_order INTEGER NOT NULL DEFAULT 0,
    conductor_config TEXT,
    archive_script TEXT,
    run_script_mode TEXT NOT NULL DEFAULT 'concurrent',
    custom_prompt_code_review TEXT,
    custom_prompt_create_pr TEXT,
    custom_prompt_rename_branch TEXT,
    custom_prompt_general TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Workspaces table
CREATE TABLE IF NOT EXISTS workspaces (
    id TEXT PRIMARY KEY NOT NULL,
    repo_id TEXT NOT NULL REFERENCES repos(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    branch_name TEXT NOT NULL,
    worktree_path TEXT NOT NULL,
    state TEXT NOT NULL DEFAULT 'initializing',
    derived_status TEXT NOT NULL DEFAULT 'in-progress',
    manual_status TEXT,
    task_prompt TEXT,
    agent_type TEXT,
    model TEXT,
    unread INTEGER NOT NULL DEFAULT 0,
    pinned_at TEXT,
    big_terminal_mode INTEGER NOT NULL DEFAULT 0,
    initialization_parent_branch TEXT,
    intended_target_branch TEXT,
    linked_workspace_ids TEXT,
    notes TEXT,
    archive_commit TEXT,
    pr_title TEXT,
    pr_description TEXT,
    setup_log_path TEXT,
    initialization_log_path TEXT,
    initialization_files_copied INTEGER NOT NULL DEFAULT 0,
    placeholder_branch_name TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY NOT NULL,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    title TEXT,
    claude_session_id TEXT,
    agent_type TEXT NOT NULL DEFAULT 'claude',
    model TEXT,
    permission_mode TEXT NOT NULL DEFAULT 'default',
    thinking_enabled INTEGER NOT NULL DEFAULT 0,
    codex_thinking_level TEXT,
    context_used_percent REAL NOT NULL DEFAULT 0.0,
    context_token_count INTEGER NOT NULL DEFAULT 0,
    unread_count INTEGER NOT NULL DEFAULT 0,
    is_compacting INTEGER NOT NULL DEFAULT 0,
    is_hidden INTEGER NOT NULL DEFAULT 0,
    last_user_message_at TEXT,
    resume_session_at TEXT,
    freshly_compacted INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Session messages table
CREATE TABLE IF NOT EXISTS session_messages (
    id TEXT PRIMARY KEY NOT NULL,
    session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    full_message TEXT,
    model TEXT,
    sdk_message_id TEXT,
    turn_id TEXT,
    sent_at TEXT NOT NULL DEFAULT (datetime('now')),
    cancelled_at TEXT,
    last_assistant_message_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Attachments table
CREATE TABLE IF NOT EXISTS attachments (
    id TEXT PRIMARY KEY NOT NULL,
    type TEXT NOT NULL,
    original_name TEXT,
    path TEXT NOT NULL,
    is_loading INTEGER NOT NULL DEFAULT 0,
    session_id TEXT REFERENCES sessions(id) ON DELETE CASCADE,
    session_message_id TEXT REFERENCES session_messages(id) ON DELETE CASCADE,
    is_draft INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Diff comments table
CREATE TABLE IF NOT EXISTS diff_comments (
    id TEXT PRIMARY KEY NOT NULL,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    line_number INTEGER NOT NULL,
    body TEXT NOT NULL,
    state TEXT NOT NULL DEFAULT 'draft',
    location TEXT,
    remote_url TEXT,
    author TEXT,
    thread_id TEXT,
    reply_to_comment_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Settings table (key-value store)
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sessions_workspace_id ON sessions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_session_messages_sent_at ON session_messages(sent_at);
CREATE INDEX IF NOT EXISTS idx_session_messages_cancelled_at ON session_messages(cancelled_at);
CREATE INDEX IF NOT EXISTS idx_session_messages_turn_id ON session_messages(turn_id);
CREATE INDEX IF NOT EXISTS idx_attachments_session_id ON attachments(session_id);
CREATE INDEX IF NOT EXISTS idx_attachments_session_message_id ON attachments(session_message_id);
CREATE INDEX IF NOT EXISTS idx_attachments_is_draft ON attachments(is_draft);
CREATE INDEX IF NOT EXISTS idx_diff_comments_workspace ON diff_comments(workspace_id);

-- Auto-update triggers for updated_at
CREATE TRIGGER IF NOT EXISTS update_repos_updated_at
    AFTER UPDATE ON repos
    FOR EACH ROW
BEGIN
    UPDATE repos SET updated_at = datetime('now') WHERE id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS update_workspaces_updated_at
    AFTER UPDATE ON workspaces
    FOR EACH ROW
BEGIN
    UPDATE workspaces SET updated_at = datetime('now') WHERE id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS update_sessions_updated_at
    AFTER UPDATE ON sessions
    FOR EACH ROW
BEGIN
    UPDATE sessions SET updated_at = datetime('now') WHERE id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS update_settings_updated_at
    AFTER UPDATE ON settings
    FOR EACH ROW
BEGIN
    UPDATE settings SET updated_at = datetime('now') WHERE key = OLD.key;
END;

CREATE TRIGGER IF NOT EXISTS update_diff_comments_updated_at
    AFTER UPDATE ON diff_comments
    FOR EACH ROW
BEGIN
    UPDATE diff_comments SET updated_at = datetime('now') WHERE id = OLD.id;
END;
