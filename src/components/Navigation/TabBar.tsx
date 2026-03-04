interface TabBarProps {
  tabs: { id: string; label: string }[];
  activeTabId: string | null;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  onHome: () => void;
  isHomeActive: boolean;
}

export function TabBar({
  tabs,
  activeTabId,
  onSelect,
  onClose,
  onHome,
  isHomeActive,
}: TabBarProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "stretch",
        height: 36,
        borderBottom: "1px solid var(--border-subtle)",
        backgroundColor: "var(--bg-surface)",
        overflowX: "auto",
        flexShrink: 0,
      }}
    >
      {/* Home tab */}
      <button
        onClick={onHome}
        style={{
          padding: "0 var(--space-4)",
          background: isHomeActive ? "var(--bg-base)" : "transparent",
          border: "none",
          borderBottom: isHomeActive ? "2px solid var(--accent-primary)" : "2px solid transparent",
          color: isHomeActive ? "var(--text-primary)" : "var(--text-secondary)",
          fontSize: "var(--font-size-sm)",
          fontWeight: isHomeActive ? 600 : 400,
          cursor: "pointer",
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}
      >
        Home
      </button>

      {/* Workspace tabs */}
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            style={{
              display: "flex",
              alignItems: "center",
              borderBottom: isActive ? "2px solid var(--accent-primary)" : "2px solid transparent",
              background: isActive ? "var(--bg-base)" : "transparent",
              flexShrink: 0,
            }}
          >
            <button
              onClick={() => onSelect(tab.id)}
              style={{
                padding: "0 var(--space-3)",
                background: "none",
                border: "none",
                color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                fontSize: "var(--font-size-sm)",
                cursor: "pointer",
                whiteSpace: "nowrap",
                maxWidth: 160,
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
              title={tab.label}
            >
              {tab.label}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose(tab.id);
              }}
              style={{
                padding: "2px 6px",
                background: "none",
                border: "none",
                color: "var(--text-tertiary)",
                fontSize: "var(--font-size-xs)",
                cursor: "pointer",
                lineHeight: 1,
                borderRadius: "var(--radius-sm)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "var(--bg-surface-hover)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
              title="Close tab"
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}
