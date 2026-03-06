-- Add provider system support

-- Add provider_id to workspaces
ALTER TABLE workspaces ADD COLUMN provider_id TEXT DEFAULT 'claude';

-- Add provider_id to sessions
ALTER TABLE sessions ADD COLUMN provider_id TEXT DEFAULT 'claude';

-- Provider settings table (per-workspace, per-provider key-value config)
CREATE TABLE IF NOT EXISTS provider_settings (
    id TEXT PRIMARY KEY NOT NULL,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    provider_id TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(workspace_id, provider_id, key)
);

-- Auto-update trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_provider_settings_updated_at
    AFTER UPDATE ON provider_settings
    FOR EACH ROW
BEGIN
    UPDATE provider_settings SET updated_at = datetime('now') WHERE id = OLD.id;
END;
