# Orchestra

## Technical Product Requirements Document

**Open-Source macOS App for Orchestrating AI Coding Agents**
Version 3.0 | March 2026
Status: Ready for Development

---

## Table of Contents

1. [What Conductor.build Is](#1-what-conductorbuild-is)
2. [Complete Feature Inventory](#2-complete-feature-inventory)
3. [Technical Architecture](#3-technical-architecture)
4. [Data Models](#4-data-models)
5. [Agent Adapter System](#5-agent-adapter-system)
6. [UI Specification](#6-ui-specification)
7. [Keyboard Shortcuts](#7-keyboard-shortcuts)
8. [Implementation Roadmap](#8-implementation-roadmap)
9. [Repository Structure](#9-repository-structure)
10. [Security Model](#10-security-model)
11. [Orchestra vs Conductor.build](#11-open-conductor-vs-conductorbuild)
12. [Technical Risks & Mitigations](#12-technical-risks--mitigations)
13. [Success Criteria](#13-success-criteria)

---

## 1. What Conductor.build Is

Conductor (v0.36.9 as of March 2026, 117 releases since August 2025) is a native macOS desktop application by **Melty Labs** (San Francisco) for running a team of AI coding agents on your Mac. Built on the **Claude Agent SDK**.

### 1.1 Core Value Proposition

> "Run a team of coding agents on your Mac."

Create parallel Claude Code + Codex agents in isolated workspaces. See at a glance what they're working on, then review and merge their changes.

### 1.2 How It Works (3 Steps)

1. **Add your repo** — Conductor clones it and works entirely on your Mac. Local-first; no cloud servers, code never leaves your machine.
2. **Deploy agents** — Each agent gets an isolated workspace (git worktree). Run Claude Code, Codex, or both in parallel.
3. **Conduct** — See who's working, what needs attention, review code, and merge changes.

### 1.3 Key Facts

- Uses **git worktrees** for workspace isolation
- Supports **Claude Code** (Anthropic) and **Codex** (OpenAI) agents
- Supports **13+ AI models**: Opus 4.6, Sonnet 4.6, Haiku 4.5, GPT-5.3-Codex, GPT-5.3-Codex-Spark, GPT-5.2, GPT-5.1, and more
- Auth passthrough — piggybacks on existing CLI auth (API key, Pro/Max plan)
- Self-hosted/local-only with zero cloud dependency
- Currently **free** (no pricing page)
- Workspaces stored at `~/conductor/workspaces/`
- Configuration via `conductor.json` per repository
- **250% growth** in January 2026
- Trusted by engineers at Linear, Vercel, Notion, Stripe, Ramp, Y Combinator companies

### 1.4 Provider Support

| Provider | Details |
|----------|---------|
| Anthropic (Direct) | Default. Uses Claude Code CLI auth |
| OpenAI Codex | Full integration with thinking levels |
| AWS Bedrock | Alternative Claude backend |
| Google Vertex AI | Alternative Claude backend |
| Custom Provider | Any Anthropic-compatible API endpoint |

---

## 2. Complete Feature Inventory

### 2.1 Workspace Management (Core Feature)

| Feature | Description | Version |
|---------|-------------|---------|
| Create Workspace | Click `+` or `Cmd+Shift+N`. Select agent, enter task, optionally link GitHub issue or Linear issue. Creates git worktree + spawns agent. | v0.8+ |
| Workspace List | Sidebar displays all workspaces per repo with: name, status, lines +/-, stats, PR title labels | v0.8+ |
| Workspace Status Organization | Workspaces organized by status columns: **Backlog, In Progress, In Review, Done** | v0.35.0 |
| Multi-Repo Support | Register multiple repos. Workspaces grouped by repository in sidebar. Drag-and-drop repo reordering. | v0.35.2 |
| Workspace Tabs | Open multiple workspaces in tabs (like browser tabs). Home tab shows overview dashboard. | v0.8+ |
| Workspace Naming | Auto-generated names from task. User can rename. AI-generated chat titles (uses Gemini; disable via "Strict data privacy"). | v0.20.0 |
| Workspace Lifecycle | States: creating → running → paused → completed → ready_to_merge → merged → archived → errored | v0.8+ |
| Workspace Archiving | Archive completed workspaces. Auto-saves uncommitted files and git state during archiving. Undo archive supported. | v0.33.5 |
| Pinned Workspaces | Pin important workspaces to top of sidebar | v0.25.3 |
| Workspace Forking | Fork a workspace with chat summaries carried over. Tracked/ignored files handled. | v0.25.6 |
| Workspace Search | Search workspaces by branch/repo/PR number with `Cmd+Shift+F` | v0.26.0 |
| Mark Unread | Mark workspaces as unread for later attention | v0.25.11 |
| Quick Navigation | Navigate between active chats with unread messages | v0.36.4 |
| Create from PR/Branch/Issue | Create workspace from existing PR, branch, or Linear issue with `Cmd+Shift+N` | v0.15.2 |
| Quick Start | Create new repos directly in Conductor, auto-push to GitHub | v0.24.0 |
| Configurable Storage | Customizable workspace storage location (default: `~/conductor/workspaces/`) | v0.31.0 |
| Multi-Repo Editing | Edit multiple repositories in one workspace with `/add-dir` command | v0.25.6 |

### 2.2 Agent Execution Engine

| Feature | Description | Version |
|---------|-------------|---------|
| Claude Code Support | Spawn Claude Code CLI in worktree directory. Uses existing auth. JSON stream output parsing. | v0.8+ |
| Codex Support | Full Codex integration: live Bash rendering, web search, MCP visibility, thinking levels (low/medium/high/xhigh), cancellation | v0.18.0+ |
| Isolated Execution | Each agent in own git worktree. Full process isolation. | v0.8+ |
| Parallel Execution | Multiple agents simultaneously. No hard limit beyond system resources. | v0.8+ |
| Auth Passthrough | Zero auth management. Delegates to CLI auth. Supports API key, Pro/Max/Team plans, GH_TOKEN. | v0.8+ |
| Agent I/O Streaming | Real-time capture of stdout/stderr. Stream to UI. Show tool calls, messages, file changes live. | v0.8+ |
| Extended Thinking | Toggle thinking on/off. Configurable thinking levels. "Ultrathink" replaced with max thinking budget control. | v0.15.1+ |
| Model Picker | Change default model directly from chat interface | v0.36.2 |
| Subagent Rendering | Visualize subagent calls and prompts within the main conversation | v0.23.0+ |
| Terminal Reading | Claude can read terminal output | v0.29.5 |
| Agent Questions | Claude can ask the user multiple-choice questions (AskUserQuestion tool) | v0.31.1+ |
| Custom Agent Instructions | Per-repository custom instructions configurable in repo settings | v0.31.2 |
| Slash Commands | Claude Code slash commands work in Conductor (e.g., `/clear`, `/compact`, `/restart`) | v0.25.0 |
| Project-Level Slash Commands | Custom slash commands and agents per project | v0.9.0 |
| MCP Server Status | View MCP server statuses before message submission | v0.25.0 |
| Setup Scripts | Run setup scripts on workspace creation (configurable in conductor.json). Re-run from terminal panel. Claude-assisted script creation. | v0.11.0 |
| Run Scripts | Execute run scripts with `Cmd+R` (e.g., dev server). Configurable per project. | v0.9.0 |
| Environment Variables | Configure env vars per repository in Settings > Env. Integrated terminal respects tool version managers (mise, asdf, rbenv). | v0.22.4 |

### 2.3 Chat System

| Feature | Description | Version |
|---------|-------------|---------|
| Multiple Chats per Workspace | Open multiple Claude Code chats within a single workspace with `Cmd+T` | v0.17.0 |
| Conversation Thread | Chat-like UI: user prompts, agent responses with markdown, tool calls as collapsible sections, file change notifications inline, errors highlighted | v0.8+ |
| Chat Search | Search within chats with `Cmd+F` | v0.31.0 |
| Table of Contents | Navigate long chats via table of contents. Chat summaries with hover previews. | v0.32.0+ |
| Chat Summaries | Previous chat summaries carried to new tabs | v0.22.6 |
| Checkpoints/Revert | Save chat checkpoints. Revert to previous state (wipes conversation history and code changes back to that point). | v0.19.0 |
| Chat Tab Renaming | Rename chat tabs directly | v0.35.3 |
| Conversation Summaries | Auto-generated summaries for previous conversations | v0.22.6 |
| LaTeX Rendering | Full LaTeX math rendering in chat | v0.34.2 |
| Mermaid Diagrams | Render Mermaid diagrams inline. Fullscreen expansion. Uses Conductor theme colors. | v0.34.0+ |
| Clickable File Mentions | Click file paths in chat to view files. @-mention files in messages. | v0.27.1+ |
| Clickable Deeplinks | URLs in responses are clickable | v0.34.0 |
| Image Attachments | Drag-and-drop files from Finder. Auto-resize images exceeding 8,000px. Support for images over 5MB. | v0.15.0+ |
| Long Text Auto-Convert | Pasted text over threshold auto-converts to attachments | v0.9.0 |
| Copy Queued Messages | Copy queued user messages | v0.30.0 |
| Virtualized Rendering | Long chats use virtualized rendering for performance | v0.9.1 |
| Autoscroll | Smart autoscroll behavior | v0.8+ |
| Keyboard Chat Navigation | Arrow keys / vim keys (j/k) for navigating between messages | v0.28.0 |

### 2.4 Plan Mode & Tasks

| Feature | Description | Version |
|---------|-------------|---------|
| Plan Mode | Toggle plan mode — Claude creates structured implementation plans before coding | v0.21.0 |
| Interactive Planning | Claude asks questions during planning to clarify requirements | v0.28.0 |
| Plan Approval with Feedback | Approve plans with inline feedback before execution | v0.25.5 |
| Plan Hand-off | Hand a plan from one agent to another agent in the same workspace | v0.30.0 |
| Send Plans to New Chats | Copy/send plans to new chats for implementation | v0.22.7 |
| Tasks | Claude can organize its work into structured tasks for completing longer projects | v0.33.0 |
| Todos | Create todos that can block merges. Enter key for quick creation. Overflow handling. | v0.28.4 |

### 2.5 Code Review & Merge (Right Panel)

| Feature | Description | Version |
|---------|-------------|---------|
| Diff Viewer | Full diff viewer using "Pierre Diffs" engine. Syntax highlighting. Green additions, red deletions. Side-by-side or inline. | v0.36.0 |
| File Tree | All changed files with paths and per-file diff stats. Click to view individual diffs. | v0.8+ |
| File Explorer | Browse ALL workspace files (not just changed ones) | v0.16.0 |
| Merge Button | One-click merge of workspace branch into target branch | v0.8+ |
| Code Review by Claude | Claude comments directly on diffs. AI-powered code review with customizable prompts. | v0.29.0 |
| GitHub Comment Sync | PR comments from GitHub auto-synced to diffs. One-click comment fetching. | v0.25.4 |
| Draft Comments | Comments persist across app restarts | v0.29.0 |
| Historical Turn-by-Turn Diffs | View diffs per-message (what changed in each response) | v0.22.0 |
| Mark Files as Viewed | Mark files as viewed in diff viewer. `Ctrl+V` shortcut. Auto-navigate to next file after marking. | v0.29.1 |
| Incremental Diff Expansion | Expand diff context incrementally | v0.22.4 |
| Git Panel Grouping | Changes grouped into "Uncommitted" and "Committed" sections | v0.33.4 |
| Editable PR Titles/Descriptions | Edit PR titles and descriptions directly in Checks tab | v0.34.1 |
| File Context Menu | Right-click files for operations | v0.33.3 |
| Custom Review Prompts | Customize prompts for code review, PR creation, and branch renaming | v0.29.1 |
| Custom Review Model | Select which model performs code reviews | v0.22.6 |
| Change Target Branch | Change the target/base branch for merge | v0.28.7 |
| Markdown Preview | Markdown file preview in diff viewer | v0.14.6 |
| SVG Rendering Toggle | Toggle SVG file rendering | v0.31.0 |
| Open In IDE | Open diff files in external IDE (VS Code, Cursor, Xcode, Android Studio, Sourcetree, Fork) | v0.14.7+ |
| Copy Path | `Cmd+Shift+C` to copy file path | v0.21.0 |
| File Content Copy | Copy button for files and diffs | v0.25.0 |

### 2.6 Checks Tab (Unified Pre-Merge View)

| Feature | Description | Version |
|---------|-------------|---------|
| Unified Checks Tab | Single tab showing everything needed before merge: git status, CI actions, deployments, comments, todos | v0.31.1 |
| GitHub Actions Viewing | View GitHub Actions logs directly in Checks tab | v0.33.2 |
| GitHub Actions Re-run | Re-run failed GitHub Actions from within Conductor | v0.34.2 |
| Forward Failing CI | Send failing CI check output to Claude for automated fixes | v0.12.0 |
| Vercel Deployments | View Vercel and GitHub deployment status | v0.29.2 |
| CI Job Sorting | Sort CI jobs by runtime and state | v0.30.0 |
| PR Status Display | Show PR review status (approved, changes requested) | v0.20.0 |
| Draft PR Support | Create draft PRs via git panel | v0.9.0 |
| PR Templates | Detect and use PR templates from various locations | v0.22.4 |

### 2.7 Notes & Context

| Feature | Description | Version |
|---------|-------------|---------|
| Notes/Scratchpad | WYSIWYG rich markdown notes per workspace. Share with agents via `<notes>` tag. | v0.27.0+ |
| .context Directory | Per-workspace `.context` folder for storing attachments, plans, notes shared with agents | v0.28.1 |
| Context Window Indicator | Visual indicator showing how much of Claude's context window is used. Hover for breakdown. | v0.28.0 |
| Response Metadata | View timestamps, model info on hover over responses | v0.28.0 |
| Token/Cost Display | Show token usage and cost below responses (API key users) | v0.28.7 |
| Post-Merge Memory Update | After merging, option to have Claude "Update memory" (learn from mistakes/feedback) | v0.32.0 |
| Post-Merge Continue | After merging, option to "Continue on new branch" | v0.32.0 |

### 2.8 Git Operations

| Feature | Description | Version |
|---------|-------------|---------|
| Auto Worktree Creation | Automatic `git worktree add` with new branch on workspace creation | v0.8+ |
| Worktree Isolation | Each workspace has independent working directory | v0.8+ |
| Branch Management | Create, track, rename branches. Inline branch name editing. Custom branch prefix setting. | v0.17.3+ |
| Worktree Cleanup | On archive/delete: remove worktree directory, optionally prune branch | v0.8+ |
| Conflict Detection | Detect conflicts with base branch before merge | v0.8+ |
| Stats Computation | Lines added/removed per workspace via diff against base branch | v0.8+ |
| Git Status in Sidebar | Show git status (uncommitted changes, etc.) in workspace sidebar | v0.17.4 |
| Commit/Push Shortcut | `Cmd+Shift+Y` for quick commit and push | v0.36.9 |
| Auto-Save on Archive | Auto-saves git state and uncommitted files when archiving | v0.35.3 |
| Git State Reset | Reset git state when changing target branches | v0.31.0 |
| Checkout PRs | Check out PRs directly from the Dispatcher | v0.10.1 |
| Bundled GitHub CLI | `gh` CLI bundled with the app | v0.25.12 |

### 2.9 Integrations

| Integration | Features | Version |
|-------------|----------|---------|
| **GitHub** | PR management, Actions CI viewing/re-run, comment syncing, issue attachment in chat, Enterprise login, bundled `gh` CLI, PR template detection | v0.8+, Enterprise v0.22.4 |
| **Linear** | Open workspace from Linear issue, issue linking with `Cmd+I`, status-based organization, sorted chronologically, team-filtered search | v0.15.0+ |
| **Graphite** | Stack visualization in right sidebar | v0.32.0 |
| **Vercel** | Deployment viewing, CI status checks | v0.29.2 |
| **Chrome** | Claude Code for Chrome integration — testing, browsing, screenshots (enable in Settings > Chat) | v0.30.0 |
| **IDEs** | Open files in: VS Code, Cursor, Xcode (`xed`), Android Studio, Sourcetree, Fork. Smooth file opening. | Various |
| **MCP Servers** | Support for `.mcp.json` configuration. MCP server status display. MCP output truncation at 100k chars. | v0.25.0+ |

### 2.10 Integrated Terminal

| Feature | Description | Version |
|---------|-------------|---------|
| WebGL Terminal | High-performance terminal with WebGL rendering | v0.10.3 |
| Custom Terminal Fonts | Customizable monospace fonts | v0.9.0 |
| Big Terminal Mode | Expand terminal to full height | v0.22.4 |
| Terminal Focus | `Ctrl+backtick` to focus terminal | v0.18.0 |
| Terminal Clear | `Cmd+K` to clear terminal | v0.30.0 |
| Terminal Links | `Cmd+Click` for terminal links | v0.29.0 |
| Shell Support | Respects user's default SHELL and PATH. Full Fish shell support. Supports mise, asdf, rbenv. | v0.12.0+ |
| Localhost Detection | Auto-detect localhost URLs with `Cmd+Shift+O` | v0.9.1 |
| Setup Script Logs | View setup script execution logs | v0.31.0 |

### 2.11 Navigation & Search

| Feature | Description | Version |
|---------|-------------|---------|
| Command Palette | `Cmd+K` — search chats, workspaces, commands | v0.14.0 |
| File Picker | `Cmd+P` — fuzzy file search (10x faster on large codebases) | v0.20.0 |
| Chat Search | `Cmd+F` — search within chats | v0.31.0 |
| Workspace Search | `Cmd+Shift+F` — search workspaces by branch/repo/PR | v0.26.0 |
| Slash Command Autocomplete | Autocomplete anywhere in messages with fuzzy search | v0.31.1 |
| Arrow Key Navigation | Arrow keys in command palette and file picker | v0.15.0 |

### 2.12 Appearance & UI

| Feature | Description | Version |
|---------|-------------|---------|
| Dark Theme | Near-black dark theme matching developer tooling aesthetics | v0.8+ |
| Zen Mode | `Ctrl+Z` or `Cmd+.` — hide both sidebars for focused work | v0.19.0 |
| Sidebar Toggles | `[` and `]` keys, `Cmd+B` (left), `Option+Cmd+B` (right) | v0.28.0 |
| Resizable Panels | Three-panel layout with resizable dividers | v0.8+ |
| Custom Monospace Fonts | Configurable monospace font in Settings > Appearance | v0.28.1 |
| Zoom Controls | `Cmd+-` and `Cmd++` for zoom | v0.14.5 |
| Tufte Markdown | Toggle Tufte-style markdown rendering | v0.25.4 |
| Max Chat Width | Configurable maximum width for chats | v0.25.12 |
| Settings Page | Full-page dedicated settings (not dialog) | v0.25.0 |
| Favicon Detection | Repo favicons in sidebar | v0.31.0 |

### 2.13 macOS Native Features

| Feature | Description | Version |
|---------|-------------|---------|
| Native Mac App | Proper .app bundle distributed as .dmg (~124MB) | v0.8+ |
| macOS Notifications | Desktop notifications for: agent completed, agent errored, workspace ready to merge. Branch names in notifications. | v0.8+ |
| Auto-Updater | Automatic update detection and installation | v0.8+ |
| Menu Bar | Settings accessible from macOS menu bar. App/SDK version in help menu. | v0.9.2 |
| Xcode Detection | Xcode license detection on startup to prevent silent `gh` failures | v0.36.7 |
| Conductor Wrapped | Year-in-review feature (analytics/stats) | v0.25.1 |

### 2.14 Configuration (conductor.json)

```json
{
  "setup": ["npm install", "..."],
  "run": "npm run dev",
  "scripts": {
    "custom-script": "..."
  },
  "agents": {
    "instructions": "Custom agent instructions..."
  }
}
```

| Config Feature | Description |
|----------------|-------------|
| Setup Scripts | Commands run on workspace creation |
| Run Scripts | Dev server / run command |
| Custom Scripts | In-UI script editing in Settings |
| Agent Instructions | Per-repo custom instructions |
| Slash Commands | Custom slash commands per project |
| Hooks | Customizable global hooks and memory |
| Working Directories | Set working dirs for monorepos |

### 2.15 Spotlight Testing (Experimental)

Spotlight testing allows developers to test workspace changes in the repository's **root directory** instead of the isolated worktree. This is critical for projects that depend on directory context, have expensive initial builds, or rely on single-instance external resources (databases, ports).

| Feature | Description | Version |
|---------|-------------|---------|
| Spotlight Mode Toggle | Enable in Settings > Experimental > "Use spotlight testing". Activate per-workspace via spotlight button in UI. | v0.28.2 |
| One-Way File Sync | Changes flow from workspace → repo root only. Uses **watchexec** to monitor workspace for file changes. Only git-tracked files are synced (excludes `node_modules`, build artifacts). | v0.28.2 |
| Checkpoint Commit System | On each detected change, Conductor creates a checkpoint commit of workspace state, then checks out that commit in repo root. Ensures atomic, consistent updates. | v0.28.2 |
| Hot Reload Support | File watcher triggers checkpoint creation on save. If dev server supports hot reload (Vite, Next.js, webpack-dev-server), changes reflect automatically without restart. | v0.28.2 |
| Incremental Build Reuse | Since sync happens via git checkout, only changed files are updated. Projects with long initial builds but fast incremental builds benefit from reusing existing build artifacts in repo root. | v0.28.2 |
| Repo Root Terminal | When spotlight is active, a terminal opens in the repo root directory for running the app, tests, or any commands in the project's natural directory context. | v0.28.2 |
| State Restoration | Disabling spotlight mode restores the repo root to its original state, cleaning up all synced changes. | v0.28.2 |
| Conflict Detection | Blocks activation if git rebase or merge is in progress in either workspace or repo root. User must complete or abort the operation first. | v0.28.2 |

**Spotlight Testing Architecture:**

```
┌─────────────────────┐     watchexec      ┌──────────────────────┐
│  Conductor Workspace │ ──── detects ────→ │  Checkpoint Commit   │
│  (git worktree)      │     file change    │  (git commit)        │
└─────────────────────┘                     └──────────┬───────────┘
                                                       │
                                                  git checkout
                                                       │
                                                       ▼
                                            ┌──────────────────────┐
                                            │  Repository Root Dir │
                                            │  (original repo)     │
                                            │                      │
                                            │  Dev server detects  │
                                            │  changed files →     │
                                            │  hot reload triggers │
                                            └──────────────────────┘
```

**Key Use Cases:**
1. **Directory-dependent apps** — Apps with relative path references, config file location assumptions
2. **Long initial build / fast incremental** — Reuse existing `node_modules`, compiled assets, caches in repo root
3. **External resource dependencies** — Apps bound to specific ports, databases, or singleton services

**Implementation Notes (Rust):**
- Use `watchexec` crate or shell out to `watchexec` binary for file monitoring
- Sync only git-tracked files: use `git ls-files` to determine what to copy
- Checkpoint commits: use libgit2 to create lightweight commits on a detached/temp branch
- Checkout in repo root: `git checkout <checkpoint-hash> -- .` in the repo root directory
- On deactivate: `git checkout <original-hash> -- .` to restore original state
- Must check for in-progress rebase/merge before activation (check `.git/rebase-merge` or `.git/MERGE_HEAD`)

---

## 3. Technical Architecture (For our implementation)

> **Note:** Section 3 is informed by reverse-engineering the actual Conductor v0.36.9 binary, SQLite database (70 migrations), bundled scripts, and runtime process tree. Where Conductor's actual implementation is known, it is documented as "**Conductor actual:**" to guide our implementation.

### 3.1 Tech Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Desktop Shell | **Tauri 2.0** (Rust + WebKit) | Confirmed: Conductor uses Tauri 2.x with Wry/Tao. ~39MB core binary. |
| Frontend | **React 19 + TypeScript + Tailwind** | Conductor uses Vite (localhost:1420 dev server) + Zod for validation |
| State | **Zustand + React Query** | Frontend state in WebKit LocalStorage (panel layouts, drafts) |
| Backend Core | **Rust** (Tauri commands) | Process spawning, git ops, file watching, IPC |
| MCP Sidecar | **Node.js** (bundled v22.17.0) | **Critical layer**: Conductor runs a Node.js MCP server sidecar (`index.bundled.js`) that bridges Tauri↔Agent CLIs via JSON-RPC 2.0 |
| Process Mgmt | **tokio + tauri_plugin_shell** | Conductor uses `tauri_plugin_shell` for process/sidecar management |
| Database | **SQLite** via **sqlx** | Confirmed: `conductor.db` at `~/Library/Application Support/com.conductor.app/`. 8 tables, 70 migrations. |
| File Watching | **watchexec** (bundled binary) + **notify** (fsevents) | Conductor bundles watchexec v2.3.2 for spotlight sync. Rust-side uses notify/fsevents. |
| Git Ops | **Shell scripts** + git CLI | Conductor uses `checkpointer.sh` for checkpoint commits, `git-busy-check.sh` for status. Likely also libgit2 for diffs. |
| Diff Rendering | **Monaco Editor** or **CodeMirror 6** | "Pierre Diffs" engine for accurate rendering |
| Terminal | **xterm.js** + WebGL addon | Confirmed: WebGL terminal rendering |
| Markdown | **react-markdown** + remark/rehype plugins | LaTeX (KaTeX), Mermaid, GFM, syntax highlighting |

### 3.2 Conductor's Actual Architecture (Reverse-Engineered)

Conductor uses a **four-layer architecture** (not three as originally assumed):

```
┌─────────────────────────────────────────────────────────┐
│  Layer 1: React Frontend (WebKit WebView via Wry)       │
│  - Vite dev server (localhost:1420)                     │
│  - Zod schema validation (50+ types)                    │
│  - WebKit LocalStorage for UI state                     │
│  - Panel layouts, composer drafts, collapsed repos      │
└────────────────────┬────────────────────────────────────┘
                     │ Tauri IPC (window.__TAURI_INTERNALS__)
                     │
┌────────────────────▼────────────────────────────────────┐
│  Layer 2: Tauri Rust Backend                            │
│  - SQLite via sqlx (conductor.db, 8 tables)             │
│  - tauri_plugin_shell (process/sidecar spawning)        │
│  - tauri_plugin_updater (auto-updates)                  │
│  - tauri_plugin_notification (macOS notifications)      │
│  - notify/fsevents (file system watching)               │
│  - hyper-util (HTTP client for API calls)               │
└────────────────────┬────────────────────────────────────┘
                     │ JSON-RPC 2.0 (stdin/stdout)
                     │
┌────────────────────▼────────────────────────────────────┐
│  Layer 3: Node.js MCP Sidecar (index.bundled.js)        │
│  - Bundled Node.js v22.17.0 (arm64, 111MB)              │
│  - MCP Server providing tools to AI agents:             │
│    • GetWorkspaceDiff    • GetTerminalOutput             │
│    • AskUserQuestion     • DiffComment                   │
│    • EnterPlanMode       • ExitPlanMode                  │
│    • MultiEdit           • NotebookEdit                  │
│  - JSON-RPC 2.0 protocol with Rust layer                │
│  - Zod + AJV for schema validation                      │
└────────────────────┬────────────────────────────────────┘
                     │ MCP Protocol (stdio)
                     │
┌────────────────────▼────────────────────────────────────┐
│  Layer 4: Agent CLI Processes                           │
│  - claude CLI v2.1.62 (bundled, 187MB arm64)            │
│  - codex CLI v0.100.0 (bundled, 66MB arm64)             │
│  - Each spawned in its own git worktree directory       │
│  - Receives MCP tools from Layer 3                      │
└─────────────────────────────────────────────────────────┘

Supporting Processes:
  - watchexec v2.3.2 (bundled) — file watching for spotlight
  - gh v2.83.2 (bundled) — GitHub CLI operations
  - checkpointer.sh — git checkpoint save/restore/diff
  - spotlighter.sh — live file sync workspace→repo root
  - git-busy-check.sh — detect in-progress git operations
```

### 3.3 Bundled Binaries

Conductor bundles all dependencies to avoid system dependency issues. Stored at `~/Library/Application Support/com.conductor.app/bin/`:

| Binary | Size | Purpose |
|--------|------|---------|
| `claude` | 187 MB | Claude Code CLI v2.1.62 |
| `node` | 111 MB | Node.js v22.17.0 runtime for MCP sidecar |
| `codex` | 66 MB | OpenAI Codex CLI v0.100.0 |
| `gh` | 53 MB | GitHub CLI v2.83.2 |
| `watchexec` | 7 MB | File watcher v2.3.2 for spotlight sync |
| `index.bundled.js` | 1.1 MB | Node.js MCP server bundle |
| `checkpointer.sh` | 8.1 KB | Git checkpoint save/restore/diff |
| `spotlighter.sh` | 4.0 KB | Live file sync for spotlight testing |
| `git-busy-check.sh` | 1.2 KB | Detect in-progress git operations |

**Orchestra Decision:** We should similarly bundle agent CLIs or provide a first-run setup that installs them. The MCP sidecar (Node.js) is the most architecturally significant — we need to decide whether to:
- (a) Replicate with a Node.js sidecar (matches Conductor, easier MCP SDK access)
- (b) Implement MCP server in Rust (no Node.js dependency, smaller bundle)
- (c) Use the Claude Agent SDK directly from Rust

### 3.4 MCP Sidecar Architecture (Critical)

The Node.js MCP sidecar is how Conductor gives AI agents **workspace-aware tools**. Without it, agents wouldn't know about diffs, terminal state, or UI interactions.

**MCP Tools Provided to Agents:**

| Tool | Description |
|------|-------------|
| `GetWorkspaceDiff` | Returns the current diff for the workspace (used during PR creation, code review) |
| `GetTerminalOutput` | Reads terminal output so the agent can react to build errors, test results |
| `AskUserQuestion` | Prompts the user with a question (multiple-choice support) |
| `DiffComment` | Adds comments to specific lines in code diffs |
| `EnterPlanMode` | Switches the session to plan mode |
| `ExitPlanMode` | Exits plan mode, optionally with a plan |
| `MultiEdit` | Edit multiple files in a single operation |
| `NotebookEdit` | Edit Jupyter notebooks |

**Communication Flow:**
```
Agent CLI ←── MCP Protocol (stdio) ──→ Node.js Sidecar ←── JSON-RPC 2.0 ──→ Rust Backend ←── Tauri IPC ──→ React UI
```

When an agent calls `AskUserQuestion`:
1. Agent CLI sends MCP tool call to Node.js sidecar
2. Sidecar sends JSON-RPC request to Rust backend
3. Rust emits Tauri event to frontend
4. Frontend shows question UI to user
5. User answers → Tauri command → Rust → JSON-RPC response → Sidecar → MCP tool result → Agent continues

### 3.5 Checkpoint System (Reverse-Engineered)

Conductor implements a **non-destructive git checkpoint system** using private refs stored under `refs/conductor-checkpoints/`. This is the backbone of:
- Chat revert/undo
- Spotlight testing sync
- Archive state preservation
- Turn-by-turn diffs

**Checkpoint Types:**
| Ref Pattern | Purpose |
|-------------|---------|
| `conductor-archive-<workspace-uuid>` | Snapshot when archiving workspace |
| `cp-spotlight-<timestamp>-<pid>` | Live sync checkpoints from spotlighter |
| `pre-spotlight` | State before spotlight sync starts |
| `session-<uuid>-turn-<uuid>-end` | Checkpoint at end of each AI turn |
| `conductor-getdiff` | Temporary checkpoint for computing diffs |

**How checkpointer.sh works:**
1. **Save**: Creates a commit object (without moving HEAD) containing:
   - HEAD OID at save time
   - Index tree (staged state)
   - Worktree tree (full working tree including untracked files)
   - Timestamp metadata
   - Uses neutral identity: `Checkpointer <checkpointer@noreply>`
2. **Restore**: Performs `git reset --hard` to saved HEAD, then restores working tree and index from the checkpoint
3. **Diff**: Compares two checkpoint snapshots using `git diff`
4. Exit code 101 = skipped due to merge/rebase in progress

**spotlighter.sh** (live sync for Spotlight Testing):
- Uses `watchexec` to watch workspace for file changes
- On change: runs `checkpointer.sh save` in workspace, captures checkpoint ID
- Then runs `checkpointer.sh restore` in repo root with that checkpoint
- Ignores `*.tmp.*` files and `.context/**`
- Logs to `/tmp/conductor-spotlight-<pid>.log`

### 3.6 Data Storage Layout (Confirmed)

```
~/Library/Application Support/com.conductor.app/
  conductor.db              # Main SQLite database (8 tables, 70 migrations)
  bin/                      # Bundled binaries (copied from app bundle at runtime)
  .window-state.json        # Window position/size/maximize state

~/Library/WebKit/com.conductor.app/
  WebsiteData/              # WebKit LocalStorage, IndexedDB, cookies
    LocalStorage/           # Panel layouts, composer drafts, collapsed repos

~/conductor/
  workspaces/
    <repo-name>/            # e.g., "vectorshift", "sdk"
      <city-name>/          # e.g., "baton-rouge", "boston" (workspace name)
        .git                # Git worktree link file
        .context/
          notes.md          # Per-workspace notes
          todos.md          # Per-workspace todos
          attachments/      # Screenshots, pasted text, files
          plans/            # AI-generated plans (optional)
        <repo files...>     # Full repo checkout
  archived-contexts/
    <repo-name>/
      <city-name>/
        notes.md
        todos.md
        attachments/

/tmp/conductor-spotlight-<pid>.log    # Spotlighter process logs
```

### 3.7 Process Tree (Runtime)

When Conductor is running with active workspaces:

```
Conductor (Tauri main process)
├── Node.js sidecar (index.bundled.js) — MCP server
├── claude CLI (per active Claude session)
│   └── (child processes spawned by claude for tool execution)
├── codex CLI (per active Codex session)
├── watchexec (per active workspace — file watching)
│   └── checkpointer.sh / spotlighter.sh (triggered on file changes)
└── gh (spawned for GitHub API operations)
```

At runtime, Conductor was observed running **10 concurrent watchexec processes** for various workspaces.

### 3.8 Real-Time Output Streaming Architecture

- Each agent process spawned via `tauri_plugin_shell` sidecar management
- MCP sidecar (Node.js) handles structured communication with agent CLIs
- Agent output parsed by sidecar, forwarded via JSON-RPC to Rust backend
- Rust backend: (a) persists to SQLite via sqlx batch insert, (b) emits Tauri events to frontend
- Frontend listens via Tauri's `listen()` API and appends to Zustand store
- Backpressure: ring buffer if frontend overwhelmed. UI renders at 60fps regardless of event rate.
- On workspace switch: load historical messages from SQLite, then subscribe to live events
- `full_message` column stores complete JSON of agent API responses (including tool calls, results, costs)

---

## 4. Data Models (Real SQLite Schema from Conductor v0.36.9)

> **Source:** Extracted from `~/Library/Application Support/com.conductor.app/conductor.db`. This is the actual production schema with 8 tables and 70 migrations.

### repos (Repository configurations)

```sql
CREATE TABLE repos (
    id TEXT PRIMARY KEY,
    remote_url TEXT,
    name TEXT,
    default_branch TEXT DEFAULT 'main',
    root_path TEXT,                          -- Local filesystem path
    setup_script TEXT,                       -- Commands run on workspace creation
    archive_script TEXT,                     -- Commands run on workspace archive
    run_script TEXT,                         -- Dev server / run command
    run_script_mode TEXT DEFAULT 'concurrent', -- How run script executes
    remote TEXT,                             -- Git remote name
    storage_version INTEGER DEFAULT 1,       -- Schema version for repo data
    display_order INTEGER DEFAULT 0,         -- Drag-and-drop sidebar ordering
    conductor_config TEXT,                   -- Parsed conductor.json (JSON blob)
    custom_prompt_code_review TEXT,          -- Custom code review prompt
    custom_prompt_create_pr TEXT,            -- Custom PR creation prompt
    custom_prompt_rename_branch TEXT,        -- Custom branch rename prompt
    custom_prompt_general TEXT,              -- Custom general agent instructions
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### workspaces (Git worktree instances)

```sql
CREATE TABLE workspaces (
    id TEXT PRIMARY KEY,
    repository_id TEXT,                      -- FK to repos.id
    directory_name TEXT,                     -- City name (e.g., "baton-rouge")
    branch TEXT,                             -- Git branch name
    active_session_id TEXT,                  -- Currently active chat session
    state TEXT DEFAULT 'active',             -- initializing|ready|active|archived
    derived_status TEXT DEFAULT 'in-progress', -- in-progress|done (computed)
    manual_status TEXT,                      -- User-override status
    unread INTEGER DEFAULT 0,               -- Has unread messages
    pinned_at TEXT,                          -- Timestamp if pinned (NULL = unpinned)
    big_terminal_mode INTEGER DEFAULT 0,    -- Terminal expanded to full height
    initialization_parent_branch TEXT,       -- Branch this was forked from
    intended_target_branch TEXT,             -- Target branch for merge/PR
    linked_workspace_ids TEXT,              -- JSON array of linked workspace IDs
    notes TEXT,                             -- Inline workspace notes
    archive_commit TEXT,                    -- Git commit hash at time of archive
    pr_title TEXT,                          -- PR title (editable)
    pr_description TEXT,                    -- PR description (editable)
    setup_log_path TEXT,                    -- Path to setup script log
    initialization_log_path TEXT,           -- Path to init log
    initialization_files_copied INTEGER,    -- Files copied during init
    placeholder_branch_name TEXT,           -- Temp branch name during creation
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
-- Note: DEPRECATED_city_name and DEPRECATED_archived columns exist but are unused
```

### sessions (AI chat sessions)

```sql
CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    workspace_id TEXT,                       -- FK to workspaces.id
    status TEXT DEFAULT 'idle',              -- idle|error
    claude_session_id TEXT,                  -- Claude Code's internal session ID
    model TEXT,                              -- opus|sonnet (short names)
    agent_type TEXT,                         -- claude|codex|NULL
    permission_mode TEXT DEFAULT 'default',  -- default|plan
    title TEXT DEFAULT 'Untitled',           -- Auto-generated or manual title
    thinking_enabled INTEGER DEFAULT 1,      -- Extended thinking on/off
    codex_thinking_level TEXT,               -- low|medium|high|xhigh (Codex only)
    context_used_percent FLOAT,              -- Context window usage (0-100)
    unread_count INTEGER DEFAULT 0,          -- Unread messages in this session
    is_compacting INTEGER DEFAULT 0,         -- Currently running /compact
    is_hidden INTEGER DEFAULT 0,             -- Hidden from UI
    last_user_message_at TEXT,               -- Timestamp of last user message
    resume_session_at TEXT,                  -- When to resume (for queued sessions)
    freshly_compacted INTEGER DEFAULT 0,     -- Just finished compacting
    context_token_count INTEGER DEFAULT 0,   -- Token count in context
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_sessions_workspace_id ON sessions(workspace_id);
```

### session_messages (Chat messages)

```sql
CREATE TABLE session_messages (
    id TEXT PRIMARY KEY,
    session_id TEXT,                          -- FK to sessions.id
    role TEXT,                                -- user|assistant
    content TEXT,                             -- Display text content
    full_message TEXT,                        -- Complete JSON blob of API response
                                             -- (includes tool calls, costs, model info)
    model TEXT,                               -- e.g., "claude-opus-4-6"
    sdk_message_id TEXT,                      -- Claude SDK message ID
    turn_id TEXT,                             -- Groups messages in a single turn
    sent_at TEXT,                             -- When user sent / agent responded
    cancelled_at TEXT,                        -- If message was cancelled
    last_assistant_message_id TEXT,           -- Links to previous assistant msg
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_session_messages_sent_at ON session_messages(session_id, sent_at);
CREATE INDEX idx_session_messages_cancelled_at ON session_messages(session_id, cancelled_at);
CREATE INDEX idx_session_messages_turn_id ON session_messages(turn_id);
```

### attachments (File attachments for sessions)

```sql
CREATE TABLE attachments (
    id TEXT PRIMARY KEY,
    type TEXT,                                -- 'text'|'image'
    original_name TEXT,                       -- Original filename
    path TEXT,                                -- Filesystem path to attachment
    is_loading INTEGER DEFAULT 0,             -- Currently uploading
    session_id TEXT,                           -- FK to sessions.id
    session_message_id TEXT,                   -- FK to session_messages.id (NULL if draft)
    is_draft INTEGER DEFAULT 1,               -- Not yet sent with a message
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_attachments_session_id ON attachments(session_id);
CREATE INDEX idx_attachments_session_message_id ON attachments(session_message_id);
CREATE INDEX idx_attachments_is_draft ON attachments(is_draft);
```

### diff_comments (Code review comments on diffs)

```sql
CREATE TABLE diff_comments (
    id TEXT PRIMARY KEY,
    workspace_id TEXT,                        -- FK to workspaces.id
    file_path TEXT,
    line_number INTEGER,
    body TEXT,                                -- Comment content
    state TEXT,                               -- draft|published|resolved
    location TEXT,                            -- Where in the diff
    remote_url TEXT,                          -- GitHub comment URL if synced
    author TEXT,                              -- user|claude|github-username
    thread_id TEXT,                           -- Groups threaded comments
    reply_to_comment_id TEXT,                 -- Parent comment for replies
    created_at INTEGER NOT NULL,
    updated_at INTEGER
);
CREATE INDEX idx_diff_comments_workspace ON diff_comments(workspace_id);
```

### settings (Key-value app configuration)

```sql
CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

**Known settings keys:**
| Key | Example Value | Description |
|-----|---------------|-------------|
| `default_model` | `opus` | Default AI model |
| `branch_prefix_type` | `github_username` | How branches are named |
| `default_codex_thinking_level` | `high` | Default Codex thinking |
| `review_codex_thinking_level` | `high` | Review Codex thinking |
| `spotlight_testing` | `true` | Spotlight testing enabled |
| `mono_font` | `Geist Mono` | Custom monospace font |
| `markdown_style` | `default` | Markdown rendering style |
| `notifications_enabled` | `true` | macOS notifications |
| `sound_effects_enabled` | `true` | Sound effects |
| `show_cost_in_topbar` | `true` | Display token costs |
| `always_show_context_wheel` | `true` | Context usage indicator |
| `using_split_view` | `true` | Split view mode |
| `default_open_in` | `cursor` | Default IDE to open files |
| `conductor_api_token` | `<token>` | Conductor API auth |

### Notes on Schema

- **No separate `todos` table** — todos are stored in `.context/todos.md` files on disk
- **No separate `notes` table** — notes are in `.context/notes.md` and `workspaces.notes` column
- **No separate `env_vars` table** — env vars likely stored in `conductor_config` JSON or settings
- **Checkpoints are git refs** — stored as `refs/conductor-checkpoints/*`, not in SQLite
- **CI checks/deployments** — fetched live from GitHub API, not persisted in DB
- **All auto-update triggers** on repos, workspaces, sessions, settings tables for `updated_at`
- **70 migrations** track the full schema evolution from v0.8.2 to v0.36.9

---

## 5. Agent Adapter System

### 5.1 Agent Adapter Trait

```rust
trait AgentAdapter {
    fn name(&self) -> &'static str;
    fn supported_models(&self) -> Vec<ModelInfo>;
    fn spawn(
        &self,
        config: AgentConfig,
        workdir: &Path,
        env: &HashMap<String, String>,
    ) -> Result<AgentProcess>;
    fn parse_output(&self, raw: &str) -> Vec<AgentMessage>;
    fn send_input(&self, process: &mut AgentProcess, input: &str) -> Result<()>;
    fn send_cancel(&self, process: &mut AgentProcess) -> Result<()>;
    fn is_running(&self, process: &AgentProcess) -> bool;
    fn stop(&self, process: &mut AgentProcess) -> Result<()>;
    fn get_thinking_levels(&self) -> Vec<ThinkingLevel>;
    fn set_thinking_level(&self, process: &mut AgentProcess, level: ThinkingLevel) -> Result<()>;
}

struct AgentConfig {
    task_prompt: String,
    model: String,
    thinking_level: ThinkingLevel,
    custom_instructions: Option<String>,
    slash_commands: Vec<SlashCommand>,
    mcp_config: Option<McpConfig>,
    context_files: Vec<PathBuf>,
}

enum ThinkingLevel {
    Off,
    Low,
    Medium,
    High,
    ExtraHigh, // Codex xhigh
    Max,       // "ultrathink" / max budget
}
```

### 5.2 Claude Code Adapter

- **Spawn**: `claude --print --output-format stream-json` in worktree dir for structured JSON streaming
- Or interactive mode via PTY for tool call approvals
- **Auth**: Inherits from `~/.claude/` config. Supports API key, Pro/Max/Team plan, Bedrock, Vertex, custom provider
- **Output parsing**: JSON stream with type fields (text, tool_use, tool_result, thinking, etc.)
- **Thinking**: Toggle via `--thinking` flag or model-specific parameters
- **Slash commands**: Forward Claude Code slash commands (`/clear`, `/compact`, `/restart`)
- **MCP**: Pass `.mcp.json` configuration

### 5.3 Codex Adapter

- **Spawn**: `codex --quiet` or equivalent in worktree dir
- **Auth**: Inherits from existing codex CLI auth
- **Output parsing**: Parse markdown-formatted output, extract code blocks
- **Thinking levels**: Low, medium, high, xhigh (granular control)
- **Cancellation**: Immediate cancellation support
- **Live rendering**: Bash command output rendered in real-time

---

## 6. UI Specification

### 6.1 App Layout

Three-panel layout with resizable dividers and Zen Mode (hide all):

| Panel | Width | Content |
|-------|-------|---------|
| Left Sidebar | 240-300px (resizable, toggleable `Cmd+B`) | Repo selector, workspace list grouped by status, `+ New Workspace`, Settings gear |
| Center Panel | Flexible (fills remaining) | Tab bar (Home + workspace tabs + chat tabs), agent conversation, plan mode, task view |
| Right Panel | 300-500px (resizable, collapsible `Option+Cmd+B`) | Tabs: Changes/Diff, All Files, Checks, Notes, Review |

### 6.2 Workspace Sidebar Item

```
[Pin Icon] workspace-name
  branch-name (gray, smaller)
  [Status Badge] ● Running / Ready to merge / Errored
  [Stats] +303 / -532  (green/red)
  [PR] PR #432 title...
  [Unread dot if applicable]
```

Workspaces grouped under headers: **In Progress**, **In Review**, **Done**, **Backlog**

### 6.3 Composer Bar

```
[+ Attachments] [Model Picker ▾] [Thinking Toggle]
[Message input with slash command autocomplete...]
[Context indicator ████░░ 67%] [MCP status dots]
[Send button]
```

### 6.4 Checks Tab Layout

```
┌─ Git Status ──────────────────────┐
│ 3 uncommitted files               │
│ 12 committed files                │
├─ CI Actions ──────────────────────┤
│ ✓ build (1m 23s)                  │
│ ✗ test-e2e (2m 41s) [Re-run] [→] │
│ ● deploy-preview (running)        │
├─ Deployments ─────────────────────┤
│ ✓ Vercel preview: https://...     │
├─ Comments ────────────────────────┤
│ 2 unresolved comments             │
├─ Todos ───────────────────────────┤
│ ☐ Add error handling (blocks)     │
│ ☑ Update tests                    │
├─ PR Info ─────────────────────────┤
│ [Editable Title] [Editable Desc]  │
│ [Merge Button]                    │
└───────────────────────────────────┘
```

### 6.5 Design Tokens

| Token | Value | Usage |
|-------|-------|-------|
| Background | `#0D0D0D` | Main app background |
| Surface | `#1A1A1A` | Sidebar, cards |
| Surface Elevated | `#252525` | Hover states, active workspace |
| Text Primary | `#E8E8E8` | Main text |
| Text Secondary | `#888888` | Muted text, stats, timestamps |
| Accent | `#7C8AFF` | Links, active items |
| Success | `#34A853` | Ready to merge, additions, passing CI |
| Error | `#FF6B6B` | Errors, deletions, failing CI |
| Warning | `#FFA726` | Warnings, pending |
| Border | `#333333` | Panel dividers |
| Font UI | System sans-serif | Labels, navigation |
| Font Code | Configurable monospace (default: system) | Code, terminal, diffs, stats |

---

## 7. Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+Shift+N` | New workspace |
| `Cmd+T` | New chat tab in workspace |
| `Cmd+K` | Command palette |
| `Cmd+P` | File picker |
| `Cmd+F` | Search in chat |
| `Cmd+Shift+F` | Search workspaces |
| `Cmd+R` | Focus run tab / run script |
| `Cmd+Shift+Y` | Commit and push |
| `Cmd+Shift+O` | Open localhost URL |
| `Cmd+Shift+C` | Copy file path |
| `Cmd+I` | Link Linear issue |
| `Cmd+B` | Toggle left sidebar |
| `Option+Cmd+B` | Toggle right sidebar |
| `Cmd+.` or `Ctrl+Z` | Zen mode (hide both sidebars) |
| `Ctrl+backtick` | Focus terminal |
| `Cmd+K` (in terminal) | Clear terminal |
| `Cmd+,` | Repository settings |
| `Cmd+?` | Shortcuts help |
| `Cmd+Shift` | Toggle thinking visibility |
| `Ctrl+V` | Mark file as viewed |
| `[` / `]` | Toggle left/right sidebar |
| `j` / `k` | Navigate chat messages (vim) |
| `Cmd+-` / `Cmd++` | Zoom out/in |
| `Cmd+A` | Select all (scoped, not full app) |

---

## 8. Implementation Roadmap

### Phase 1: Foundation + Single Agent (Weeks 1–3)

Get from zero to a working app that can run one Claude Code agent in one workspace.

- Scaffold Tauri 2.0 + React + TypeScript + Tailwind project
- Build three-panel layout shell with resizable dividers
- Implement repo registration (add repo path, store in SQLite)
- Implement git worktree creation via libgit2
- Implement Claude Code adapter: spawn CLI, capture PTY output, parse JSON stream
- Display streaming agent output in center panel (conversation view)
- Basic workspace lifecycle: create → running → completed
- Composer bar with text input and send
- **Deliverable**: Add a repo, create a workspace, watch Claude Code work, see it finish.

### Phase 2: Multi-Workspace + Code Review (Weeks 4–6)

Scale to multiple concurrent workspaces and add the review panel.

- Multiple concurrent workspaces with parallel agent processes
- Sidebar workspace list with real-time status indicators and stats
- Tab bar for switching between workspaces
- Diff computation via libgit2
- ReviewPanel: file tree with change stats, diff viewer (Monaco/CodeMirror)
- Merge functionality: merge worktree branch into base
- Workspace status progression: running → ready to merge → merged
- Git panel with uncommitted/committed grouping
- **Deliverable**: Run 3+ agents in parallel, review all changes, merge.

### Phase 3: Chat System + Planning (Weeks 7–9)

Build the complete chat experience and planning features.

- Multiple chats per workspace with `Cmd+T`
- Plan mode toggle with interactive planning
- Chat checkpoints and revert
- Chat search (`Cmd+F`)
- Table of contents with chat summaries
- Command palette (`Cmd+K`)
- File picker (`Cmd+P`)
- Slash command autocomplete
- LaTeX and Mermaid rendering
- Extended thinking toggle
- Agent question handling (multiple choice)
- **Deliverable**: Full chat experience with planning, checkpoints, and search.

### Phase 4: Integrations + Checks (Weeks 10–12)

Add GitHub, Linear, CI integrations and the Checks tab.

- GitHub integration: PR management, Actions viewing/re-run, comment syncing, issue attachment
- Linear integration: issue linking, workspace creation from issues
- Unified Checks tab: CI status, deployments, todos, comments
- Forward failing CI to Claude
- Code review by Claude with customizable prompts
- Vercel deployment viewing
- Draft comments that persist
- Editable PR titles/descriptions
- **Deliverable**: Full integration suite with unified pre-merge view.

### Phase 5: Codex + Terminal + Notes (Weeks 13–15)

Add Codex support, terminal, notes, and advanced features.

- Codex adapter with thinking levels and cancellation
- Model picker in chat
- Integrated terminal (xterm.js + WebGL)
- Setup/run scripts with conductor.json
- Notes/scratchpad per workspace
- .context directory support
- Environment variable management
- Workspace forking
- Tasks and todos (with merge blocking)
- Token/cost tracking
- **Deliverable**: Full agent support with terminal, notes, and workspace tools.

### Phase 6: Polish + Open Source Launch (Weeks 16–18)

- Zen mode, keyboard navigation, all keyboard shortcuts
- Workspace status columns (Backlog/In Progress/In Review/Done)
- Pinned workspaces, mark unread
- macOS notifications, menu bar integration
- Custom fonts, zoom, appearance settings
- Performance optimization (10+ concurrent agents)
- Comprehensive error handling
- CLI companion tool
- Documentation: README, architecture guide, contributing guide, agent adapter guide
- CI/CD: GitHub Actions for build, test, notarize, release
- Distribution: Homebrew cask, GitHub Releases with signed .dmg
- **Deliverable**: Public open-source release.

---

## 9. Repository Structure

```
open-conductor/
├── src-tauri/                          # Rust backend
│   ├── src/
│   │   ├── main.rs                     # Tauri app entry
│   │   ├── workspace.rs                # Workspace CRUD, lifecycle, status machine
│   │   ├── agents/
│   │   │   ├── mod.rs                  # AgentAdapter trait
│   │   │   ├── claude.rs               # Claude Code adapter
│   │   │   └── codex.rs                # Codex adapter
│   │   ├── git.rs                      # Worktree, diff, merge, stats via libgit2
│   │   ├── checkpoint.rs               # Checkpoint save/restore/diff (Rust wrapper for shell scripts)
│   │   ├── process.rs                  # Sidecar/process spawning, I/O streaming
│   │   ├── db.rs                       # SQLite schema via sqlx, migrations, queries
│   │   ├── commands.rs                 # Tauri IPC command handlers
│   │   ├── events.rs                   # Tauri event definitions, emitters
│   │   ├── config.rs                   # App settings, conductor.json parsing
│   │   ├── checks.rs                   # CI status, deployments aggregation
│   │   ├── integrations/
│   │   │   ├── github.rs               # GitHub API (PRs, Actions, Issues, Comments)
│   │   │   ├── linear.rs               # Linear API
│   │   │   ├── graphite.rs             # Graphite stacks
│   │   │   └── vercel.rs               # Vercel deployments
│   │   ├── review.rs                   # Code review orchestration
│   │   ├── notes.rs                    # Notes/context management
│   │   ├── chat.rs                     # Chat store, checkpoints, search
│   │   ├── scripts.rs                  # Setup/run script execution
│   │   └── spotlight.rs                # Spotlight testing: watchexec, checkpoint sync
│   ├── migrations/                     # sqlx migrations (numbered .sql files)
│   ├── bin/                            # Shell scripts bundled with app
│   │   ├── checkpointer.sh             # Git checkpoint save/restore/diff
│   │   ├── spotlighter.sh              # Live file sync workspace→repo root
│   │   └── git-busy-check.sh           # Detect in-progress git operations
│   ├── Cargo.toml
│   └── tauri.conf.json
├── sidecar/                            # Node.js MCP sidecar
│   ├── src/
│   │   ├── index.ts                    # MCP server entry point
│   │   ├── rpc-server.ts               # JSON-RPC 2.0 server for Rust↔Node communication
│   │   ├── tools/
│   │   │   ├── get-workspace-diff.ts   # GetWorkspaceDiff MCP tool
│   │   │   ├── get-terminal-output.ts  # GetTerminalOutput MCP tool
│   │   │   ├── ask-user-question.ts    # AskUserQuestion MCP tool
│   │   │   ├── diff-comment.ts         # DiffComment MCP tool
│   │   │   ├── plan-mode.ts            # EnterPlanMode/ExitPlanMode MCP tools
│   │   │   ├── multi-edit.ts           # MultiEdit MCP tool
│   │   │   └── notebook-edit.ts        # NotebookEdit MCP tool
│   │   └── schemas/                    # Zod schemas for tool validation
│   ├── package.json
│   ├── tsconfig.json
│   └── build.ts                        # esbuild config → index.bundled.js
├── src/                                # React frontend
│   ├── App.tsx                         # Root layout with three-panel structure
│   ├── components/
│   │   ├── Sidebar/
│   │   │   ├── RepoSelector.tsx
│   │   │   ├── WorkspaceList.tsx       # Status-grouped workspace list
│   │   │   ├── WorkspaceItem.tsx       # Individual workspace card
│   │   │   └── NewWorkspaceDialog.tsx  # Agent/model/task/issue selection
│   │   ├── Chat/
│   │   │   ├── ConversationThread.tsx  # Virtualized message list
│   │   │   ├── ChatTabs.tsx            # Multiple chats per workspace
│   │   │   ├── Composer.tsx            # Input with attachments, model picker, context indicator
│   │   │   ├── ToolCallCard.tsx        # Collapsible tool call display
│   │   │   ├── ThinkingBlock.tsx       # Extended thinking display
│   │   │   ├── PlanMode.tsx            # Plan mode UI with approval
│   │   │   ├── TaskView.tsx            # Task organization display
│   │   │   ├── AgentQuestion.tsx       # Multiple-choice question UI
│   │   │   └── TableOfContents.tsx     # Chat navigation
│   │   ├── Review/
│   │   │   ├── DiffViewer.tsx          # Monaco/CodeMirror diff rendering
│   │   │   ├── FileTree.tsx            # Changed files with stats
│   │   │   ├── FileExplorer.tsx        # Full workspace file browser
│   │   │   ├── ReviewComments.tsx      # Draft/synced comments on diffs
│   │   │   ├── MergeButton.tsx
│   │   │   └── MarkViewed.tsx          # File viewed tracking
│   │   ├── Checks/
│   │   │   ├── ChecksTab.tsx           # Unified pre-merge view
│   │   │   ├── CIActions.tsx           # GitHub Actions with re-run
│   │   │   ├── Deployments.tsx         # Vercel/GitHub deployments
│   │   │   ├── TodoList.tsx            # Merge-blocking todos
│   │   │   └── PRInfo.tsx              # Editable PR title/description
│   │   ├── Notes/
│   │   │   ├── NotesEditor.tsx         # WYSIWYG rich markdown
│   │   │   └── ContextDir.tsx          # .context directory manager
│   │   ├── Terminal/
│   │   │   └── Terminal.tsx            # xterm.js + WebGL
│   │   ├── Navigation/
│   │   │   ├── CommandPalette.tsx      # Cmd+K search
│   │   │   ├── FilePicker.tsx          # Cmd+P fuzzy search
│   │   │   └── TabBar.tsx              # Home + workspace + chat tabs
│   │   ├── Spotlight/
│   │   │   ├── SpotlightButton.tsx     # Activate/deactivate spotlight mode
│   │   │   └── SpotlightTerminal.tsx   # Repo root terminal for testing
│   │   └── Settings/
│   │       ├── SettingsPage.tsx         # Full-page settings
│   │       ├── ChatSettings.tsx
│   │       ├── AppearanceSettings.tsx
│   │       ├── GitSettings.tsx
│   │       ├── EnvSettings.tsx
│   │       └── AgentSettings.tsx
│   ├── hooks/
│   │   ├── useWorkspace.ts             # Workspace CRUD IPC
│   │   ├── useAgentEvents.ts           # Real-time agent event listener
│   │   ├── useChat.ts                  # Chat operations
│   │   ├── useDiff.ts                  # Diff computation
│   │   ├── useChecks.ts                # CI/deployment status
│   │   ├── useRepos.ts                 # Repo management
│   │   ├── useNotes.ts                 # Notes CRUD
│   │   └── useKeyboard.ts             # Keyboard shortcut registration
│   ├── stores/
│   │   ├── workspaceStore.ts           # Active workspace, list, status
│   │   ├── chatStore.ts                # Messages, checkpoints
│   │   ├── uiStore.ts                  # Panel sizes, theme, zen mode
│   │   └── settingsStore.ts            # User preferences
│   └── lib/
│       ├── markdown.ts                 # Markdown renderer config (LaTeX, Mermaid)
│       └── ipc.ts                      # Tauri IPC typed wrappers
├── conductor-cli/                      # Rust CLI companion binary
├── docs/
│   ├── architecture.md
│   ├── contributing.md
│   └── agent-adapter-guide.md
├── scripts/
│   ├── build.sh
│   ├── release.sh
│   └── notarize.sh
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── README.md
```

---

## 10. Security Model

Following Conductor's approach — Orchestra does NOT manage API keys.

| Principle | Implementation |
|-----------|---------------|
| Zero Auth Management | Claude Code uses `~/.claude/` config. Codex uses its own auth. Conductor just spawns CLIs. |
| No API Keys Stored | Auth is delegated; nothing sensitive in Conductor's DB |
| Local-Only | All code, worktrees, outputs stay on user's Mac. No telemetry, no cloud sync. |
| Process Isolation | Each agent is a separate OS process in its own worktree directory |
| Git Safety | Worktrees branched off current state. Main branch never directly modified by agents. |
| Merge Gating | Agents cannot auto-merge. User must review and click Merge. Todos can block merge. |
| Env Var Protection | Environment variables encrypted at rest in SQLite |
| macOS Code Signing | Distribute with Apple notarization for Gatekeeper compliance |
| Strict Data Privacy | Option to disable AI-generated titles (which use external model). All processing local. |

---

## 11. Orchestra vs Conductor.build — Differentiators

| Feature | Description |
|---------|-------------|
| **Open Source (MIT)** | Full source code. Community contributions. Fork and customize. No vendor lock-in. |
| **Plugin Agent System** | Documented AgentAdapter trait for adding agents (Aider, Goose, Continue, custom). Conductor only supports Claude Code + Codex. |
| **CLI Companion** | Full CLI for scripting: create workspaces, queue tasks, merge from terminal. CI/CD integration. |
| **Cost Tracking** | Per-workspace token usage and cost tracking by parsing agent output. |
| **Workspace Templates** | Save/reuse workspace configs (agent + prompt + tool permissions) as templates. |
| **Export/Import** | Export workspace logs, diffs, conversation history as markdown or JSON. |
| **Linux Support** | Tauri supports Linux. Ship Linux builds alongside macOS. |
| **Custom Themes** | Full theme customization beyond dark mode. |
| **Webhook Integration** | Webhook support for external notifications (Slack, Discord, etc.) |

---

## 12. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Claude Code CLI output format changes | Agent adapter breaks | Version-pin parsing. Support `--output-format` flag. Community PRs. |
| PTY handling complexity | Agent behavior changes without terminal | Use `portable-pty`. Test with `TERM=xterm-256color`. Fallback to pipe mode. |
| libgit2 worktree edge cases | Corrupted worktrees | Error recovery wrappers. Manual cleanup commands. Integration tests. |
| 10+ concurrent agents = resource exhaustion | System unresponsive | Configurable concurrency limit. Resource monitoring. User warnings. |
| Tauri WebView rendering differences | UI inconsistency across macOS versions | WebView2 baseline features only. Test on macOS 13/14/15. |
| Agent auth edge cases | CLI not logged in | Detect auth errors early. Clear message: "Please run `claude login` first." |
| GitHub API rate limiting | Integration failures | Reduced polling for inactive workspaces. Caching. Exponential backoff. Bundled `gh` CLI. |
| Large diff computation | UI freeze | Paginate 50+ file diffs. Lazy-load file contents. Background computation. |
| MCP server compatibility | Tools not loading | Show MCP status before submission. Error reporting. Truncation at 100k chars. |

---

## 13. Success Criteria

Orchestra v1.0 is successful when:

1. A user can go from `brew install --cask open-conductor` to running 3 parallel Claude Code agents in **under 5 minutes**
2. Each agent works in full isolation (git worktree), changes reviewable in a clean diff viewer
3. Merging is a **one-click** operation with pre-merge checks (CI, todos, reviews)
4. The app uses **less than 80MB** of memory with no active agents, scales linearly
5. A new agent type can be added by implementing `AgentAdapter` in **under 200 lines** of Rust
6. Multiple chats per workspace, checkpoints, plan mode, and task management all work smoothly
7. GitHub, Linear, and Vercel integrations provide real value for the dev workflow
8. The project reaches **1000+ GitHub stars** within 3 months of launch

---

## Appendix A: Model Support Matrix

| Model | Provider | Thinking Levels | Added |
|-------|----------|----------------|-------|
| Opus 4.6 | Anthropic | On/Off | Feb 2026 |
| Sonnet 4.6 | Anthropic | On/Off | Feb 2026 |
| Opus 4.5 | Anthropic | On/Off | Nov 2025 |
| Haiku 4.5 | Anthropic | On/Off | Oct 2025 |
| Sonnet 4.5 | Anthropic | On/Off | Sep 2025 |
| GPT-5.3-Codex | OpenAI | Low/Med/High/XHigh | Feb 2026 |
| GPT-5.3-Codex-Spark | OpenAI | Low/Med/High/XHigh | Feb 2026 |
| GPT-5.2-Codex | OpenAI | Low/Med/High/XHigh | Dec 2025 |
| GPT-5.2 | OpenAI | Low/Med/High/XHigh | Dec 2025 |
| GPT-5.1-Codex-Max | OpenAI | Low/Med/High/XHigh | Nov 2025 |
| GPT-5.1 | OpenAI | Low/Med/High/XHigh | Nov 2025 |
| GPT-5-Codex-Mini | OpenAI | Low/Med/High | Nov 2025 |

## Appendix B: Version History Highlights

| Version | Date | Milestone |
|---------|------|-----------|
| v0.8.2 | Aug 26, 2025 | Earliest recorded release |
| v0.9.0 | Sep 1, 2025 | Run scripts, custom hooks, slash commands, docs launch |
| v0.11.0 | Sep 19, 2025 | conductor.json configuration |
| v0.13.6 | Sep 30, 2025 | Bedrock/Vertex/Custom provider support |
| v0.15.0 | Oct 17, 2025 | Linear integration |
| v0.17.0 | Oct 24, 2025 | Multiple chats per workspace |
| v0.18.0 | Oct 31, 2025 | Codex agent integration |
| v0.19.0 | Nov 5, 2025 | Checkpoints with revert |
| v0.21.0 | Nov 10, 2025 | Plan mode |
| v0.22.0 | Nov 12, 2025 | Code review + historical diffs |
| v0.25.0 | Dec 3, 2025 | Slash commands, MCP status, workspace storage |
| v0.27.0 | Dec 18, 2025 | Notes/scratchpad |
| v0.28.0 | Dec 22, 2025 | Workspaces page, context indicator, interactive planning |
| v0.29.0 | Jan 7, 2026 | Claude commenting on diffs |
| v0.30.0 | Jan 13, 2026 | Chrome integration, plan hand-off |
| v0.31.1 | Jan 16, 2026 | Unified Checks tab |
| v0.32.0 | Jan 22, 2026 | GitHub issues, Graphite stacks, table of contents |
| v0.33.0 | Jan 27, 2026 | Tasks feature |
| v0.35.0 | Feb 11, 2026 | Workspace status columns |
| v0.36.0 | Feb 17, 2026 | Pierre Diffs engine, Sonnet 4.6 |
| v0.36.9 | Feb 27, 2026 | Latest release (keyboard shortcuts, performance) |

---

*Orchestra — Built for the community, by the community.*
*PRD v2.0 — Compiled from 117 releases, 38 documentation pages, and full product analysis.*
