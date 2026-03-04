import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { useState, useCallback, useEffect } from "react";
import { Sidebar } from "./components/Sidebar/Sidebar";
import { useRepoStore } from "./hooks/useRepos";
import { open } from "@tauri-apps/plugin-dialog";

const LAYOUT_KEY = "open-conductor-panel-layout";
const RIGHT_COLLAPSED_KEY = "open-conductor-right-collapsed";

function App() {
  const { repos, selectedRepoId, setSelectedRepoId, fetchRepos, addRepo } =
    useRepoStore();

  const [rightCollapsed, setRightCollapsed] = useState(() => {
    try {
      return localStorage.getItem(RIGHT_COLLAPSED_KEY) === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    fetchRepos();
  }, [fetchRepos]);

  const handleLayout = useCallback((sizes: number[]) => {
    try {
      localStorage.setItem(LAYOUT_KEY, JSON.stringify(sizes));
    } catch {
      // ignore storage errors
    }
  }, []);

  const defaultLayout = (() => {
    try {
      const stored = localStorage.getItem(LAYOUT_KEY);
      if (stored) return JSON.parse(stored) as number[];
    } catch {
      // ignore
    }
    return undefined;
  })();

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

  return (
    <div style={{ height: "100%", width: "100%" }}>
      <PanelGroup
        direction="horizontal"
        onLayout={handleLayout}
        autoSaveId={LAYOUT_KEY}
      >
        {/* Left Sidebar */}
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
            onNewWorkspace={() => {
              // TODO: P2-03
            }}
            onOpenSettings={() => {
              // TODO: P10-01
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

        {/* Center Panel */}
        <Panel
          defaultSize={defaultLayout?.[1] ?? 55}
          minSize={30}
          style={{ backgroundColor: "var(--bg-base)" }}
        >
          <div
            style={{
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                color: "var(--text-tertiary)",
                fontSize: "var(--font-size-lg)",
                fontWeight: 600,
              }}
            >
              Orchestra
            </span>
          </div>
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

            {/* Right Panel */}
            <Panel
              defaultSize={defaultLayout?.[2] ?? 25}
              minSize={20}
              maxSize={40}
              style={{
                backgroundColor: "var(--bg-surface)",
                borderLeft: "1px solid var(--border-subtle)",
              }}
            >
              <div style={{ padding: "var(--space-4)", height: "100%" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      color: "var(--text-secondary)",
                      fontSize: "var(--font-size-sm)",
                    }}
                  >
                    Review
                  </span>
                  <button
                    onClick={() => setRightCollapsed(true)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--text-tertiary)",
                      cursor: "pointer",
                      fontSize: "var(--font-size-sm)",
                      padding: "var(--space-1)",
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            </Panel>
          </>
        )}
      </PanelGroup>

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
    </div>
  );
}

export default App;
