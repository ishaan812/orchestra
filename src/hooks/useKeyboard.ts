import { useEffect, useCallback, useRef } from "react";

export interface ShortcutDef {
  key: string;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  ctrl?: boolean;
  description: string;
  category: "Navigation" | "Workspace" | "Chat" | "Terminal" | "View" | "Actions";
  action: () => void;
}

/**
 * Centralized keyboard shortcut manager.
 * Shortcuts are context-aware: if a terminal or input is focused,
 * only terminal-specific shortcuts fire.
 */
export function useKeyboard(shortcuts: ShortcutDef[]) {
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  const handler = useCallback((e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    const isInput =
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.isContentEditable;
    const isTerminal = target.closest(".xterm") !== null;

    for (const s of shortcutsRef.current) {
      const metaMatch = s.meta ? e.metaKey : !e.metaKey;
      const shiftMatch = s.shift ? e.shiftKey : !e.shiftKey;
      const altMatch = s.alt ? e.altKey : !e.altKey;
      const ctrlMatch = s.ctrl ? e.ctrlKey : !e.ctrlKey;

      if (
        e.key.toLowerCase() === s.key.toLowerCase() &&
        metaMatch &&
        shiftMatch &&
        altMatch &&
        ctrlMatch
      ) {
        // In terminal, only allow terminal-category shortcuts or meta shortcuts
        if (isTerminal && s.category !== "Terminal" && !s.meta && !s.ctrl) {
          continue;
        }
        // In inputs, only allow meta/ctrl shortcuts
        if (isInput && !s.meta && !s.ctrl) {
          continue;
        }

        e.preventDefault();
        s.action();
        return;
      }
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handler]);
}

export interface ShortcutGroup {
  category: string;
  items: { keys: string; description: string }[];
}

export function getShortcutGroups(): ShortcutGroup[] {
  return [
    {
      category: "Navigation",
      items: [
        { keys: "⌘K", description: "Command palette" },
        { keys: "⌘P", description: "File picker" },
        { keys: "⌘⇧F", description: "Workspace search" },
        { keys: "⌘?", description: "Keyboard shortcuts" },
        { keys: "⌘B", description: "Toggle left sidebar" },
        { keys: "⌥⌘B", description: "Toggle right sidebar" },
        { keys: "⌘.", description: "Zen mode" },
      ],
    },
    {
      category: "Workspace",
      items: [
        { keys: "⌘⇧N", description: "New workspace" },
        { keys: "⌘T", description: "New chat tab" },
        { keys: "⌘W", description: "Close active tab" },
        { keys: "⌘R", description: "Run script" },
        { keys: "⌘⇧Y", description: "Commit and push" },
      ],
    },
    {
      category: "Chat",
      items: [
        { keys: "⌘F", description: "Search in chat" },
        { keys: "⌘⇧T", description: "Toggle thinking" },
      ],
    },
    {
      category: "Terminal",
      items: [
        { keys: "⌃`", description: "Focus terminal" },
        { keys: "⌘K", description: "Clear terminal (when focused)" },
        { keys: "⌘⇧O", description: "Open localhost URL" },
      ],
    },
    {
      category: "View",
      items: [
        { keys: "⌘-", description: "Zoom out" },
        { keys: "⌘+", description: "Zoom in" },
        { keys: "⌘,", description: "Settings" },
      ],
    },
  ];
}
