import { useState, useEffect, useRef, useCallback } from "react";

interface ChatSearchProps {
  open: boolean;
  onClose: () => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function ChatSearch({ open, onClose, containerRef }: ChatSearchProps) {
  const [query, setQuery] = useState("");
  const [matchCount, setMatchCount] = useState(0);
  const [currentMatch, setCurrentMatch] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const highlightsRef = useRef<HTMLElement[]>([]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      setQuery("");
      clearHighlights();
    }
  }, [open]);

  const clearHighlights = useCallback(() => {
    for (const el of highlightsRef.current) {
      const parent = el.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(el.textContent ?? ""), el);
        parent.normalize();
      }
    }
    highlightsRef.current = [];
    setMatchCount(0);
    setCurrentMatch(0);
  }, []);

  const performSearch = useCallback(
    (searchQuery: string) => {
      clearHighlights();
      if (!searchQuery.trim() || !containerRef.current) return;

      const container = containerRef.current;
      const walker = document.createTreeWalker(
        container,
        NodeFilter.SHOW_TEXT,
        null,
      );

      const textNodes: Text[] = [];
      let node: Node | null;
      while ((node = walker.nextNode())) {
        if (node.textContent?.toLowerCase().includes(searchQuery.toLowerCase())) {
          textNodes.push(node as Text);
        }
      }

      const highlights: HTMLElement[] = [];
      for (const textNode of textNodes) {
        const text = textNode.textContent ?? "";
        const lowerText = text.toLowerCase();
        const lowerQuery = searchQuery.toLowerCase();
        let startIdx = 0;

        const parts: (string | { text: string })[] = [];
        let lastEnd = 0;

        while ((startIdx = lowerText.indexOf(lowerQuery, startIdx)) !== -1) {
          if (startIdx > lastEnd) {
            parts.push(text.slice(lastEnd, startIdx));
          }
          parts.push({ text: text.slice(startIdx, startIdx + searchQuery.length) });
          lastEnd = startIdx + searchQuery.length;
          startIdx = lastEnd;
        }

        if (parts.length === 0) continue;
        if (lastEnd < text.length) {
          parts.push(text.slice(lastEnd));
        }

        const parent = textNode.parentNode;
        if (!parent) continue;

        const fragment = document.createDocumentFragment();
        for (const part of parts) {
          if (typeof part === "string") {
            fragment.appendChild(document.createTextNode(part));
          } else {
            const mark = document.createElement("mark");
            mark.textContent = part.text;
            mark.style.backgroundColor = "var(--warning)";
            mark.style.color = "var(--bg-base)";
            mark.style.borderRadius = "2px";
            mark.style.padding = "0 1px";
            mark.setAttribute("data-search-highlight", "true");
            fragment.appendChild(mark);
            highlights.push(mark);
          }
        }

        parent.replaceChild(fragment, textNode);
      }

      highlightsRef.current = highlights;
      setMatchCount(highlights.length);
      setCurrentMatch(highlights.length > 0 ? 1 : 0);

      // Scroll to first match
      if (highlights.length > 0) {
        highlights[0].scrollIntoView({ behavior: "smooth", block: "center" });
        highlights[0].style.backgroundColor = "var(--accent-primary)";
      }
    },
    [containerRef, clearHighlights]
  );

  // Re-search on query change
  useEffect(() => {
    if (open) {
      performSearch(query);
    }
  }, [query, open, performSearch]);

  const navigateMatch = useCallback(
    (direction: 1 | -1) => {
      if (matchCount === 0) return;
      const highlights = highlightsRef.current;

      // Reset previous highlight
      const prevIdx = currentMatch - 1;
      if (prevIdx >= 0 && prevIdx < highlights.length) {
        highlights[prevIdx].style.backgroundColor = "var(--warning)";
      }

      let nextMatch = currentMatch + direction;
      if (nextMatch > matchCount) nextMatch = 1;
      if (nextMatch < 1) nextMatch = matchCount;

      setCurrentMatch(nextMatch);

      const el = highlights[nextMatch - 1];
      if (el) {
        el.style.backgroundColor = "var(--accent-primary)";
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    },
    [currentMatch, matchCount]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "Enter") {
        e.preventDefault();
        navigateMatch(e.shiftKey ? -1 : 1);
      }
    },
    [onClose, navigateMatch]
  );

  if (!open) return null;

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 20,
        padding: "var(--space-2) var(--space-4)",
        backgroundColor: "var(--bg-elevated)",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        gap: "var(--space-2)",
        boxShadow: "var(--shadow-md)",
      }}
    >
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search messages..."
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

      <span
        style={{
          fontSize: "var(--font-size-xs)",
          color: "var(--text-tertiary)",
          whiteSpace: "nowrap",
          minWidth: 60,
          textAlign: "center",
        }}
      >
        {matchCount > 0 ? `${currentMatch} of ${matchCount}` : query ? "No matches" : ""}
      </span>

      <button
        onClick={() => navigateMatch(-1)}
        disabled={matchCount === 0}
        style={{
          background: "none",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-sm)",
          color: matchCount > 0 ? "var(--text-secondary)" : "var(--text-tertiary)",
          cursor: matchCount > 0 ? "pointer" : "not-allowed",
          padding: "2px 6px",
          fontSize: "var(--font-size-xs)",
        }}
      >
        ↑
      </button>
      <button
        onClick={() => navigateMatch(1)}
        disabled={matchCount === 0}
        style={{
          background: "none",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-sm)",
          color: matchCount > 0 ? "var(--text-secondary)" : "var(--text-tertiary)",
          cursor: matchCount > 0 ? "pointer" : "not-allowed",
          padding: "2px 6px",
          fontSize: "var(--font-size-xs)",
        }}
      >
        ↓
      </button>

      <button
        onClick={onClose}
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
  );
}
