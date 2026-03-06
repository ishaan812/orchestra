interface TabBarProps {
  tabs: { id: string; label: string }[];
  activeTabId: string | null;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  onHome: () => void;
  isHomeActive: boolean;
  onToggleLeftSidebar?: () => void;
  onToggleRightSidebar?: () => void;
  onSettings?: () => void;
}

export function TabBar({
  tabs,
  activeTabId,
  onSelect,
  onClose,
  onHome,
  isHomeActive,
  onToggleLeftSidebar,
  onToggleRightSidebar,
  onSettings,
}: TabBarProps) {
  return (
    <div
      data-tauri-drag-region
      style={{
        display: "flex",
        alignItems: "center",
        height: 38,
        borderBottom: "1px solid var(--border-subtle)",
        backgroundColor: "var(--bg-surface)",
        flexShrink: 0,
        paddingLeft: 78, /* macOS traffic lights */
        gap: 0,
      }}
    >
      {/* Workspace tabs */}
      <div
        style={{
          display: "flex",
          alignItems: "stretch",
          height: "100%",
          flex: 1,
          overflow: "hidden",
        }}
      >
        {/* Home tab */}
        <button
          onClick={onHome}
          style={{
            padding: "0 var(--space-4)",
            background: isHomeActive ? "var(--bg-base)" : "transparent",
            border: "none",
            borderBottom: isHomeActive
              ? "2px solid var(--accent-primary)"
              : "2px solid transparent",
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

        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <div
              key={tab.id}
              style={{
                display: "flex",
                alignItems: "center",
                borderBottom: isActive
                  ? "2px solid var(--accent-primary)"
                  : "2px solid transparent",
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
                  maxWidth: 180,
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
                  opacity: isActive ? 1 : 0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = "1";
                  e.currentTarget.style.backgroundColor = "var(--bg-surface-hover)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = isActive ? "1" : "0";
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

      {/* Right-side toolbar buttons */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-1)",
          padding: "0 var(--space-3)",
          flexShrink: 0,
        }}
      >
        {onToggleLeftSidebar && (
          <ToolbarButton title="Toggle sidebar" onClick={onToggleLeftSidebar}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="1" y="2" width="14" height="12" rx="1" />
              <line x1="5" y1="2" x2="5" y2="14" />
            </svg>
          </ToolbarButton>
        )}
        {onToggleRightSidebar && (
          <ToolbarButton title="Toggle right panel" onClick={onToggleRightSidebar}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="1" y="2" width="14" height="12" rx="1" />
              <line x1="11" y1="2" x2="11" y2="14" />
            </svg>
          </ToolbarButton>
        )}
        {onSettings && (
          <ToolbarButton title="Settings" onClick={onSettings}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 10a2 2 0 100-4 2 2 0 000 4zm6.32-1.906l-1.12-.65a5.07 5.07 0 000-2.888l1.12-.65a.5.5 0 00.183-.683l-1-1.732a.5.5 0 00-.683-.183l-1.12.65a5.07 5.07 0 00-2.5-1.444V.5a.5.5 0 00-.5-.5h-2a.5.5 0 00-.5.5v1.014a5.07 5.07 0 00-2.5 1.444l-1.12-.65a.5.5 0 00-.683.183l-1 1.732a.5.5 0 00.183.683l1.12.65a5.07 5.07 0 000 2.888l-1.12.65a.5.5 0 00-.183.683l1 1.732a.5.5 0 00.683.183l1.12-.65a5.07 5.07 0 002.5 1.444V15.5a.5.5 0 00.5.5h2a.5.5 0 00.5-.5v-1.014a5.07 5.07 0 002.5-1.444l1.12.65a.5.5 0 00.683-.183l1-1.732a.5.5 0 00-.183-.683z" />
            </svg>
          </ToolbarButton>
        )}
      </div>
    </div>
  );
}

function ToolbarButton({
  children,
  title,
  onClick,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        padding: "var(--space-1)",
        background: "none",
        border: "none",
        color: "var(--text-tertiary)",
        cursor: "pointer",
        borderRadius: "var(--radius-sm)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = "var(--bg-surface-hover)";
        e.currentTarget.style.color = "var(--text-primary)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "transparent";
        e.currentTarget.style.color = "var(--text-tertiary)";
      }}
    >
      {children}
    </button>
  );
}
