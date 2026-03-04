import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";

interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  blocks_merge: boolean;
  order: number;
}

interface TodoListProps {
  workspaceId: string;
  onBlockingChange?: (hasBlocking: boolean) => void;
}

export function TodoList({ workspaceId, onBlockingChange }: TodoListProps) {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [newText, setNewText] = useState("");

  const loadTodos = useCallback(async () => {
    const result = await invoke<TodoItem[]>("get_todos", { workspaceId });
    setTodos(result);
    const hasBlocking = result.some((t) => t.blocks_merge && !t.completed);
    onBlockingChange?.(hasBlocking);
  }, [workspaceId, onBlockingChange]);

  useEffect(() => {
    loadTodos();
  }, [loadTodos]);

  const saveTodos = useCallback(
    async (updated: TodoItem[]) => {
      setTodos(updated);
      await invoke("save_todos", { workspaceId, todos: updated });
      const hasBlocking = updated.some((t) => t.blocks_merge && !t.completed);
      onBlockingChange?.(hasBlocking);
    },
    [workspaceId, onBlockingChange]
  );

  const handleAdd = useCallback(() => {
    if (!newText.trim()) return;
    const item: TodoItem = {
      id: crypto.randomUUID(),
      text: newText.trim(),
      completed: false,
      blocks_merge: false,
      order: todos.length,
    };
    saveTodos([...todos, item]);
    setNewText("");
  }, [newText, todos, saveTodos]);

  const handleToggle = useCallback(
    (id: string) => {
      saveTodos(
        todos.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
      );
    },
    [todos, saveTodos]
  );

  const handleDelete = useCallback(
    (id: string) => {
      saveTodos(todos.filter((t) => t.id !== id));
    },
    [todos, saveTodos]
  );

  const handleToggleBlocks = useCallback(
    (id: string) => {
      saveTodos(
        todos.map((t) =>
          t.id === id ? { ...t, blocks_merge: !t.blocks_merge } : t
        )
      );
    },
    [todos, saveTodos]
  );

  return (
    <div style={{ padding: "var(--space-3)" }}>
      <div
        style={{
          fontSize: "var(--font-size-xs)",
          color: "var(--text-secondary)",
          fontWeight: 600,
          marginBottom: "var(--space-2)",
        }}
      >
        Todos
      </div>

      {/* Todo items */}
      {todos.map((todo) => (
        <div
          key={todo.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            padding: "var(--space-1) 0",
          }}
        >
          <input
            type="checkbox"
            checked={todo.completed}
            onChange={() => handleToggle(todo.id)}
            style={{ accentColor: "var(--accent-primary)", flexShrink: 0 }}
          />
          <span
            style={{
              flex: 1,
              fontSize: "var(--font-size-sm)",
              color: todo.completed
                ? "var(--text-tertiary)"
                : "var(--text-primary)",
              textDecoration: todo.completed ? "line-through" : "none",
            }}
          >
            {todo.text}
          </span>
          {todo.blocks_merge && !todo.completed && (
            <span
              style={{
                fontSize: "var(--font-size-xs)",
                color: "var(--warning)",
                fontWeight: 600,
                flexShrink: 0,
              }}
              title="Blocks merge"
            >
              ⚠
            </span>
          )}
          <button
            onClick={() => handleToggleBlocks(todo.id)}
            title={
              todo.blocks_merge
                ? "Remove merge block"
                : "Mark as blocking merge"
            }
            style={{
              background: "none",
              border: "none",
              color: todo.blocks_merge
                ? "var(--warning)"
                : "var(--text-tertiary)",
              cursor: "pointer",
              fontSize: "var(--font-size-xs)",
              padding: 0,
              flexShrink: 0,
              opacity: 0.6,
            }}
          >
            🔒
          </button>
          <button
            onClick={() => handleDelete(todo.id)}
            style={{
              background: "none",
              border: "none",
              color: "var(--text-tertiary)",
              cursor: "pointer",
              fontSize: 10,
              padding: 0,
              flexShrink: 0,
              opacity: 0.6,
            }}
          >
            ✕
          </button>
        </div>
      ))}

      {/* Add todo input */}
      <div
        style={{
          display: "flex",
          gap: "var(--space-2)",
          marginTop: "var(--space-2)",
        }}
      >
        <input
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAdd();
          }}
          placeholder="Add todo..."
          style={{
            flex: 1,
            padding: "var(--space-1) var(--space-2)",
            backgroundColor: "var(--bg-input)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            color: "var(--text-primary)",
            fontSize: "var(--font-size-sm)",
            outline: "none",
          }}
        />
      </div>
    </div>
  );
}
