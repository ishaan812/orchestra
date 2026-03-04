import { useState } from "react";

export interface TaskItem {
  id: string;
  subject: string;
  description?: string;
  activeForm?: string;
  status: "pending" | "in_progress" | "completed";
  blockedBy?: string[];
}

interface TaskViewProps {
  tasks: TaskItem[];
}

export function TaskView({ tasks }: TaskViewProps) {
  if (tasks.length === 0) return null;

  const completed = tasks.filter((t) => t.status === "completed").length;
  const total = tasks.length;
  const progressPercent = total > 0 ? (completed / total) * 100 : 0;

  return (
    <div
      style={{
        margin: "var(--space-2) var(--space-4)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
        backgroundColor: "var(--bg-surface)",
        overflow: "hidden",
      }}
    >
      {/* Header with progress */}
      <div
        style={{
          padding: "var(--space-2) var(--space-3)",
          borderBottom: "1px solid var(--border-subtle)",
          display: "flex",
          alignItems: "center",
          gap: "var(--space-2)",
        }}
      >
        <span
          style={{
            fontSize: "var(--font-size-sm)",
            fontWeight: 600,
            color: "var(--text-primary)",
          }}
        >
          Tasks
        </span>
        <span
          style={{
            fontSize: "var(--font-size-xs)",
            color: "var(--text-tertiary)",
          }}
        >
          {completed}/{total}
        </span>
        <div style={{ flex: 1 }} />
        {/* Progress bar */}
        <div
          style={{
            width: 60,
            height: 4,
            backgroundColor: "var(--border)",
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${progressPercent}%`,
              height: "100%",
              backgroundColor: "var(--success)",
              borderRadius: 2,
              transition: "width 300ms ease",
            }}
          />
        </div>
      </div>

      {/* Task list */}
      <div style={{ padding: "var(--space-1) 0" }}>
        {tasks.map((task) => (
          <TaskRow key={task.id} task={task} />
        ))}
      </div>
    </div>
  );
}

function TaskRow({ task }: { task: TaskItem }) {
  const [expanded, setExpanded] = useState(false);

  const statusIcon =
    task.status === "completed"
      ? "✓"
      : task.status === "in_progress"
        ? "●"
        : "○";

  const statusColor =
    task.status === "completed"
      ? "var(--success)"
      : task.status === "in_progress"
        ? "var(--accent-primary)"
        : "var(--text-tertiary)";

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-2)",
          width: "100%",
          padding: "var(--space-1) var(--space-3)",
          background: "none",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <span
          style={{
            color: statusColor,
            fontSize: "var(--font-size-xs)",
            fontWeight: 600,
            width: 14,
            textAlign: "center",
            flexShrink: 0,
          }}
        >
          {statusIcon}
        </span>
        <span
          style={{
            fontSize: "var(--font-size-sm)",
            color:
              task.status === "completed"
                ? "var(--text-tertiary)"
                : "var(--text-primary)",
            textDecoration:
              task.status === "completed" ? "line-through" : "none",
            flex: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {task.subject}
        </span>
        {task.status === "in_progress" && task.activeForm && (
          <span
            style={{
              fontSize: "var(--font-size-xs)",
              color: "var(--accent-primary)",
              fontStyle: "italic",
              flexShrink: 0,
            }}
          >
            {task.activeForm}
          </span>
        )}
        {task.description && (
          <span
            style={{
              fontSize: "var(--font-size-xs)",
              color: "var(--text-tertiary)",
              transform: expanded ? "rotate(90deg)" : "none",
              transition: "transform 150ms ease",
              flexShrink: 0,
            }}
          >
            ▶
          </span>
        )}
      </button>

      {expanded && task.description && (
        <div
          style={{
            padding: "var(--space-1) var(--space-3) var(--space-2)",
            paddingLeft: "calc(var(--space-3) + 14px + var(--space-2))",
            fontSize: "var(--font-size-xs)",
            color: "var(--text-secondary)",
            lineHeight: 1.5,
            whiteSpace: "pre-wrap",
          }}
        >
          {task.description}
          {task.blockedBy && task.blockedBy.length > 0 && (
            <div
              style={{
                marginTop: "var(--space-1)",
                color: "var(--warning)",
                fontSize: "var(--font-size-xs)",
              }}
            >
              Blocked by: {task.blockedBy.join(", ")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
