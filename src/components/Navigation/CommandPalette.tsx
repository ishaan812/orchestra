import { useEffect, useMemo, useState } from "react";
import { Command } from "cmdk";
import { useWorkspaceStore } from "../../hooks/useWorkspaces";

interface CommandAction {
  id: string;
  label: string;
  category: "Workspaces" | "Actions" | "Settings" | "Navigation";
  onSelect: () => void;
  keywords?: string;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onNewWorkspace: () => void;
  onSelectWorkspace: (id: string) => void;
  onToggleLeftSidebar?: () => void;
  onToggleRightSidebar?: () => void;
  onZenMode?: () => void;
  onOpenSettings?: () => void;
}

export function CommandPalette({
  open,
  onClose,
  onNewWorkspace,
  onSelectWorkspace,
  onToggleLeftSidebar,
  onToggleRightSidebar,
  onZenMode,
  onOpenSettings,
}: CommandPaletteProps) {
  const [search, setSearch] = useState("");
  const { workspaces } = useWorkspaceStore();

  // Reset search on open
  useEffect(() => {
    if (open) setSearch("");
  }, [open]);

  const allWorkspaces = useMemo(
    () => [
      ...workspaces.backlog,
      ...workspaces.in_progress,
      ...workspaces.in_review,
      ...workspaces.done,
    ],
    [workspaces]
  );

  const actions: CommandAction[] = useMemo(() => {
    const items: CommandAction[] = [];

    // Workspace items
    for (const ws of allWorkspaces) {
      items.push({
        id: `ws-${ws.id}`,
        label: ws.name,
        category: "Workspaces",
        keywords: `${ws.branch_name} ${ws.task_prompt ?? ""}`,
        onSelect: () => {
          onSelectWorkspace(ws.id);
          onClose();
        },
      });
    }

    // Actions
    items.push({
      id: "new-workspace",
      label: "New Workspace",
      category: "Actions",
      keywords: "create add",
      onSelect: () => {
        onNewWorkspace();
        onClose();
      },
    });

    if (onToggleLeftSidebar) {
      items.push({
        id: "toggle-left-sidebar",
        label: "Toggle Left Sidebar",
        category: "Navigation",
        keywords: "panel hide show",
        onSelect: () => {
          onToggleLeftSidebar();
          onClose();
        },
      });
    }

    if (onToggleRightSidebar) {
      items.push({
        id: "toggle-right-sidebar",
        label: "Toggle Right Sidebar",
        category: "Navigation",
        keywords: "panel hide show",
        onSelect: () => {
          onToggleRightSidebar();
          onClose();
        },
      });
    }

    if (onZenMode) {
      items.push({
        id: "zen-mode",
        label: "Zen Mode",
        category: "Navigation",
        keywords: "focus distraction free",
        onSelect: () => {
          onZenMode();
          onClose();
        },
      });
    }

    if (onOpenSettings) {
      items.push({
        id: "settings",
        label: "Open Settings",
        category: "Settings",
        keywords: "preferences config",
        onSelect: () => {
          onOpenSettings();
          onClose();
        },
      });
    }

    return items;
  }, [allWorkspaces, onNewWorkspace, onSelectWorkspace, onClose, onToggleLeftSidebar, onToggleRightSidebar, onZenMode, onOpenSettings]);

  if (!open) return null;

  const grouped = new Map<string, CommandAction[]>();
  for (const action of actions) {
    const list = grouped.get(action.category) ?? [];
    list.push(action);
    grouped.set(action.category, list);
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "20vh",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <Command
        style={{
          width: 520,
          backgroundColor: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          overflow: "hidden",
          boxShadow: "0 16px 48px rgba(0, 0, 0, 0.3)",
        }}
        shouldFilter={true}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
        }}
      >
        <Command.Input
          value={search}
          onValueChange={setSearch}
          placeholder="Search workspaces, actions..."
          style={{
            width: "100%",
            padding: "var(--space-3) var(--space-4)",
            backgroundColor: "transparent",
            border: "none",
            borderBottom: "1px solid var(--border-subtle)",
            color: "var(--text-primary)",
            fontSize: "var(--font-size-md)",
            fontFamily: "var(--font-sans)",
            outline: "none",
          }}
          autoFocus
        />

        <Command.List
          style={{
            maxHeight: 320,
            overflow: "auto",
            padding: "var(--space-1)",
          }}
        >
          <Command.Empty
            style={{
              padding: "var(--space-4)",
              color: "var(--text-tertiary)",
              fontSize: "var(--font-size-sm)",
              textAlign: "center",
            }}
          >
            No results found.
          </Command.Empty>

          {Array.from(grouped.entries()).map(([category, items]) => (
            <Command.Group
              key={category}
              heading={category}
              style={{ padding: "var(--space-1) 0" }}
            >
              {items.map((item) => (
                <Command.Item
                  key={item.id}
                  value={`${item.label} ${item.keywords ?? ""}`}
                  onSelect={item.onSelect}
                  style={{
                    padding: "var(--space-2) var(--space-3)",
                    borderRadius: "var(--radius-sm)",
                    cursor: "pointer",
                    color: "var(--text-primary)",
                    fontSize: "var(--font-size-sm)",
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-2)",
                  }}
                >
                  <CategoryIcon category={item.category} />
                  {item.label}
                </Command.Item>
              ))}
            </Command.Group>
          ))}
        </Command.List>
      </Command>
    </div>
  );
}

function CategoryIcon({ category }: { category: string }) {
  const icons: Record<string, string> = {
    Workspaces: "◎",
    Actions: "▸",
    Settings: "⚙",
    Navigation: "↔",
  };
  return (
    <span
      style={{
        color: "var(--text-tertiary)",
        fontSize: "var(--font-size-xs)",
        width: 16,
        textAlign: "center",
      }}
    >
      {icons[category] ?? "·"}
    </span>
  );
}
