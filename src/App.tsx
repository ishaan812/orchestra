import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { useState, useCallback, useEffect, useMemo } from "react";
import { Sidebar } from "./components/Sidebar/Sidebar";
import { NewWorkspaceDialog } from "./components/Sidebar/NewWorkspaceDialog";
import { TabBar } from "./components/Navigation/TabBar";
import { WorkspaceView } from "./components/Chat/WorkspaceView";
import { useRepoStore } from "./hooks/useRepos";
import { useWorkspaceStore } from "./hooks/useWorkspaces";
import { open } from "@tauri-apps/plugin-dialog";

const LAYOUT_KEY = "open-conductor-panel-layout";
const RIGHT_COLLAPSED_KEY = "open-conductor-right-collapsed";

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

  const [showNewWorkspace, setShowNewWorkspace] = useState(false);

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

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey && e.shiftKey && e.key === "N") {
        e.preventDefault();
        setShowNewWorkspace(true);
      }
      if (e.metaKey && e.key === "w") {
        e.preventDefault();
        if (activeWorkspaceId) closeTab(activeWorkspaceId);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeWorkspaceId, closeTab]);

  const allWorkspaces = useMemo(() => [
    ...workspaces.backlog,
    ...workspaces.in_progress,
    ...workspaces.in_review,
    ...workspaces.done,
  ], [workspaces]);

  const tabData = useMemo(() =>
    openTabs
      .map((id) => {
        const ws = allWorkspaces.find((w) => w.id === id);
        return ws ? { id: ws.id, label: ws.name } : null;
      })
      .filter((t): t is { id: string; label: string } => t !== null),
  [openTabs, allWorkspaces]);

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
            />
          </Panel>

          <PanelResizeHandle style={{ width: 1, backgroundColor: "var(--border-subtle)", cursor: "col-resize" }} />

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
              <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ textAlign: "center" }}>
                  <span style={{ color: "var(--text-tertiary)", fontSize: "var(--font-size-lg)", fontWeight: 600 }}>
                    Orchestra
                  </span>
                  <div style={{ color: "var(--text-tertiary)", fontSize: "var(--font-size-sm)", marginTop: "var(--space-2)" }}>
                    Add a repo and create a workspace to get started
                  </div>
                </div>
              </div>
            )}
          </Panel>

          {!rightCollapsed && (
            <>
              <PanelResizeHandle style={{ width: 1, backgroundColor: "var(--border-subtle)", cursor: "col-resize" }} />
              <Panel
                defaultSize={defaultLayout?.[2] ?? 25}
                minSize={20}
                maxSize={40}
                style={{ backgroundColor: "var(--bg-surface)", borderLeft: "1px solid var(--border-subtle)" }}
              >
                <div style={{ padding: "var(--space-4)", height: "100%" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: "var(--text-secondary)", fontSize: "var(--font-size-sm)" }}>Review</span>
                    <button
                      onClick={() => setRightCollapsed(true)}
                      style={{ background: "none", border: "none", color: "var(--text-tertiary)", cursor: "pointer", fontSize: "var(--font-size-sm)", padding: "var(--space-1)" }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </Panel>
            </>
          )}
        </PanelGroup>
      </div>

      {rightCollapsed && (
        <button
          onClick={() => setRightCollapsed(false)}
          style={{
            position: "fixed", right: 8, top: "50%", transform: "translateY(-50%)",
            background: "var(--bg-elevated)", border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)", color: "var(--text-secondary)",
            cursor: "pointer", padding: "var(--space-2) var(--space-1)",
            fontSize: "var(--font-size-xs)", zIndex: 10,
          }}
        >
          ‹
        </button>
      )}

      <NewWorkspaceDialog
        open={showNewWorkspace}
        onClose={() => setShowNewWorkspace(false)}
        onSubmit={handleCreateWorkspace}
        branches={["main", "master", "develop"]}
      />
    </div>
  );
}

export default App;
