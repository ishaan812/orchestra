-- SSH connections support

CREATE TABLE IF NOT EXISTS ssh_connections (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    host TEXT NOT NULL,
    port INTEGER NOT NULL DEFAULT 22,
    username TEXT NOT NULL,
    auth_type TEXT NOT NULL DEFAULT 'key',
    private_key_path TEXT,
    use_agent INTEGER NOT NULL DEFAULT 0,
    last_connected_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Auto-update trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_ssh_connections_updated_at
    AFTER UPDATE ON ssh_connections
    FOR EACH ROW
BEGIN
    UPDATE ssh_connections SET updated_at = datetime('now') WHERE id = OLD.id;
END;
