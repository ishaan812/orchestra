import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { useState, useCallback, useEffect, useMemo } from "react";
import { Sidebar } from "./components/Sidebar/Sidebar";
import { NewWorkspaceDialog } from "./components/Sidebar/NewWorkspaceDialog";
import { TabBar } from "./components/Navigation/TabBar";
import { WorkspaceView } from "./components/Chat/WorkspaceView";
import { RightPanel } from "./components/Review/RightPanel";
import { CommandPalette } from "./components/Navigation/CommandPalette";
import { FilePicker } from "./components/Navigation/FilePicker";
import { WorkspaceSearch } from "./components/Navigation/WorkspaceSearch";
import { ShortcutsHelp } from "./components/Navigation/ShortcutsHelp";
import { useRepoStore } from "./hooks/useRepos";
import { useWorkspaceStore } from "./hooks/useWorkspaces";
import { useKeyboard, type ShortcutDef } from "./hooks/useKeyboard";
import { open } from "@tauri-apps/plugin-dialog";

const LAYOUT_KEY = "open-conductor-panel-layout";
const RIGHT_COLLAPSED_KEY = "open-conductor-right-collapsed";
const LEFT_COLLAPSED_KEY = "open-conductor-left-collapsed";

function App() {
  const { repos, selectedRepoId, setSelectedRepoId, fetchRepos, addRepo } =
    useRepoStore();
  const {
    workspaces,
    activeWorkspaceId,
    openTabs,
    fetchWorkspaces,
    createWorkspace,
    setActiveWorkspaceId,
    closeTab,
  } = useWorkspaceStore();

  const [rightCollapsed, setRightCollapsed] = useState(() => {
    try {
      return localStorage.getItem(RIGHT_COLLAPSED_KEY) === "true";
    } catch {
      return false;
    }
  });

  const [leftCollapsed, setLeftCollapsed] = useState(() => {
    try {
      return localStorage.getItem(LEFT_COLLAPSED_KEY) === "true";
    } catch {
      return false;
    }
  });

  const [showNewWorkspace, setShowNewWorkspace] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showFilePicker, setShowFilePicker] = useState(false);
  const [showWorkspaceSearch, setShowWorkspaceSearch] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);

  useEffect(() => {
    fetchRepos();
  }, [fetchRepos]);

  useEffect(() => {
    if (selectedRepoId) {
      fetchWorkspaces(selectedRepoId);
    }
  }, [selectedRepoId, fetchWorkspaces]);

  const handleLayout = useCallback((sizes: number[]) => {
    try {
      localStorage.setItem(LAYOUT_KEY, JSON.stringify(sizes));
    } catch {
      // ignore
    }
  }, []);

  const defaultLayout = useMemo(() => {
    try {
      const stored = localStorage.getItem(LAYOUT_KEY);
      if (stored) return JSON.parse(stored) as number[];
    } catch {
      // ignore
    }
    return undefined;
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(RIGHT_COLLAPSED_KEY, String(rightCollapsed));
    } catch {
      // ignore
    }
  }, [rightCollapsed]);

  useEffect(() => {
    try {
      localStorage.setItem(LEFT_COLLAPSED_KEY, String(leftCollapsed));
    } catch {
      // ignore
    }
  }, [leftCollapsed]);

  const handleAddRepo = async () => {
    const selected = await open({ directory: true, multiple: false });
    if (selected) {
      try {
        await addRepo(selected);
      } catch (e) {
        console.error("Failed to add repo:", e);
      }
    }
  };

  const handleCreateWorkspace = async (params: {
    task_prompt?: string;
    agent_type?: string;
    model?: string;
    target_branch?: string;
  }) => {
    if (!selectedRepoId) return;
    await createWorkspace({ repo_id: selectedRepoId, ...params });
    await fetchWorkspaces(selectedRepoId);
  };

  const allWorkspaces = useMemo(
    () => [
      ...workspaces.backlog,
      ...workspaces.in_progress,
      ...workspaces.in_review,
      ...workspaces.done,
    ],
    [workspaces]
  );

  // P8-05: Navigate to next unread workspace
  const navigateToNextUnread = useCallback(() => {
    const unread = allWorkspaces.find((ws) => ws.unread && ws.id !== activeWorkspaceId);
    if (unread) {
      setActiveWorkspaceId(unread.id);
    }
  }, [allWorkspaces, activeWorkspaceId, setActiveWorkspaceId]);

  const toggleZenMode = useCallback(() => {
    const bothCollapsed = leftCollapsed && rightCollapsed;
    setLeftCollapsed(!bothCollapsed);
    setRightCollapsed(!bothCollapsed);
  }, [leftCollapsed, rightCollapsed]);

  // Centralized keyboard shortcuts
  const shortcuts = useMemo<ShortcutDef[]>(
    () => [
      {
        key: "k",
        meta: true,
        description: "Command palette",
        category: "Navigation",
        action: () => setShowCommandPalette(true),
      },
      {
        key: "p",
        meta: true,
        description: "File picker",
        category: "Navigation",
        action: () => setShowFilePicker(true),
      },
      {
        key: "f",
        meta: true,
        shift: true,
        description: "Workspace search",
        category: "Navigation",
        action: () => setShowWorkspaceSearch(true),
      },
      {
        key: "?",
        meta: true,
        description: "Keyboard shortcuts",
        category: "Navigation",
        action: () => setShowShortcutsHelp(true),
      },
      {
        key: "n",
        meta: true,
        shift: true,
        description: "New workspace",
        category: "Workspace",
        action: () => setShowNewWorkspace(true),
      },
      {
        key: "w",
        meta: true,
        description: "Close active tab",
        category: "Workspace",
        action: () => {
          if (activeWorkspaceId) closeTab(activeWorkspaceId);
        },
      },
      {
        key: "b",
        meta: true,
        description: "Toggle left sidebar",
        category: "View",
        action: () => setLeftCollapsed((c) => !c),
      },
      {
        key: "b",
        meta: true,
        alt: true,
        description: "Toggle right sidebar",
        category: "View",
        action: () => setRightCollapsed((c) => !c),
      },
      {
        key: ".",
        meta: true,
        description: "Zen mode",
        category: "View",
        action: toggleZenMode,
      },
      {
        key: "u",
        meta: true,
        shift: true,
        description: "Next unread",
        category: "Navigation",
        action: navigateToNextUnread,
      },
    ],
    [activeWorkspaceId, closeTab, toggleZenMode, navigateToNextUnread]
  );

  useKeyboard(shortcuts);

  const tabData = useMemo(
    () =>
      openTabs
        .map((id) => {
          const ws = allWorkspaces.find((w) => w.id === id);
          return ws ? { id: ws.id, label: ws.name } : null;
        })
        .filter((t): t is { id: string; label: string } => t !== null),
    [openTabs, allWorkspaces]
  );

  // Unread count for sidebar badge (P8-05)
  const unreadCount = useMemo(
    () => allWorkspaces.filter((ws) => ws.unread).length,
    [allWorkspaces]
  );

  return (
    <div style={{ height: "100%", width: "100%", display: "flex", flexDirection: "column" }}>
      <TabBar
        tabs={tabData}
        activeTabId={activeWorkspaceId}
        onSelect={setActiveWorkspaceId}
        onClose={closeTab}
        onHome={() => setActiveWorkspaceId(null)}
        isHomeActive={activeWorkspaceId === null}
      />

      <div style={{ flex: 1, overflow: "hidden" }}>
        <PanelGroup
          direction="horizontal"
          onLayout={handleLayout}
          autoSaveId={LAYOUT_KEY}
        >
          {!leftCollapsed && (
            <>
              <Panel
                defaultSize={defaultLayout?.[0] ?? 20}
                minSize={15}
                maxSize={30}
                style={{
                  backgroundColor: "var(--bg-surface)",
                  borderRight: "1px solid var(--border-subtle)",
                }}
              >
                <Sidebar
                  repos={repos}
                  selectedRepoId={selectedRepoId}
                  onSelectRepo={setSelectedRepoId}
                  onAddRepo={handleAddRepo}
                  onNewWorkspace={() => setShowNewWorkspace(true)}
                  onOpenSettings={() => {}}
                  workspaces={workspaces}
                  activeWorkspaceId={activeWorkspaceId}
                  onSelectWorkspace={setActiveWorkspaceId}
                  unreadCount={unreadCount}
                />
              </Panel>
              <PanelResizeHandle
                style={{
                  width: 1,
                  backgroundColor: "var(--border-subtle)",
                  cursor: "col-resize",
                }}
              />
            </>
          )}

          <Panel
            defaultSize={defaultLayout?.[1] ?? 55}
            minSize={30}
            style={{ backgroundColor: "var(--bg-base)" }}
          >
            {activeWorkspaceId ? (
              <WorkspaceView
                workspaceId={activeWorkspaceId}
                workspaceName={
                  allWorkspaces.find((w) => w.id === activeWorkspaceId)?.name ?? "Workspace"
                }
              />
            ) : (
              <div
                style={{
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div style={{ textAlign: "center" }}>
                  <span
                    style={{
                      color: "var(--text-tertiary)",
                      fontSize: "var(--font-size-lg)",
                      fontWeight: 600,
                    }}
                  >
                    Orchestra
                  </span>
                  <div
                    style={{
                      color: "var(--text-tertiary)",
                      fontSize: "var(--font-size-sm)",
                      marginTop: "var(--space-2)",
                    }}
                  >
                    Add a repo and create a workspace to get started
                  </div>
                </div>
              </div>
            )}
          </Panel>

          {!rightCollapsed && (
            <>
              <PanelResizeHandle
                style={{
                  width: 1,
                  backgroundColor: "var(--border-subtle)",
                  cursor: "col-resize",
                }}
              />
              <Panel
                defaultSize={defaultLayout?.[2] ?? 25}
                minSize={20}
                maxSize={40}
                style={{
                  backgroundColor: "var(--bg-surface)",
                  borderLeft: "1px solid var(--border-subtle)",
                }}
              >
                <RightPanel
                  workspaceId={activeWorkspaceId}
                  onCollapse={() => setRightCollapsed(true)}
                />
              </Panel>
            </>
          )}
        </PanelGroup>
      </div>

      {rightCollapsed && (
        <button
          onClick={() => setRightCollapsed(false)}
          style={{
            position: "fixed",
            right: 8,
            top: "50%",
            transform: "translateY(-50%)",
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            color: "var(--text-secondary)",
            cursor: "pointer",
            padding: "var(--space-2) var(--space-1)",
            fontSize: "var(--font-size-xs)",
            zIndex: 10,
          }}
        >
          ‹
        </button>
      )}

      {leftCollapsed && (
        <button
          onClick={() => setLeftCollapsed(false)}
          style={{
            position: "fixed",
            left: 8,
            top: "50%",
            transform: "translateY(-50%)",
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            color: "var(--text-secondary)",
            cursor: "pointer",
            padding: "var(--space-2) var(--space-1)",
            fontSize: "var(--font-size-xs)",
            zIndex: 10,
          }}
        >
          ›
        </button>
      )}

      <NewWorkspaceDialog
        open={showNewWorkspace}
        onClose={() => setShowNewWorkspace(false)}
        onSubmit={handleCreateWorkspace}
        branches={["main", "master", "develop"]}
      />

      <CommandPalette
        open={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        onNewWorkspace={() => setShowNewWorkspace(true)}
        onSelectWorkspace={setActiveWorkspaceId}
        onToggleLeftSidebar={() => setLeftCollapsed((c) => !c)}
        onToggleRightSidebar={() => setRightCollapsed((c) => !c)}
        onZenMode={toggleZenMode}
      />

      <FilePicker
        open={showFilePicker}
        onClose={() => setShowFilePicker(false)}
        workspaceId={activeWorkspaceId}
        onSelectFile={(path) => {
          console.log("Selected file:", path);
        }}
      />

      <WorkspaceSearch
        open={showWorkspaceSearch}
        onClose={() => setShowWorkspaceSearch(false)}
        onSelectWorkspace={setActiveWorkspaceId}
      />

      <ShortcutsHelp
        open={showShortcutsHelp}
        onClose={() => setShowShortcutsHelp(false)}
      />
    </div>
  );
}

export default App;
