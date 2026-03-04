import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { CIActions } from "./CIActions";
import { MergeButton } from "../Review/MergeButton";
import { TodoList } from "../Review/TodoList";
import { PRCreation } from "../Review/PRCreation";

interface PrStatus {
  number: number;
  title: string;
  state: string;
  review_decision: string;
  mergeable: string;
  url: string;
  draft: boolean;
}

interface ChecksTabProps {
  workspaceId: string;
  onForwardToAgent?: (content: string) => void;
}

interface CollapsibleSectionProps {
  title: string;
  badge?: string;
  badgeColor?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function CollapsibleSection({
  title,
  badge,
  badgeColor,
  defaultOpen = true,
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div style={{ borderBottom: "1px solid var(--border-subtle)" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: "flex",
          alignItems: "center",
          width: "100%",
          padding: "var(--space-2) var(--space-3)",
          background: "none",
          border: "none",
          cursor: "pointer",
          gap: "var(--space-2)",
        }}
      >
        <span
          style={{
            color: "var(--text-tertiary)",
            fontSize: "var(--font-size-xs)",
            transform: open ? "rotate(90deg)" : "none",
            transition: "transform 150ms ease",
          }}
        >
          ▸
        </span>
        <span
          style={{
            flex: 1,
            textAlign: "left",
            color: "var(--text-secondary)",
            fontSize: "var(--font-size-xs)",
            fontWeight: 600,
          }}
        >
          {title}
        </span>
        {badge && (
          <span
            style={{
              fontSize: "var(--font-size-xs)",
              color: badgeColor ?? "var(--text-tertiary)",
              fontFamily: "var(--font-mono)",
            }}
          >
            {badge}
          </span>
        )}
      </button>
      {open && <div>{children}</div>}
    </div>
  );
}

const REVIEW_ICONS: Record<string, { icon: string; color: string }> = {
  APPROVED: { icon: "✓", color: "var(--success)" },
  CHANGES_REQUESTED: { icon: "✕", color: "var(--error)" },
  "": { icon: "◌", color: "var(--text-tertiary)" },
};

export function ChecksTab({ workspaceId, onForwardToAgent }: ChecksTabProps) {
  const [prStatus, setPrStatus] = useState<PrStatus | null>(null);
  const [prLoading, setPrLoading] = useState(true);

  useEffect(() => {
    setPrLoading(true);
    invoke<PrStatus | null>("get_pr_status", { workspaceId })
      .then(setPrStatus)
      .catch(() => setPrStatus(null))
      .finally(() => setPrLoading(false));
  }, [workspaceId]);

  const reviewInfo = REVIEW_ICONS[prStatus?.review_decision ?? ""] ?? REVIEW_ICONS[""];

  return (
    <div style={{ overflow: "auto", height: "100%" }}>
      {/* PR Status */}
      <CollapsibleSection
        title="Pull Request"
        badge={prStatus ? `#${prStatus.number}` : undefined}
        badgeColor={prStatus?.draft ? "var(--text-tertiary)" : "var(--accent-primary)"}
      >
        {prLoading ? (
          <div style={{ padding: "var(--space-2) var(--space-3)", color: "var(--text-tertiary)", fontSize: "var(--font-size-xs)" }}>
            Checking PR status...
          </div>
        ) : prStatus ? (
          <div style={{ padding: "var(--space-2) var(--space-3)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-1)" }}>
              <span style={{ color: reviewInfo.color, fontWeight: 600 }}>{reviewInfo.icon}</span>
              <span style={{ fontSize: "var(--font-size-sm)", color: "var(--text-primary)" }}>
                {prStatus.title}
              </span>
              {prStatus.draft && (
                <span style={{ fontSize: "var(--font-size-xs)", color: "var(--text-tertiary)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "0 4px" }}>
                  Draft
                </span>
              )}
            </div>
            <div style={{ fontSize: "var(--font-size-xs)", color: "var(--text-tertiary)" }}>
              {prStatus.review_decision || "No reviews yet"} · {prStatus.mergeable}
            </div>
            <a
              href={prStatus.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: "var(--font-size-xs)", color: "var(--accent-primary)" }}
            >
              View on GitHub
            </a>
          </div>
        ) : (
          <PRCreation workspaceId={workspaceId} taskPrompt={null} existingPrTitle={null} />
        )}
      </CollapsibleSection>

      {/* Review Status */}
      {prStatus && (
        <CollapsibleSection
          title="Review Status"
          badge={prStatus.review_decision || "pending"}
          badgeColor={reviewInfo.color}
        >
          <div style={{ padding: "var(--space-2) var(--space-3)", fontSize: "var(--font-size-xs)", color: "var(--text-secondary)" }}>
            {prStatus.review_decision === "APPROVED"
              ? "All reviews approved"
              : prStatus.review_decision === "CHANGES_REQUESTED"
                ? "Changes have been requested"
                : "Awaiting review"}
          </div>
        </CollapsibleSection>
      )}

      {/* CI Actions */}
      <CollapsibleSection title="CI / Actions">
        <CIActions workspaceId={workspaceId} onForwardToAgent={onForwardToAgent} />
      </CollapsibleSection>

      {/* Todos */}
      <CollapsibleSection title="Todos">
        <TodoList workspaceId={workspaceId} />
      </CollapsibleSection>

      {/* Merge */}
      <CollapsibleSection title="Merge" defaultOpen={false}>
        <MergeButton workspaceId={workspaceId} />
      </CollapsibleSection>
    </div>
  );
}
