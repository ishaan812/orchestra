import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { FileTree } from "./FileTree";
import { DiffViewer } from "./DiffViewer";
import { NotesEditor } from "../Notes/NotesEditor";
import { ChecksTab } from "../Checks/ChecksTab";
import { PRCreation } from "./PRCreation";
import { FileTree as ExplorerFileTree } from "../FileExplorer/FileTree";

interface RightPanelProps {
  workspaceId: string | null;
  onCollapse: () => void;
}

type TabId = "changes" | "files" | "checks" | "notes";

export function RightPanel({ workspaceId, onCollapse }: RightPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>("changes");
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [showPRCreate, setShowPRCreate] = useState(false);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Header with "Changes" title and Create PR button — like emdash */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "var(--space-2) var(--space-3)",
          borderBottom: "1px solid var(--border-subtle)",
          gap: "var(--space-2)",
        }}
      >
        <span
          style={{
            fontSize: "var(--font-size-sm)",
            fontWeight: 600,
            color: "var(--text-primary)",
            flex: 1,
          }}
        >
          {activeTab === "changes" ? "Changes" : activeTab === "files" ? "Files" : activeTab === "checks" ? "Checks" : "Notes"}
        </span>

        {workspaceId && activeTab === "changes" && (
          <button
            onClick={() => setShowPRCreate(!showPRCreate)}
            style={{
              padding: "var(--space-1) var(--space-3)",
              background: "var(--accent-primary)",
              border: "none",
              borderRadius: "var(--radius-md)",
              color: "var(--bg-base)",
              fontSize: "var(--font-size-xs)",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "var(--space-1)",
            }}
          >
            Create PR
            <span style={{ fontSize: 10 }}>▾</span>
          </button>
        )}

        <button
          onClick={onCollapse}
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

      {/* Tab navigation — subtle, below the header */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid var(--border-subtle)",
          padding: "0 var(--space-2)",
        }}
      >
        {(["changes", "files", "checks", "notes"] as TabId[]).map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              setSelectedFile(null);
              setShowPRCreate(false);
            }}
            style={{
              padding: "var(--space-2) var(--space-3)",
              background: "none",
              border: "none",
              borderBottom:
                activeTab === tab
                  ? "2px solid var(--accent-primary)"
                  : "2px solid transparent",
              color:
                activeTab === tab
                  ? "var(--text-primary)"
                  : "var(--text-tertiary)",
              fontSize: "var(--font-size-xs)",
              cursor: "pointer",
              textTransform: "capitalize",
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* PR Creation dropdown */}
      {showPRCreate && workspaceId && (
        <div
          style={{
            borderBottom: "1px solid var(--border-subtle)",
            padding: "var(--space-3)",
            backgroundColor: "var(--bg-elevated)",
          }}
        >
          <PRCreation workspaceId={workspaceId} taskPrompt={null} existingPrTitle={null} />
        </div>
      )}

      {/* Tab content */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {activeTab === "changes" && workspaceId && (
          selectedFile ? (
            <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
              <button
                onClick={() => setSelectedFile(null)}
                style={{
                  padding: "var(--space-1) var(--space-3)",
                  background: "none",
                  border: "none",
                  borderBottom: "1px solid var(--border-subtle)",
                  color: "var(--accent-primary)",
                  fontSize: "var(--font-size-xs)",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                ← Back
              </button>
              <div style={{ flex: 1, overflow: "auto" }}>
                <DiffViewer workspaceId={workspaceId} filePath={selectedFile} />
              </div>
            </div>
          ) : (
            <div style={{ overflow: "auto" }}>
              <FileTree workspaceId={workspaceId} onSelectFile={setSelectedFile} />
            </div>
          )
        )}

        {activeTab === "files" && workspaceId && (
          <AllFilesTab workspaceId={workspaceId} />
        )}

        {activeTab === "checks" && workspaceId && (
          <ChecksTab workspaceId={workspaceId} />
        )}

        {activeTab === "notes" && workspaceId && (
          <NotesEditor workspaceId={workspaceId} />
        )}

        {!workspaceId && (
          <div
            style={{
              padding: "var(--space-6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              color: "var(--text-tertiary)",
              fontSize: "var(--font-size-sm)",
            }}
          >
            Select a workspace
          </div>
        )}
      </div>
    </div>
  );
}

function AllFilesTab({ workspaceId }: { workspaceId: string }) {
  const [files, setFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFiles = useCallback(async () => {
    setLoading(true);
    try {
      const result = await invoke<string[]>("list_workspace_files", { workspaceId });
      setFiles(result);
    } catch {
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  if (loading) {
    return (
      <div style={{ padding: "var(--space-4)", color: "var(--text-tertiary)", fontSize: "var(--font-size-sm)" }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{ overflow: "auto", height: "100%" }}>
      <ExplorerFileTree
        files={files}
        onFileSelect={() => {}}
        selectedFile={undefined}
      />
    </div>
  );
}
