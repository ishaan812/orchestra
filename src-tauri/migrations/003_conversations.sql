-- Multi-conversation per task (workspace)

-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY NOT NULL,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    title TEXT,
    provider_id TEXT DEFAULT 'claude',
    is_active INTEGER NOT NULL DEFAULT 1,
    is_main INTEGER NOT NULL DEFAULT 0,
    display_order INTEGER NOT NULL DEFAULT 0,
    metadata TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Add conversation_id to sessions
ALTER TABLE sessions ADD COLUMN conversation_id TEXT REFERENCES conversations(id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_conversations_workspace_id ON conversations(workspace_id);

-- Auto-update trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_conversations_updated_at
    AFTER UPDATE ON conversations
    FOR EACH ROW
BEGIN
    UPDATE conversations SET updated_at = datetime('now') WHERE id = OLD.id;
END;
