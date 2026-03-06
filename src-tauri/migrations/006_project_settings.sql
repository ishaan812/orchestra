-- Per-project settings

CREATE TABLE IF NOT EXISTS project_settings (
    id TEXT PRIMARY KEY NOT NULL,
    repo_id TEXT NOT NULL REFERENCES repos(id) ON DELETE CASCADE,
    base_ref TEXT,
    branch_prefix TEXT,
    push_on_create INTEGER NOT NULL DEFAULT 0,
    auto_start_agent INTEGER NOT NULL DEFAULT 1,
    default_provider_id TEXT DEFAULT 'claude',
    setup_script TEXT,
    run_script TEXT,
    teardown_script TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(repo_id)
);

-- Auto-update trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_project_settings_updated_at
    AFTER UPDATE ON project_settings
    FOR EACH ROW
BEGIN
    UPDATE project_settings SET updated_at = datetime('now') WHERE id = OLD.id;
END;
