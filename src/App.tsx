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
import { SettingsPage } from "./components/Settings/SettingsPage";
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
    workspacesByRepo,
    activeWorkspaceId,
    openTabs,
    fetchWorkspaces,
    fetchAllWorkspaces,
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
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    fetchRepos();
  }, [fetchRepos]);

  // Fetch workspaces for the selected repo (for backward compat)
  useEffect(() => {
    if (selectedRepoId) {
      fetchWorkspaces(selectedRepoId);
    }
  }, [selectedRepoId, fetchWorkspaces]);

  // Fetch workspaces for all repos (for sidebar project tree)
  useEffect(() => {
    if (repos.length > 0) {
      fetchAllWorkspaces(repos.map((r) => r.id));
    }
  }, [repos, fetchAllWorkspaces]);

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
        key: ",",
        meta: true,
        description: "Settings",
        category: "View",
        action: () => setShowSettings(true),
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

  const activeWs = useMemo(
    () => allWorkspaces.find((w) => w.id === activeWorkspaceId),
    [allWorkspaces, activeWorkspaceId]
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
        onToggleLeftSidebar={() => setLeftCollapsed((c) => !c)}
        onToggleRightSidebar={() => setRightCollapsed((c) => !c)}
        onSettings={() => setShowSettings(true)}
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
                defaultSize={defaultLayout?.[0] ?? 18}
                minSize={14}
                maxSize={28}
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
                  onOpenSettings={() => setShowSettings(true)}
                  workspaces={workspaces}
                  workspacesByRepo={workspacesByRepo}
                  activeWorkspaceId={activeWorkspaceId}
                  onSelectWorkspace={(id) => {
                    if (id === "") {
                      setActiveWorkspaceId(null);
                    } else {
                      setActiveWorkspaceId(id);
                    }
                  }}
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
            defaultSize={defaultLayout?.[1] ?? 57}
            minSize={30}
            style={{ backgroundColor: "var(--bg-base)" }}
          >
            {showSettings ? (
              <SettingsPage
                onClose={() => setShowSettings(false)}
                selectedRepoId={selectedRepoId}
              />
            ) : activeWorkspaceId && activeWs ? (
              <WorkspaceView
                workspaceId={activeWorkspaceId}
                workspaceName={activeWs.name}
                agentType={activeWs.agent_type ?? undefined}
                model={activeWs.model ?? undefined}
                worktreePath={activeWs.worktree_path}
              />
            ) : (
              <HomeView
                onNewWorkspace={() => setShowNewWorkspace(true)}
                hasRepos={repos.length > 0}
                onAddRepo={handleAddRepo}
              />
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
                minSize={18}
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

function HomeView({
  onNewWorkspace,
  hasRepos,
  onAddRepo,
}: {
  onNewWorkspace: () => void;
  hasRepos: boolean;
  onAddRepo: () => void;
}) {
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 400 }}>
        <div
          style={{
            fontSize: 32,
            fontWeight: 700,
            color: "var(--text-primary)",
            marginBottom: "var(--space-2)",
            letterSpacing: "-0.5px",
          }}
        >
          Orchestra
        </div>
        <div
          style={{
            color: "var(--text-tertiary)",
            fontSize: "var(--font-size-sm)",
            marginBottom: "var(--space-6)",
            lineHeight: 1.5,
          }}
        >
          Multi-agent development environment
        </div>

        <div style={{ display: "flex", gap: "var(--space-3)", justifyContent: "center" }}>
          {!hasRepos ? (
            <button
              onClick={onAddRepo}
              style={{
                padding: "var(--space-2) var(--space-5)",
                background: "var(--accent-primary)",
                border: "none",
                borderRadius: "var(--radius-md)",
                color: "var(--bg-base)",
                fontSize: "var(--font-size-sm)",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Add a Project
            </button>
          ) : (
            <button
              onClick={onNewWorkspace}
              style={{
                padding: "var(--space-2) var(--space-5)",
                background: "var(--accent-primary)",
                border: "none",
                borderRadius: "var(--radius-md)",
                color: "var(--bg-base)",
                fontSize: "var(--font-size-sm)",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              New Workspace
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
