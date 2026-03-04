import { useState } from "react";
import { FileTree } from "./FileTree";
import { DiffViewer } from "./DiffViewer";
import { MergeButton } from "./MergeButton";
import { PRCreation } from "./PRCreation";
import { TerminalPanel } from "../Terminal/Terminal";

interface RightPanelProps {
  workspaceId: string | null;
  onCollapse: () => void;
}

type TabId = "changes" | "files" | "checks" | "notes" | "terminal";

const TABS: { id: TabId; label: string }[] = [
  { id: "changes", label: "Changes" },
  { id: "files", label: "All Files" },
  { id: "checks", label: "Checks" },
  { id: "notes", label: "Notes" },
  { id: "terminal", label: "Terminal" },
];

export function RightPanel({ workspaceId, onCollapse }: RightPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>("changes");
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Tab bar */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid var(--border-subtle)",
          padding: "0 var(--space-2)",
          alignItems: "center",
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setSelectedFile(null);
            }}
            style={{
              padding: "var(--space-2) var(--space-3)",
              background: "none",
              border: "none",
              borderBottom:
                activeTab === tab.id
                  ? "2px solid var(--accent-primary)"
                  : "2px solid transparent",
              color:
                activeTab === tab.id
                  ? "var(--text-primary)"
                  : "var(--text-tertiary)",
              fontSize: "var(--font-size-xs)",
              cursor: "pointer",
              transition: "color 150ms ease",
            }}
          >
            {tab.label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
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
                ← Back to file list
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
        {activeTab === "files" && (
          <PlaceholderTab label="All Files" description="Browse workspace files" />
        )}
        {activeTab === "checks" && workspaceId && (
          <div style={{ overflow: "auto" }}>
            <MergeButton workspaceId={workspaceId} />
            <div style={{ borderTop: "1px solid var(--border-subtle)" }}>
              <PRCreation
                workspaceId={workspaceId}
                taskPrompt={null}
                existingPrTitle={null}
              />
            </div>
          </div>
        )}
        {activeTab === "checks" && !workspaceId && (
          <PlaceholderTab label="Checks" description="Select a workspace" />
        )}
        {activeTab === "notes" && (
          <PlaceholderTab label="Notes" description="Workspace notes" />
        )}
        {activeTab === "terminal" && workspaceId && (
          <TerminalPanel workspaceId={workspaceId} />
        )}
        {activeTab === "terminal" && !workspaceId && (
          <PlaceholderTab label="Terminal" description="Select a workspace" />
        )}
        {activeTab === "changes" && !workspaceId && (
          <PlaceholderTab label="Changes" description="Select a workspace to view changes" />
        )}
      </div>
    </div>
  );
}

function PlaceholderTab({ label, description }: { label: string; description: string }) {
  return (
    <div
      style={{
        padding: "var(--space-6)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        gap: "var(--space-2)",
      }}
    >
      <span style={{ color: "var(--text-tertiary)", fontSize: "var(--font-size-sm)" }}>
        {label}
      </span>
      <span style={{ color: "var(--text-tertiary)", fontSize: "var(--font-size-xs)" }}>
        {description}
      </span>
    </div>
  );
}
