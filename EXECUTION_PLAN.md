# Orchestra — EXECUTION PLAN

**Agent-executable implementation plan for building Orchestra.**
**Reference:** `TECHNICAL_PRD.md` contains full feature inventory, reverse-engineered architecture, and real database schemas.
**Format:** Optimized for Ralph Loop autonomous execution.

---

## RALPH LOOP PROTOCOL

### Each Iteration
1. Read this `EXECUTION_PLAN.md` for current task status
2. Read `CLAUDE.md` for codebase patterns and memory
3. Pick the **first unchecked `- [ ]` item** in the current phase
4. Read all relevant files before editing
5. Implement the feature completely, including tests
6. Run validation: `pnpm tauri build` (Rust) + `pnpm typecheck` + `pnpm test` (frontend)
7. Mark the item as `- [x]` in this file
8. Commit: `feat(P<phase>-<number>): <description>`
9. If all items in current phase are checked, verify the **PHASE GATE** criteria
10. Continue to next item

### Guardrails
- **Always read files before editing** — never guess at file contents
- **Never skip failing tests** — fix before moving on
- **Don't refactor unrelated code** — stay focused on the current task
- **Keep changes minimal** — implement exactly what's specified
- **Use the exact CSS variable names** from the theme section
- **All Tauri commands return `Result<T, E>`** — surface errors as structured JSON
- **Frontend never touches SQLite** — everything goes through Tauri commands
- **Use Indian district names** for auto-generated workspace names (not city names)

### Completion Signal
When ALL checkboxes in ALL phases are checked: `<promise>COMPLETE</promise>`

### HARD STOP Convention
Lines marked `**HARD STOP**` require full build + test validation before proceeding.

---

## PROJECT OVERVIEW

Build a **Tauri 2.0 desktop app** (Rust + React) that orchestrates multiple AI coding agents (Claude Code, Codex) in parallel git worktrees. Users add repos, spawn agents on tasks, monitor progress, review diffs, and merge — all from a warm, comfortable UI.

**Tech Stack:**
- Tauri 2.0 (Rust backend + WebKit WebView)
- React 19 + TypeScript + Vite + Tailwind CSS 4
- SQLite via sqlx (Rust) with migrations
- rmcp v1.0 (Rust MCP SDK) — embedded MCP server for agent tools
- git2-rs (libgit2) for git operations
- xterm.js + WebGL for terminal
- Monaco Editor for diffs

**Key architectural decision:** We use `rmcp` (Rust MCP SDK) instead of a Node.js sidecar. This gives us a **3-layer architecture** (React → Rust → Agent CLIs) instead of Conductor's 4-layer approach, eliminating 112MB of Node.js runtime from the bundle.

---

## WORKSPACE NAMING: INDIAN DISTRICTS

Instead of city names (like Conductor's "baton-rouge", "boston"), Orchestra uses **Indian district names** for auto-generated workspace names. Examples:

```
~/open-conductor/workspaces/
  my-repo/
    anand/          # Gujarat
    wayanad/        # Kerala
    kodagu/         # Karnataka
    kullu/          # Himachal Pradesh
    tawang/         # Arunachal Pradesh
    leh/            # Ladakh
    munger/         # Bihar
    nilgiris/       # Tamil Nadu
    coorg/          # Karnataka (alt)
    shimoga/        # Karnataka
    palakkad/       # Kerala
    almora/         # Uttarakhand
    kangra/         # Himachal Pradesh
    ratnagiri/      # Maharashtra
    sikar/          # Rajasthan
    ernakulam/      # Kerala
    darjeeling/     # West Bengal
    chamoli/        # Uttarakhand
    idukki/         # Kerala
    nainital/       # Uttarakhand
```

Implementation: Store a list of 200+ Indian district names in `src-tauri/src/names.rs`. On workspace creation, pick a random unused name for that repo. Names are lowercase, hyphenated if multi-word (e.g., `north-goa`, `south-goa`).

---

## THEME: WARM OCHRE / BROWN

The app should feel **homely, warm, and comforting** — like a well-worn leather desk in a cozy study. Not cold/corporate dark mode.

### Color Palette

```css
:root {
  /* Backgrounds — warm dark tones */
  --bg-base: #1C1714;           /* Deep warm brown-black (main background) */
  --bg-surface: #241F1A;        /* Warm dark brown (sidebar, cards) */
  --bg-surface-hover: #2E2722;  /* Slightly lighter on hover */
  --bg-surface-active: #38302A; /* Active/selected state */
  --bg-elevated: #3D342D;       /* Elevated surfaces (dialogs, dropdowns) */
  --bg-input: #1E1915;          /* Input fields */

  /* Text — warm off-whites and tans */
  --text-primary: #F0E6D6;      /* Warm cream (primary text) */
  --text-secondary: #A89882;    /* Muted tan (secondary text, timestamps) */
  --text-tertiary: #7A6E5E;     /* Dim brown (placeholders, disabled) */

  /* Accent — ochre/amber spectrum */
  --accent-primary: #D4935A;    /* Warm ochre (primary accent, links, active) */
  --accent-hover: #E0A76B;      /* Lighter ochre on hover */
  --accent-muted: #8B6B42;      /* Muted amber (subtle highlights) */
  --accent-bg: rgba(212, 147, 90, 0.12); /* Ochre tint for backgrounds */

  /* Semantic colors */
  --success: #7FB069;           /* Sage green (additions, passing CI, merge ready) */
  --success-bg: rgba(127, 176, 105, 0.12);
  --error: #D4644A;             /* Terracotta red (errors, deletions, failing CI) */
  --error-bg: rgba(212, 100, 74, 0.12);
  --warning: #D4A843;           /* Golden amber (warnings, pending) */
  --warning-bg: rgba(212, 168, 67, 0.12);
  --info: #7B9EB8;              /* Dusty blue (info, neutral badges) */

  /* Borders and dividers */
  --border: #3A322B;            /* Warm brown border */
  --border-subtle: #2E2722;     /* Very subtle dividers */
  --border-focus: #D4935A;      /* Focus ring (ochre) */

  /* Diff colors — warm-tinted */
  --diff-add-bg: rgba(127, 176, 105, 0.15);   /* Green tint for additions */
  --diff-add-text: #A8D49A;
  --diff-remove-bg: rgba(212, 100, 74, 0.15);  /* Red tint for deletions */
  --diff-remove-text: #E8907A;

  /* Scrollbar */
  --scrollbar-thumb: #4A3F36;
  --scrollbar-thumb-hover: #5A4E44;

  /* Shadows — warm-tinted */
  --shadow-sm: 0 1px 2px rgba(20, 15, 10, 0.3);
  --shadow-md: 0 4px 12px rgba(20, 15, 10, 0.4);
  --shadow-lg: 0 8px 24px rgba(20, 15, 10, 0.5);

  /* Typography */
  --font-ui: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  --font-mono: 'Geist Mono', 'JetBrains Mono', 'Fira Code', 'SF Mono', monospace;
  --font-size-xs: 11px;
  --font-size-sm: 12px;
  --font-size-base: 13px;
  --font-size-md: 14px;
  --font-size-lg: 16px;
  --font-size-xl: 20px;

  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;

  /* Radius */
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-xl: 12px;
}
```

### Typography Rules
- UI labels: `--font-ui` at `--font-size-sm` (12px)
- Body text / chat messages: `--font-ui` at `--font-size-base` (13px)
- Code / terminal / diffs / stats: `--font-mono` at `--font-size-sm` (12px)
- Section headers: `--font-ui` at `--font-size-md` (14px), semi-bold
- Page titles: `--font-ui` at `--font-size-lg` (16px), bold

### Component Styling Guidelines
- **Sidebar**: `--bg-surface` background, 1px `--border-subtle` right border
- **Active workspace**: `--bg-surface-active` with 2px left border in `--accent-primary`
- **Cards/panels**: `--bg-surface` with `--border` border, `--radius-md`
- **Buttons primary**: `--accent-primary` bg, `--bg-base` text, `--radius-md`
- **Buttons secondary**: transparent bg, `--accent-primary` text, `--border` border
- **Input fields**: `--bg-input` bg, `--border` border, `--border-focus` on focus
- **Badges**: pill-shaped `--radius-xl`, using semantic color backgrounds
- **Tooltips**: `--bg-elevated` bg, `--shadow-md`
- **Scrollbars**: thin (6px), `--scrollbar-thumb`, round
- **Focus rings**: 2px `--border-focus` outline with 2px offset
- **Transitions**: 150ms ease for colors, 200ms ease for transforms

---

## FEATURE CHECKLIST (Implementation Order)

Each feature is a discrete unit of work. Implement in this exact order. Each item has measurable acceptance criteria.

---

### PHASE 1: Project Scaffold (P1-*)

- [x] **P1-01: Initialize Tauri 2.0 project**
  - Run `pnpm create tauri-app` with React + TypeScript + Vite template
  - Configure `tauri.conf.json`: bundle identifier `com.openconductor.app`, window title "Orchestra", min size 900x600
  - Add Tailwind CSS 4, configure with warm ochre theme CSS variables in `src/theme.css`
  - Add `.window-state.json` persistence: save/restore window position, size, and maximize state on launch/quit using Tauri window events
  - Add Xcode CLI tools detection on startup: check `xcode-select -p` and warn if missing (prevents silent `gh` failures)
  - Verify `pnpm tauri dev` opens an empty window with warm brown background
  - **Done when:**
    - `pnpm tauri dev` launches a window with `#1C1714` background
    - `tauri.conf.json` has identifier `com.openconductor.app`, title "Orchestra", minWidth 900, minHeight 600
    - `src/theme.css` contains all CSS variables from the palette above
    - Window position/size restores after quit+relaunch
    - Startup logs show Xcode CLI check result

- [x] **P1-02: SQLite database setup with sqlx**
  - Add `sqlx` with sqlite feature to `Cargo.toml`
  - Create `src-tauri/migrations/001_initial.sql` with ALL 7 tables from PRD Section 4 — exact column names, types, defaults:
    - `repos` — including `archive_script`, `run_script_mode`, `remote`, `storage_version`, `display_order`, `conductor_config`, `custom_prompt_code_review`, `custom_prompt_create_pr`, `custom_prompt_rename_branch`, `custom_prompt_general`
    - `workspaces` — including `derived_status` (backlog|in-progress|in-review|done), `manual_status`, `unread`, `pinned_at`, `big_terminal_mode`, `initialization_parent_branch`, `intended_target_branch`, `linked_workspace_ids`, `notes`, `archive_commit`, `pr_title`, `pr_description`, `setup_log_path`, `initialization_log_path`, `initialization_files_copied`, `placeholder_branch_name`
    - `sessions` — including `claude_session_id`, `agent_type`, `permission_mode`, `thinking_enabled`, `codex_thinking_level`, `context_used_percent`, `unread_count`, `is_compacting`, `is_hidden`, `last_user_message_at`, `resume_session_at`, `freshly_compacted`, `context_token_count`
    - `session_messages` — including `full_message`, `model`, `sdk_message_id`, `turn_id`, `sent_at`, `cancelled_at`, `last_assistant_message_id`
    - `attachments` — including `type`, `original_name`, `path`, `is_loading`, `session_id`, `session_message_id`, `is_draft`
    - `diff_comments` — including `state` (draft|published|resolved), `location`, `remote_url`, `author`, `thread_id`, `reply_to_comment_id`
    - `settings` — key/value store
  - Add auto-update triggers for `updated_at` on repos, workspaces, sessions, settings
  - Add indexes: `idx_sessions_workspace_id`, `idx_session_messages_sent_at`, `idx_session_messages_cancelled_at`, `idx_session_messages_turn_id`, `idx_attachments_session_id`, `idx_attachments_session_message_id`, `idx_attachments_is_draft`, `idx_diff_comments_workspace`
  - Database path: `~/Library/Application Support/com.openconductor.app/openconductor.db`
  - Create `src-tauri/src/db.rs` with connection pool init, migration runner
  - Tauri `setup` hook calls `init_database` on startup
  - Seed settings table with defaults: `default_model=opus`, `notifications_enabled=true`, `sound_effects_enabled=true`, `always_show_context_wheel=true`, `using_split_view=true`, `default_open_in=cursor`, `markdown_style=default`, `branch_prefix_type=github_username`, `default_codex_thinking_level=high`, `review_codex_thinking_level=high`
  - **Done when:**
    - App starts without errors
    - `~/Library/Application Support/com.openconductor.app/openconductor.db` exists
    - All 7 tables exist with exact column names from PRD Section 4
    - All indexes created
    - `SELECT * FROM settings` returns seeded defaults
    - `updated_at` auto-updates on row modification

- [x] **P1-03: Three-panel layout shell**
  - Create `App.tsx` with three resizable panels using `react-resizable-panels`
  - Left sidebar: 260px default, min 200px, max 400px, togglable
  - Center panel: flexible, min 400px
  - Right panel: 350px default, min 280px, max 600px, collapsible
  - Apply warm ochre theme: sidebar `--bg-surface`, center `--bg-base`, right `--bg-surface`
  - Persist panel sizes to localStorage key `open-conductor-panel-layout`
  - Persist collapsed state of right panel to localStorage
  - Save composer draft text to localStorage per workspace
  - Save collapsed repo state to localStorage
  - **Done when:**
    - Three panels render with correct background colors
    - Drag dividers to resize — sizes persist across page reload
    - Right panel collapse/expand persists across reload
    - `localStorage.getItem('open-conductor-panel-layout')` returns valid JSON with panel sizes

- [x] **P1-04: Sidebar skeleton**
  - Create `src/components/Sidebar/Sidebar.tsx` with:
    - Repo selector dropdown at top (shows "No repos added" initially)
    - Workspace list area with section headers: **Backlog**, **In Progress**, **In Review**, **Done** (4 columns matching PRD v0.35.0)
    - `+ New Workspace` button at bottom with `--accent-primary` styling
    - Settings gear icon (bottom-left)
  - Workspace list shows "No workspaces yet" placeholder when empty
  - Style with warm theme: ochre accent on hover, `--bg-surface-active` for active states
  - **Done when:**
    - Sidebar renders with repo selector, 4 empty status sections, + button, gear icon
    - All hover states use `--bg-surface-hover`
    - + button uses `--accent-primary` background

- [x] **P1-05: Tauri commands for repo CRUD**
  - Create `src-tauri/src/commands.rs` for all Tauri IPC handlers
  - `add_repo(path: String)`:
    - Validate path is a git repo using git2-rs (`Repository::open`)
    - Read remote URL (`origin` remote), default branch, repo name from git config
    - Store `remote` name (usually "origin")
    - Generate UUID for `id`
    - Insert into `repos` table with `storage_version=1`
    - Return serialized Repo struct
  - `list_repos()`: returns all repos ordered by `display_order`
  - `remove_repo(id: String)`: deletes repo and all associated workspaces, sessions, messages (cascade)
  - `reorder_repos(ids: Vec<String>)`: updates `display_order` for each repo based on position in array
  - `get_repo(id: String)`: returns single repo by ID
  - All commands return `Result<T, String>` with structured error messages
  - **Done when:**
    - `add_repo("/path/to/real/git/repo")` succeeds, returns repo with name, remote_url, default_branch
    - `add_repo("/tmp/not-a-repo")` returns error "Not a git repository"
    - `list_repos()` returns repos in `display_order` order
    - `remove_repo(id)` deletes repo + cascades to workspaces/sessions
    - `reorder_repos(["id2","id1"])` changes `display_order` correctly

- [x] **P1-06: Add Repo UI flow**
  - Create `src/components/Sidebar/RepoSelector.tsx`:
    - Dropdown showing registered repos with name and favicon placeholder
    - "Add Repository" option at bottom
  - Add Repo dialog: Tauri file dialog (`tauri-plugin-dialog`) folder picker OR paste path input
  - On add: call `add_repo` IPC, update repo list, auto-select new repo
  - Repo context menu (right-click): Remove, Open in Finder (`tauri-plugin-shell` open), Copy path
  - Drag-and-drop reorder repos in sidebar (call `reorder_repos` on drop)
  - Use `useRepos.ts` hook for repo state management via Zustand + React Query
  - **Done when:**
    - Can add a real local git repo via folder picker dialog
    - Repo appears in sidebar dropdown with correct name
    - Can drag to reorder repos, order persists after app restart
    - Right-click → Remove deletes repo from sidebar and database
    - Right-click → Open in Finder opens the repo directory

- [x] **P1-07: Indian district name generator**
  - Create `src-tauri/src/names.rs` with 200+ Indian district names as a static array
  - Names lowercase, multi-word hyphenated: `north-goa`, `south-goa`, `east-godavari`, etc.
  - Include districts from all states: `anand`, `wayanad`, `kodagu`, `kullu`, `tawang`, `leh`, `munger`, `nilgiris`, `shimoga`, `palakkad`, `almora`, `kangra`, `ratnagiri`, `sikar`, `ernakulam`, `darjeeling`, `chamoli`, `idukki`, `nainital`, `cooch-behar`, `dakshin-dinajpur`, `hooghly`, `howrah`, `jalpaiguri`, `malda`, `murshidabad`, `nadia`, `purba-bardhaman`, etc.
  - Function: `generate_workspace_name(repo_id: &str, db: &Pool) -> String` — picks random unused name for that repo
  - If all 200 names used, append numeric suffix: `anand-2`, `wayanad-3`
  - **Done when:**
    - `generate_workspace_name` returns a valid district name not already used by that repo
    - Calling it 200+ times for the same repo starts appending suffixes
    - Names are lowercase and hyphenated correctly

**HARD STOP** — Verify: `pnpm tauri dev` launches, database has all 7 tables, can add/remove repos via UI, panel layout persists. Run `cargo test` and `pnpm test`.

### Phase 1 Tests

**Rust tests (`src-tauri/src/tests/`):**
```
test_db_creation_and_migration()         — DB file created, all 7 tables exist, all indexes exist
test_db_settings_seed()                  — All default settings present with correct values
test_db_updated_at_trigger()             — Insert row, update row, verify updated_at changed
test_repo_add_valid()                    — Add real git repo, verify all fields populated
test_repo_add_invalid_path()             — Non-git path returns error
test_repo_add_nonexistent_path()         — Nonexistent path returns error
test_repo_list_ordering()                — Add 3 repos, reorder, verify display_order
test_repo_remove_cascades()              — Add repo + workspace + session, remove repo, verify all gone
test_district_name_generation()          — Generate name, verify lowercase + hyphenated
test_district_name_uniqueness()          — Generate 200 names for same repo, all unique
test_district_name_overflow()            — Generate 201+ names, verify suffix appended
```

**Frontend tests (`src/__tests__/`):**
```
Sidebar.test.tsx          — Renders 4 status sections, + button, gear icon, placeholder text
RepoSelector.test.tsx     — Renders repo dropdown, shows "No repos added", add option
App.test.tsx              — Three panels render, correct background colors
PanelLayout.test.tsx      — Panel sizes persist to localStorage, restore on mount
```

---

### PHASE 2: Workspace + Git Worktrees (P2-*)

- [x] **P2-01: Git worktree engine**
  - Create `src-tauri/src/git.rs` using git2-rs:
    - `create_worktree(repo_path: &str, branch_name: &str, worktree_path: &str) -> Result<()>`: creates worktree with new branch from HEAD
    - `remove_worktree(repo_path: &str, worktree_path: &str, prune_branch: bool) -> Result<()>`: removes worktree directory and optionally deletes branch
    - `get_diff_stats(worktree_path: &str, base_branch: &str) -> Result<DiffStats>`: returns `{ files_changed: u32, insertions: u32, deletions: u32, files: Vec<FileStat> }` where `FileStat = { path, insertions, deletions, status: Added|Modified|Deleted|Renamed }`
    - `get_file_diff(worktree_path: &str, base_branch: &str, file_path: &str) -> Result<String>`: returns unified diff for one file
    - `get_full_diff(worktree_path: &str, base_branch: &str) -> Result<String>`: returns full unified diff
    - `merge_branch(repo_path: &str, source_branch: &str, target_branch: &str) -> Result<MergeResult>`: fast-forward or merge commit, returns `{ merge_type: FastForward|MergeCommit, conflicts: Vec<String> }`
    - `list_branches(repo_path: &str) -> Result<Vec<BranchInfo>>`: local branches with current flag
    - `get_uncommitted_changes(worktree_path: &str) -> Result<Vec<FileStatus>>`: staged + unstaged changes
    - `detect_conflicts(worktree_path: &str, target_branch: &str) -> Result<Vec<String>>`: files that would conflict on merge
    - `is_git_busy(worktree_path: &str) -> bool`: check for `.git/rebase-merge`, `.git/MERGE_HEAD`
  - Workspace storage root: `~/open-conductor/workspaces/<repo-name>/<district-name>/`
  - **Done when:**
    - Create worktree from a real repo → directory exists with full checkout + `.git` file
    - `get_diff_stats` returns correct insertions/deletions after making changes
    - `get_file_diff` returns valid unified diff
    - `merge_branch` fast-forwards clean branches
    - `remove_worktree` cleans up directory and branch
    - `is_git_busy` returns true when rebase in progress

- [x] **P2-02: Workspace CRUD Tauri commands**
  - Full workspace lifecycle states: `initializing` → `ready` → `active` → `paused` → `completed` → `ready_to_merge` → `merged` → `archived` → `errored` (8 states)
  - `create_workspace(repo_id, task_prompt, agent_type, model, target_branch)`:
    1. Generate district name via `generate_workspace_name`
    2. Generate branch: `<branch_prefix>/<district-name>` (prefix from settings: `branch_prefix_type`)
    3. Store `placeholder_branch_name` during creation
    4. Create git worktree via `git.rs`
    5. Create `.context/` directory with empty `notes.md`, `todos.md`, `attachments/`, `plans/`
    6. Insert into `workspaces` table with `state=initializing`, `derived_status=in-progress`
    7. Run setup script if configured in `conductor_config` (store log to `setup_log_path`)
    8. Track `initialization_files_copied` count
    9. Transition to `state=ready`
    10. Return workspace ID and name
  - `list_workspaces(repo_id)`: returns workspaces grouped by `derived_status` (backlog, in-progress, in-review, done), pinned first within each group
  - `archive_workspace(id)`:
    1. Save current HEAD to `archive_commit`
    2. Auto-save uncommitted files (stage + commit with message "Orchestra auto-save on archive")
    3. Run `archive_script` if configured
    4. Move `.context/` to `~/open-conductor/archived-contexts/<repo>/<workspace>/`
    5. Set `state=archived`
  - `unarchive_workspace(id)`: restore `.context/` from archived-contexts, set `state=active`, restore git state from `archive_commit`
  - `delete_workspace(id)`: remove worktree via `git.rs`, delete from DB (cascade sessions, messages)
  - `update_workspace(id, fields)`: update name, `intended_target_branch`, `pinned_at`, `manual_status`, `unread`, `big_terminal_mode`, `pr_title`, `pr_description`, `notes`, `derived_status`
  - `pin_workspace(id)` / `unpin_workspace(id)`: set/clear `pinned_at` timestamp
  - `mark_workspace_unread(id)` / `mark_workspace_read(id)`: toggle `unread` flag
  - `fork_workspace(id)`: create new worktree from same parent branch, carry over chat summary to new workspace via `.context/` copy
  - `get_workspace(id)`: return full workspace with computed diff stats
  - **Done when:**
    - Create workspace → worktree exists at `~/open-conductor/workspaces/<repo>/<district>/`
    - `.context/notes.md` and `.context/todos.md` exist in worktree
    - `list_workspaces` groups by derived_status, pinned items first
    - Archive → `.context/` moved to archived-contexts, git state saved
    - Unarchive → `.context/` restored, workspace active again
    - Delete → worktree directory gone, DB records gone
    - Pin/unpin → `pinned_at` set/null, pinned workspaces sort first
    - Fork → new worktree created, summary carried over

- [x] **P2-03: New Workspace dialog UI**
  - Create `src/components/Sidebar/NewWorkspaceDialog.tsx`:
    - Modal triggered by `+ New Workspace` button or `Cmd+Shift+N`
    - **Mode selector tabs**: "New Task", "From Branch", "From PR", "From Issue"
    - **New Task mode**: task description textarea, agent type picker (Claude Code / Codex), model picker dropdown (full model list from PRD Appendix A: Opus 4.6, Sonnet 4.6, Haiku 4.5, etc.), target branch dropdown, thinking level toggle
    - **From Branch mode**: branch picker dropdown, optional task description
    - **From PR mode**: PR number input, auto-fetches PR details
    - **From Issue mode**: GitHub issue or Linear issue selector
    - Auto-generated workspace name shown (district name) — user can override
    - "Strict data privacy" toggle to disable AI-generated titles
    - On submit: call `create_workspace`, navigate to new workspace tab
    - Loading state while worktree is being created
  - **Done when:**
    - Dialog opens on `+ New Workspace` click and `Cmd+Shift+N`
    - All 4 mode tabs render with correct fields
    - Model picker shows all models from PRD Appendix A
    - Submit creates workspace, dialog closes, sidebar shows new workspace
    - Auto-generated district name displayed and editable

- [x] **P2-04: Workspace sidebar list**
  - Create `src/components/Sidebar/WorkspaceList.tsx` and `WorkspaceItem.tsx`:
  - Workspaces grouped under collapsible section headers: **Backlog**, **In Progress**, **In Review**, **Done**
  - Section headers show count badge: "In Progress (3)"
  - Each workspace item displays:
    ```
    [Pin Icon] district-name
      branch-name (--text-secondary, smaller)
      [Status Badge] ● Running / Paused / Ready to merge / Errored
      [Stats] +303 / -532  (--success / --error colored)
      [PR] PR #432 title... (if PR exists, --text-secondary)
      [Git status] ● uncommitted changes indicator
      [Unread blue dot if applicable]
    ```
  - Active workspace: `--bg-surface-active` with 2px left border in `--accent-primary`
  - Pinned workspaces sort to top of their group with pin icon
  - Right-click context menu: Archive, Unarchive, Delete, Pin/Unpin, Fork, Mark Unread/Read, Open in IDE, Copy Branch Name, Rename
  - Click workspace to open/focus its tab
  - Real-time status updates via Tauri event listener
  - **Done when:**
    - Multiple workspaces render in correct 4-column groups
    - Click switches active workspace (left border highlight)
    - Pin/unpin moves items to top of group
    - Context menu all options functional
    - Unread dot shows/hides correctly
    - PR title shows when `pr_title` is set
    - Diff stats (+/-) display with correct colors
    - Git uncommitted changes indicator visible

- [x] **P2-05: Workspace tabs + Home tab**
  - Create `src/components/Navigation/TabBar.tsx`:
    - Fixed "Home" tab (always first, unclosable) — shows overview dashboard
    - One tab per open workspace: shows district name, truncated with tooltip
    - Close button on workspace tabs (`Cmd+W` closes active)
    - Tab overflow: horizontal scroll or dropdown for 10+ tabs
    - Click workspace in sidebar opens/focuses its tab
    - Double-click tab to rename
    - Tab order: Home + workspaces in order opened
  - Home tab content: overview dashboard showing all repos, workspace counts by status, recent activity
  - **Done when:**
    - Home tab always visible, cannot be closed
    - Open 5 workspaces → 5 tabs appear after Home
    - Click tab switches view, close button removes tab
    - `Cmd+W` closes active tab (not Home)
    - Overflow scroll/dropdown works with 15+ tabs
    - Double-click renames tab

**HARD STOP** — Verify: Can create workspaces with Indian district names, worktrees created on disk, sidebar shows workspaces in 4 status groups, tabs work, archive/unarchive/delete all functional. Run `cargo test` and `pnpm test`.

### Phase 2 Tests

**Rust tests:**
```
test_create_worktree()                   — Worktree directory created, .git file exists, branch exists
test_remove_worktree()                   — Directory removed, branch pruned
test_diff_stats_accuracy()               — Add/modify/delete files, verify correct counts
test_file_diff_content()                 — Verify unified diff format correct
test_merge_fast_forward()                — Clean branch merges via FF
test_merge_with_commits()                — Diverged branch creates merge commit
test_conflict_detection()                — Conflicting changes detected before merge
test_is_git_busy()                       — Returns true during rebase, false otherwise
test_workspace_create_happy_path()       — Workspace created, worktree exists, .context/ populated
test_workspace_lifecycle_states()        — Test all 8 state transitions are valid
test_workspace_archive_saves_state()     — Archive saves commit hash, moves .context/
test_workspace_unarchive_restores()      — Unarchive restores .context/, state=active
test_workspace_delete_cascades()         — Delete removes worktree + all DB records
test_workspace_fork()                    — Fork creates new worktree, copies summary
test_workspace_pin_sort_order()          — Pinned workspaces sort first in list
test_workspace_grouping()                — Workspaces grouped by derived_status correctly
```

**Frontend tests:**
```
WorkspaceList.test.tsx    — 4 status groups render, items in correct group, counts correct
WorkspaceItem.test.tsx    — All fields render: name, branch, status, stats, PR, unread
TabBar.test.tsx           — Home tab permanent, workspace tabs open/close/switch
NewWorkspaceDialog.test.tsx — All 4 modes render, model picker shows full list, submit calls IPC
ContextMenu.test.tsx      — Right-click shows all menu options, each triggers correct action
```

---

### PHASE 3: Agent Execution + MCP (P3-*)

- [ ] **P3-01: MCP server with rmcp**
  - Create `src-tauri/src/mcp.rs` using `rmcp` crate with `#[tool_box]`:
    - `GetWorkspaceDiff(workspace_id: String)`: calls `git.rs` to return current diff
    - `GetTerminalOutput(workspace_id: String, lines: Option<u32>)`: returns last N lines of terminal buffer (default 100). Terminal output buffered in a ring buffer per workspace, accessible to MCP.
    - `AskUserQuestion(question: String, options: Vec<String>)`: emits Tauri event `mcp:ask_user`, blocks until user responds via Tauri command `answer_mcp_question`, returns answer string. Timeout after 5 minutes.
    - `DiffComment(file_path: String, line_number: u32, body: String)`: inserts into `diff_comments` table with `author=claude`, `state=draft`, emits `diff:comment_added` event
    - `EnterPlanMode()`: sets session `permission_mode='plan'`, emits `session:plan_mode` event
    - `ExitPlanMode(plan: Option<String>)`: sets session `permission_mode='default'`, emits `session:plan_exit` event with plan content
    - `MultiEdit(edits: Vec<FileEdit>)`: applies multiple file edits atomically, where `FileEdit = { path, old_text, new_text }`
    - `NotebookEdit(notebook_path: String, cell_number: u32, new_source: String, edit_mode: String)`: edit Jupyter notebook cells
  - MCP server communicates via stdio transport (`transport-io` feature)
  - Each workspace session gets its own MCP server instance with workspace context
  - Output truncation: truncate MCP tool responses at 100k chars
  - Support `.mcp.json` configuration file: if present in repo root, merge with Orchestra's MCP config
  - **Done when:**
    - MCP server starts, all 8 tools registered and discoverable
    - `GetWorkspaceDiff` returns valid diff content
    - `AskUserQuestion` blocks, receives answer from frontend, returns it
    - `DiffComment` creates record in diff_comments table
    - `EnterPlanMode`/`ExitPlanMode` toggle session.permission_mode
    - `MultiEdit` applies edits to multiple files
    - Tool responses truncated at 100k chars
    - `.mcp.json` from repo root merged into MCP config

- [ ] **P3-02: Agent process spawning**
  - Create `src-tauri/src/agents/mod.rs` with `AgentAdapter` trait:
    ```rust
    trait AgentAdapter {
        fn name(&self) -> &'static str;
        fn supported_models(&self) -> Vec<ModelInfo>;
        fn spawn(&self, config: AgentConfig, workdir: &Path, env: &HashMap<String, String>) -> Result<AgentProcess>;
        fn parse_output(&self, raw: &str) -> Vec<AgentMessage>;
        fn send_input(&self, process: &mut AgentProcess, input: &str) -> Result<()>;
        fn send_cancel(&self, process: &mut AgentProcess) -> Result<()>;
        fn stop(&self, process: &mut AgentProcess) -> Result<()>;
        fn is_running(&self, process: &AgentProcess) -> bool;
        fn get_thinking_levels(&self) -> Vec<ThinkingLevel>;
        fn set_thinking_level(&self, process: &mut AgentProcess, level: ThinkingLevel) -> Result<()>;
    }
    ```
  - `AgentConfig` includes: `task_prompt`, `model`, `thinking_level`, `custom_instructions` (from `repos.custom_prompt_general`), `slash_commands`, `mcp_config`, `context_files` (from `.context/`)
  - `AgentProcess` wraps: child process handle, stdin writer, stdout reader, stderr reader, PID, status
  - Create `src-tauri/src/agents/claude.rs` — Claude Code adapter:
    - Spawn: `claude --print --output-format stream-json --model <model> --mcp-config <path>` in worktree dir
    - Support PTY mode for interactive tool call approvals (via `portable-pty` crate)
    - Parse JSON stream: extract `type` field → `assistant` (text), `tool_use`, `tool_result`, `thinking`, `error`, `result`
    - Pass custom instructions via `--system-prompt` or `CLAUDE_CODE_SYSTEM_PROMPT` env var
    - Support all providers: direct Anthropic (default), Bedrock (`--provider bedrock`), Vertex (`--provider vertex`), custom endpoint
    - Forward slash commands: `/clear`, `/compact`, `/restart` — detect in user input, forward to process stdin
    - Cancel via SIGINT, stop via SIGTERM+SIGKILL
    - Track `claude_session_id` from output metadata
  - Create `src-tauri/src/agents/codex.rs` — Codex adapter:
    - Spawn: `codex --quiet` in worktree dir
    - Parse output, extract code changes and Bash command results
    - Thinking levels: low, medium, high, xhigh via `--thinking-level` flag
    - Live Bash rendering: parse Bash command execution blocks
    - Cancel via SIGINT
  - Process management: track all spawned agent processes, clean up on workspace archive/delete
  - Resource monitoring: log memory/CPU per agent process
  - **Done when:**
    - `ClaudeAdapter::spawn` starts claude CLI, output streams
    - JSON stream parsing extracts all message types correctly: text, tool_use, tool_result, thinking, error
    - `send_input` writes to stdin, agent receives it
    - `send_cancel` sends SIGINT, process stops within 5s
    - `stop` kills process forcefully
    - `set_thinking_level` updates thinking configuration
    - `CodexAdapter::spawn` starts codex CLI with correct thinking level
    - Custom instructions from repo config passed to agent
    - Slash commands forwarded to process stdin

- [ ] **P3-03: Session management**
  - Create Tauri commands in `commands.rs`:
    - `create_session(workspace_id, agent_type, model, task_prompt, thinking_enabled, thinking_level)`:
      1. Insert into `sessions` table with all fields
      2. Spawn agent process via adapter
      3. Start async output streaming task (tokio)
      4. For each output chunk: parse via adapter, persist to `session_messages` with `turn_id`, `sdk_message_id`, `model`, `full_message` (complete JSON), `sent_at`
      5. Emit Tauri events: `agent:message` (new message), `agent:tool_call` (tool invocation), `agent:status` (running/idle/error), `agent:thinking` (thinking content)
      6. Implement backpressure: ring buffer (1000 messages) if frontend overwhelmed
      7. Track `context_used_percent` and `context_token_count` from agent output metadata
    - `send_message(session_id, content, attachments)`: write to agent stdin, insert user message to `session_messages`
    - `cancel_session(session_id)`: SIGINT to agent, set `cancelled_at` on current message
    - `stop_session(session_id)`: force kill agent process
    - `get_session_messages(session_id, limit, offset)`: paginated load from SQLite
    - `get_session(session_id)`: return session with status, context usage
    - `update_session(session_id, fields)`: update title, thinking_enabled, model, permission_mode, etc.
    - `compact_session(session_id)`: forward `/compact` to agent, set `is_compacting=true`, clear on completion, set `freshly_compacted=true`
    - `hide_session(session_id)`: set `is_hidden=true`
  - On workspace switch: load historical messages from SQLite (paginated), then subscribe to live events
  - Store `last_user_message_at` on each user message send
  - **Done when:**
    - Create session → agent spawns, messages stream to DB
    - Each message has `turn_id` grouping related messages
    - `full_message` column contains complete JSON including tool calls and costs
    - Frontend receives `agent:message` events in real-time
    - Cancel stops agent within 5 seconds
    - `context_used_percent` updates as conversation grows
    - Ring buffer prevents memory overflow with rapid messages
    - Compact sends /compact to agent, tracks compacting state

- [ ] **P3-04: Conversation thread UI**
  - Create `src/components/Chat/ConversationThread.tsx`: virtualized list (`react-window`) of messages
  - Message types with distinct rendering:
    - **User prompt**: right-aligned bubble, `--accent-bg` background, `--text-primary` text
    - **Assistant text**: left-aligned, `--bg-surface` background, full markdown rendering (react-markdown + remark-gfm)
    - **Tool calls**: collapsible card with tool name header, args as code block, result below. `--bg-surface` with `--border` border
    - **Subagent calls**: nested collapsible section showing subagent prompt and responses (indented, with visual nesting indicator)
    - **Thinking**: collapsible block, `--text-tertiary` italic text, hidden by default (toggle with `Cmd+Shift`)
    - **Errors**: `--error-bg` background with `--error` left border
    - **File changes**: inline notification "Modified `src/main.rs`" with clickable file path
  - Response metadata: hover over any assistant message shows tooltip with timestamp, model name, token count
  - Clickable file paths: click `src/main.rs` in messages → opens in diff viewer or file explorer
  - Clickable URLs: links in responses are clickable, open in browser
  - LaTeX rendering: `remark-math` + `rehype-katex` for inline `$...$` and block `$$...$$`
  - Mermaid diagrams: detect ` ```mermaid ` blocks, render inline with app theme colors, fullscreen expand button
  - Auto-scroll to bottom on new messages, "Jump to bottom" FAB button if user scrolled up
  - Status line below thread: "Thinking...", "Using tool: Read", "Writing file: src/main.rs" — live agent activity
  - Keyboard navigation: `j`/`k` (vim) and arrow keys to navigate between messages, focused message highlighted
  - **Done when:**
    - All 7 message types render with correct styling
    - Hover assistant message → tooltip shows timestamp + model + tokens
    - Click file path in message → opens file
    - URLs are clickable hyperlinks
    - LaTeX `$E=mc^2$` renders as formatted math
    - Mermaid ` ```mermaid ` renders as diagram
    - Auto-scroll works, jump-to-bottom button appears on scroll up
    - `j`/`k` navigates messages, focused message has highlight border
    - 1000+ messages render without lag (virtualized)

- [ ] **P3-05: Composer bar**
  - Create `src/components/Chat/Composer.tsx`:
    - Multi-line text input with placeholder "Ask the agent to do something..."
    - `Enter` to send (default), configurable to `Cmd+Enter` via settings
    - `+` button for file attachments: images (drag-drop from Finder, auto-resize >8000px), text files
    - Pasted text over 500 chars auto-converts to text attachment (stored in `.context/attachments/`)
    - Model picker dropdown: full model list from PRD Appendix A (Opus 4.6, Sonnet 4.6, Haiku 4.5, GPT-5.3-Codex, etc.)
    - Thinking toggle button (on/off, with thinking level selector for Codex: low/medium/high/xhigh)
    - Context usage indicator: circular progress ring showing `context_used_percent`, hover for breakdown (token count, model context window size)
    - MCP server status dots: green = connected, red = error, gray = not configured. Shown before message submission.
    - Slash command autocomplete: type `/` to trigger, fuzzy search across available commands (`/clear`, `/compact`, `/restart`, plus project-level custom commands from `conductor.json`)
    - @-mention files: type `@` to trigger file picker autocomplete, selected file path inserted into message
    - Draft persistence: composer text saved to localStorage per workspace, restored on workspace switch
    - Send button: `--accent-primary` colored, disabled while agent is processing
  - **Done when:**
    - Text input with Enter-to-send works
    - File drag-drop creates attachment, shown as chip in composer
    - Pasted long text auto-converts to attachment
    - Model picker shows all models, selection persists per session
    - Thinking toggle shows/hides thinking level selector
    - Context ring shows percentage, hover shows tokens
    - MCP status dots visible and colored correctly
    - Slash autocomplete triggers on `/`, shows matching commands
    - `@` triggers file picker, inserts path
    - Draft text persists across workspace switches
    - Send button disabled during agent processing

**HARD STOP** — Verify: Can spawn Claude Code agent, messages stream in conversation UI, tool calls render as collapsible cards, can send follow-up messages, cancel works. MCP tools callable by agent. Run `cargo test` and `pnpm test`.

### Phase 3 Tests

**Rust tests:**
```
test_mcp_get_workspace_diff()            — Returns diff content for workspace with changes
test_mcp_ask_user_question()             — Emits event, receives answer, returns it
test_mcp_diff_comment()                  — Creates diff_comment record in DB
test_mcp_plan_mode_toggle()              — Toggles session permission_mode
test_mcp_multi_edit()                    — Applies edits to 3 files atomically
test_mcp_output_truncation()             — Response >100k chars truncated
test_claude_adapter_spawn()              — Process starts, PID valid, is_running=true
test_claude_adapter_parse_text()         — JSON stream text message parsed correctly
test_claude_adapter_parse_tool_use()     — JSON stream tool_use parsed correctly
test_claude_adapter_parse_thinking()     — JSON stream thinking parsed correctly
test_claude_adapter_cancel()             — SIGINT sent, process exits within 5s
test_codex_adapter_spawn()               — Codex process starts with thinking level
test_session_create_and_stream()         — Session created, messages persisted to DB in order
test_session_messages_paginated()        — Load 1000 messages with limit/offset, correct order
test_session_turn_id_grouping()          — Messages in same turn share turn_id
test_session_cancel_sets_cancelled_at()  — Cancel sets cancelled_at on current message
test_backpressure_ring_buffer()          — Buffer 2000 messages, only last 1000 retained
```

**Frontend tests:**
```
ConversationThread.test.tsx  — Renders all 7 message types, virtualized with 500+ messages
MessageBubble.test.tsx       — User/assistant styling correct, metadata tooltip on hover
ToolCallCard.test.tsx        — Collapsible, shows tool name + args + result
ThinkingBlock.test.tsx       — Hidden by default, expands on click
Composer.test.tsx            — Enter sends, model picker, thinking toggle, slash autocomplete
SlashAutocomplete.test.tsx   — Triggers on /, fuzzy matches, arrow key navigation
FileAttachment.test.tsx      — Drag-drop creates chip, long paste auto-converts
ContextIndicator.test.tsx    — Ring shows percentage, tooltip shows token breakdown
```

---

### PHASE 4: Code Review + Diff (P4-*)

- [ ] **P4-01: Diff computation engine**
  - Tauri commands:
    - `get_workspace_changes(workspace_id)`: returns `{ uncommitted: Vec<FileChange>, committed: Vec<FileChange>, stats: DiffStats }` where `FileChange = { path, status, insertions, deletions }`
    - `get_file_diff(workspace_id, file_path)`: returns unified diff with context lines
    - `get_file_content(workspace_id, file_path)`: returns file content (for non-diff viewing)
    - `get_turn_diff(workspace_id, turn_id)`: returns diff for a specific agent turn (what changed in that response) using checkpoint refs `session-<uuid>-turn-<uuid>-end`
  - Compute diff against `intended_target_branch` (or repo default branch)
  - Background computation: run diff on tokio blocking thread, emit event when ready
  - Paginate large diffs: if >50 files, return first 50 with "load more" capability
  - **Done when:**
    - `get_workspace_changes` returns correct file list split into uncommitted/committed
    - `get_file_diff` returns valid unified diff
    - `get_turn_diff` returns diff for specific turn only
    - Diffs computed in background, don't block UI
    - 50+ file diffs paginated

- [ ] **P4-02: Right panel tab container + File tree**
  - Create right panel with 5 tabs matching PRD Section 6.1: **Changes**, **All Files**, **Checks**, **Notes**, **Terminal**
  - Tab container with `--bg-surface` background, `--border-subtle` bottom border
  - Active tab: `--accent-primary` bottom border indicator
  - Badge on Changes tab: total changed file count
  - Create `src/components/Review/FileTree.tsx`:
    - File tree showing changed files with icons (by extension), full path, `+N`/`-N` stats
    - Two sections: "Uncommitted (N)" and "Committed (N)"
    - Click file → shows diff in center panel or right panel (setting: `using_split_view`)
    - Right-click context menu: Open in IDE, Copy Path, Copy File Content, View Full File
    - "Mark as viewed" checkbox per file, `Ctrl+V` shortcut. Auto-navigate to next unviewed file.
  - Create `src/components/Review/FileExplorer.tsx` (All Files tab):
    - Browse ALL workspace files (not just changed), tree view respecting directory structure
    - Click file to view content
    - Respects `.gitignore`
  - **Done when:**
    - 5 tabs render in right panel, switching works
    - Changes tab shows file tree split into Uncommitted/Committed sections
    - File stats (+/-) colored green/terracotta
    - Click file shows diff
    - Right-click menu with all options working (Open in IDE opens VS Code/Cursor)
    - Mark as viewed works with Ctrl+V, auto-advances
    - All Files tab shows complete workspace file tree

- [ ] **P4-03: Diff viewer**
  - Create `src/components/Review/DiffViewer.tsx` using Monaco Editor diff mode:
    - Side-by-side (default) and inline modes, toggle button
    - Syntax highlighting based on file extension
    - Additions: `--diff-add-bg` background, `--diff-add-text` text
    - Deletions: `--diff-remove-bg` background, `--diff-remove-text` text
    - Line numbers on both sides
    - Incremental context expansion: click "Show 10 more lines" above/below collapsed sections
    - Copy button for file content and diff content
    - Markdown file preview: toggle between diff and rendered markdown
    - SVG rendering toggle: show SVG as image or as code
    - Historical turn-by-turn diffs: dropdown to select which agent turn's changes to view (uses `get_turn_diff`)
  - **Done when:**
    - Diff renders with correct syntax highlighting
    - Side-by-side and inline modes toggle correctly
    - Addition/deletion colors match theme variables
    - Incremental expansion adds context lines on click
    - Copy buttons work for file and diff content
    - Markdown files can toggle to rendered preview
    - Turn-by-turn dropdown shows diffs per agent turn

- [ ] **P4-04: Merge flow**
  - Create `src/components/Review/MergeButton.tsx`:
    - Merge button: sage green `--success` background, disabled when blocked
    - Pre-merge checks display:
      - Uncommitted changes warning (yellow)
      - Conflict detection results
      - Incomplete blocking todos (from `.context/todos.md`)
      - CI status (if GitHub integration configured)
    - Target branch selector: dropdown to change `intended_target_branch`
    - On merge: call `merge_branch` via Tauri command, update workspace state to `merged`
    - Post-merge options dialog:
      - "Continue on new branch" → fork workspace
      - "Archive workspace" → archive
      - "Update memory" → spawn agent with "Review what you learned from feedback on this task and update your memory" prompt
    - Auto-save uncommitted files before merge
  - **Done when:**
    - Merge button disabled when blocking todos incomplete
    - Merge button disabled when conflicts detected
    - Target branch changeable via dropdown
    - Successful merge updates workspace state to `merged`
    - Post-merge dialog shows all 3 options
    - "Continue on new branch" creates forked workspace
    - "Update memory" spawns brief agent session

- [ ] **P4-05: PR creation**
  - Create PR flow in right panel Checks tab:
    - "Create PR" button (visible when no PR exists)
    - "Create Draft PR" option
    - Auto-fill title from workspace task prompt, description from agent conversation summary
    - Detect and use PR templates: check `.github/PULL_REQUEST_TEMPLATE.md`, `.github/pull_request_template.md`, `docs/pull_request_template.md`
    - Apply custom PR prompt from `repos.custom_prompt_create_pr` if set
    - Editable title and description fields
    - Uses `gh` CLI: `gh pr create --title "..." --body "..." [--draft]`
    - After creation: store `pr_title`, `pr_description` on workspace, show PR link
    - Editable after creation: update title/description via `gh pr edit`
  - **Done when:**
    - Create PR button visible, creates PR on GitHub
    - Draft PR option works
    - PR template detected and pre-filled into description
    - Title/description editable before and after creation
    - PR link shown in workspace after creation
    - Custom PR prompt applied if configured

**HARD STOP** — Verify: Full review flow works: create workspace, agent makes changes, diff viewer shows changes with syntax highlighting, can toggle inline/side-by-side, merge succeeds, PR creation works. Run `cargo test` and `pnpm test`.

### Phase 4 Tests

**Rust tests:**
```
test_diff_uncommitted_committed_split()  — Changes correctly categorized
test_file_diff_unified_format()          — Valid unified diff output
test_turn_diff_isolation()               — Turn diff only shows changes from that turn
test_diff_pagination_50plus()            — >50 files returns first 50 + has_more flag
test_merge_updates_state()               — After merge, workspace state=merged
test_merge_blocked_by_conflicts()        — Merge returns error when conflicts exist
test_pr_creation_via_gh()                — gh pr create called with correct args
test_pr_template_detection()             — Finds template in .github/ directory
```

**Frontend tests:**
```
RightPanelTabs.test.tsx    — 5 tabs render, switch correctly, badge shows count
FileTree.test.tsx          — Files grouped, stats colored, click opens diff, context menu
DiffViewer.test.tsx        — Side-by-side + inline toggle, syntax colors, copy buttons
MergeButton.test.tsx       — Disabled when blocked, enabled when clear, post-merge dialog
TurnDiffSelector.test.tsx  — Dropdown lists turns, selecting shows correct diff
FileExplorer.test.tsx      — Full file tree renders, respects .gitignore
```

---

### PHASE 5: Multi-Chat + Plan Mode + Tasks (P5-*)

- [ ] **P5-01: Multiple chats per workspace**
  - `Cmd+T` creates new chat tab within a workspace
  - Create `src/components/Chat/ChatTabs.tsx`: sub-tab bar below workspace tab
  - Each chat is a separate `session` record in SQLite with own `agent_type`, `model`
  - Chat tab shows title (auto-generated or manual), close button, unread count badge
  - Rename chat by double-clicking tab title
  - Chat summaries: when creating new chat, carry over summary of previous chats. Store summaries in `.context/`
  - Hidden chats: `is_hidden` sessions not shown in tab bar but accessible via search
  - **Done when:**
    - `Cmd+T` creates new chat tab with fresh session
    - Messages isolated per chat session
    - Tab shows title, close button, unread count
    - Double-click renames tab, persists to DB
    - New chat includes summary of previous chats in system context

- [ ] **P5-02: Plan mode**
  - Plan mode toggle in composer (button or slash command `/plan`)
  - When active: session `permission_mode='plan'`
  - Agent creates structured plan before coding (triggered by `EnterPlanMode` MCP tool)
  - Plan displayed in `src/components/Chat/PlanMode.tsx`:
    - Structured plan view with numbered steps, checkboxes
    - Interactive planning: agent asks clarifying questions during planning (uses `AskUserQuestion`)
    - Three action buttons: "Approve", "Approve with Feedback" (text input), "Reject"
  - On approve: agent receives approval via `ExitPlanMode` result, proceeds to implement
  - Plan hand-off: "Send to New Chat" button — copies plan to new chat in same workspace
  - Plan to other workspace: "Send to Workspace" — creates new workspace with plan as task prompt
  - **Done when:**
    - Plan mode toggle switches session permission_mode
    - Agent enters plan mode, structured plan renders with steps
    - Interactive questions render during planning
    - Approve → agent implements, Reject → agent revises
    - "Approve with Feedback" sends feedback text to agent
    - "Send to New Chat" creates new chat with plan content
    - "Send to Workspace" creates new workspace with plan

- [ ] **P5-03: Chat checkpoints**
  - Checkpoint system using git refs under `refs/orchestra-checkpoints/`:
    - `session-<uuid>-turn-<uuid>-end`: checkpoint at end of each AI turn
    - `orchestra-archive-<workspace-uuid>`: snapshot when archiving
    - `orchestra-getdiff`: temporary ref for computing diffs
  - Checkpoint implementation in `src-tauri/src/checkpoint.rs`:
    - `save_checkpoint(worktree_path, ref_name)`: creates commit object with HEAD OID, index tree, worktree tree. Uses neutral identity `Orchestra <orchestra@noreply>`. Does NOT move HEAD.
    - `restore_checkpoint(worktree_path, ref_name)`: `git reset --hard` to saved HEAD, restore working tree from checkpoint
    - `diff_checkpoints(worktree_path, ref1, ref2)`: diff between two checkpoint snapshots
    - Skip checkpoint if git rebase/merge in progress (return exit code 101)
  - After each agent turn completion: auto-save checkpoint
  - "Revert to here" button on any message in conversation:
    - Confirmation dialog: "This will undo code changes and remove messages after this point"
    - On confirm: restore checkpoint, delete subsequent messages from SQLite
  - **Done when:**
    - Checkpoint saved after each agent turn (visible as git ref)
    - "Revert to here" on turn 1 of 3: code reverted, messages 2+3 deleted
    - Checkpoint skipped during rebase/merge in progress
    - `diff_checkpoints` returns accurate diff between two points

- [ ] **P5-04: Chat search**
  - `Cmd+F` opens search bar overlay at top of conversation thread
  - Live search highlights matching text in all visible messages
  - Match count display: "3 of 12 matches"
  - Up/down arrows (and Enter/Shift+Enter) navigate between matches, auto-scroll to match
  - Close with Escape
  - **Done when:**
    - `Cmd+F` opens search bar
    - Typing highlights matches across messages
    - "N of M" counter accurate
    - Arrow keys navigate between matches with auto-scroll
    - Escape closes search bar

- [ ] **P5-05: Agent question handling**
  - When agent calls `AskUserQuestion` MCP tool:
  - Create `src/components/Chat/AgentQuestion.tsx`:
    - Question card in conversation thread with question text
    - Multiple-choice buttons for each option
    - Free-text "Other" option with text input
    - Answer sent back to MCP server → agent continues
    - Question card shows selected answer after responding (non-interactive)
  - 5-minute timeout: if user doesn't respond, return timeout error to agent
  - **Done when:**
    - Agent asks question → card renders with options
    - Click option → answer returned to agent, agent continues
    - "Other" option allows free text input
    - After answering, card shows selected answer (read-only)
    - Timeout after 5 minutes returns error to agent

- [ ] **P5-06: Tasks feature**
  - Agent can organize work into structured tasks via `TaskCreate`, `TaskUpdate`, `TaskList` tool calls
  - Create `src/components/Chat/TaskView.tsx`:
    - Task list panel showing all tasks for current session
    - Each task: title, description, status (pending/in_progress/completed), progress indicator
    - Tasks auto-update as agent completes them
    - Collapsible task details with subtasks
  - Tasks stored in session context, visible in conversation thread as structured blocks
  - **Done when:**
    - Agent creates tasks, they appear in TaskView
    - Status updates render in real-time
    - Completed tasks show checkmark
    - Task details expandable/collapsible

- [ ] **P5-07: Table of contents + Chat summaries**
  - Create `src/components/Chat/TableOfContents.tsx`:
    - Sidebar overlay (triggered by button in chat header) showing conversation structure
    - Entries for: user messages (abbreviated), key agent actions, plan blocks, checkpoints
    - Click entry → scroll to that message
    - Hover preview: shows first ~100 chars of message content
  - Auto-generated chat summaries: when switching away from a chat, generate brief summary (using agent or local heuristic)
  - Summary shown as subtitle under chat tab name
  - **Done when:**
    - Table of contents button opens overlay
    - Entries list conversation structure
    - Click scrolls to message
    - Hover shows preview text
    - Chat summaries auto-generate and show under tab names

**HARD STOP** — Verify: Multiple chats work per workspace, plan mode full flow (enter → plan → approve → implement), checkpoints save and restore correctly, chat search finds matches, agent questions get answered. Run `cargo test` and `pnpm test`.

### Phase 5 Tests

**Rust tests:**
```
test_session_create_multiple_per_workspace() — 3 sessions for same workspace, all independent
test_checkpoint_save_and_restore()           — Save checkpoint, make changes, restore, verify original state
test_checkpoint_diff()                       — Diff two checkpoints shows correct changes
test_checkpoint_skip_during_rebase()         — Returns 101 when rebase in progress
test_plan_mode_toggle()                      — Session permission_mode toggles correctly
test_ask_user_question_roundtrip()           — Question sent, answer received, returned to agent
test_ask_user_question_timeout()             — No answer in 5 min, timeout error returned
```

**Frontend tests:**
```
ChatTabs.test.tsx            — Create multiple, switch, close, rename, unread badge
PlanMode.test.tsx            — Plan renders, approve/reject/feedback buttons work
ChatCheckpoint.test.tsx      — Revert button on messages, confirmation dialog, revert action
ChatSearch.test.tsx           — Cmd+F opens, highlights, counter, navigation, Escape closes
AgentQuestion.test.tsx       — Options render, click sends answer, shows selected state
TaskView.test.tsx            — Tasks render, status updates, expand/collapse
TableOfContents.test.tsx     — Opens, entries listed, click scrolls, hover preview
```

---

### PHASE 6: Terminal + Scripts (P6-*)

- [ ] **P6-01: Integrated terminal**
  - Create `src/components/Terminal/Terminal.tsx` using xterm.js + WebGL addon:
    - Renders in right panel "Terminal" tab
    - Spawns user's default shell (`$SHELL` env var) in worktree directory
    - Custom font from settings (`--font-mono`)
    - `Ctrl+backtick` to focus terminal
    - `Cmd+K` to clear terminal buffer
    - Clickable URLs: `Cmd+Click` opens in browser (xterm.js web links addon)
    - Big terminal mode: expand to full height of right panel (toggle via workspace `big_terminal_mode`)
    - Respect shell environment: `PATH`, Fish shell compatibility, version managers (mise, asdf, rbenv)
    - Terminal output buffer: store last 10000 lines in memory ring buffer, accessible to MCP `GetTerminalOutput` tool
    - Localhost detection: `Cmd+Shift+O` to detect and open localhost URLs found in terminal output
    - Multiple terminal instances: one per workspace
  - **Done when:**
    - Terminal opens in right panel, shell prompt visible
    - Can run `ls`, `git status`, output renders correctly
    - `Ctrl+backtick` focuses terminal from anywhere
    - `Cmd+K` clears buffer
    - `Cmd+Click` on URL opens browser
    - Big terminal mode toggles height
    - Terminal output accessible to MCP tool (last 100 lines)
    - `Cmd+Shift+O` detects and offers to open localhost URLs

- [ ] **P6-02: Setup and run scripts**
  - Parse `conductor.json` from repo root for `setup`, `run`, `scripts` fields
  - On workspace creation: run setup script(s) in worktree, log output to `setup_log_path`
  - `Cmd+R` executes run script (e.g., `npm run dev`)
  - `run_script_mode`: `concurrent` (run alongside agent) or `sequential`
  - Script output shown in terminal panel
  - Re-run button for setup scripts in workspace header
  - View setup script logs: button to open log file
  - Claude-assisted script creation: if no `conductor.json`, offer to have agent create one
  - In-UI script editing: Settings > Repository > Scripts section
  - **Done when:**
    - `conductor.json` with `"setup": ["npm install"]` triggers on workspace creation
    - Setup log written to `setup_log_path`
    - `Cmd+R` runs configured run script in terminal
    - Re-run button re-executes setup script
    - Script logs viewable via button
    - Settings page shows script editor for repo

- [ ] **P6-03: Environment variables**
  - Create `src/components/Settings/EnvSettings.tsx`: key-value editor per repo
  - Env vars injected into: agent process environment, terminal shell environment
  - Stored in `conductor_config` JSON on repos table
  - Encryption at rest: use `ring` crate to encrypt values before storing in SQLite, decrypt on read
  - Pre-populated with common vars: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GITHUB_TOKEN`
  - **Done when:**
    - Settings > Env shows key-value editor for selected repo
    - Add env var → stored encrypted in DB
    - Spawn agent → env var available in agent process
    - Open terminal → env var available in shell
    - Values not visible in DB when queried directly (encrypted)

**HARD STOP** — Verify: Terminal works in right panel, commands execute in worktree directory, setup scripts run on workspace creation, Cmd+R runs dev server, env vars injected into agent and terminal. Run `cargo test` and `pnpm test`.

### Phase 6 Tests

**Rust tests:**
```
test_terminal_spawn_in_worktree()        — Shell spawns in correct directory
test_terminal_output_buffer()            — Ring buffer stores last 10000 lines
test_mcp_get_terminal_output()           — Returns last N lines from buffer
test_setup_script_execution()            — Script runs, output logged to setup_log_path
test_run_script_execution()              — Run script starts, output streams
test_env_var_encryption()                — Encrypt value, store, read back, decrypt, matches original
test_env_var_injection()                 — Env var set in config, present in spawned process env
test_conductor_json_parsing()            — Parse valid conductor.json, extract setup/run/scripts
test_conductor_json_missing()            — Missing file returns empty config (no error)
```

**Frontend tests:**
```
Terminal.test.tsx           — xterm.js renders, focus shortcut, clear shortcut
SetupScripts.test.tsx       — Re-run button visible, click triggers re-run
EnvSettings.test.tsx        — Key-value editor: add, edit, remove vars, save persists
```

---

### PHASE 7: Notes, Todos, Context (P7-*)

- [ ] **P7-01: Notes editor**
  - Create `src/components/Notes/NotesEditor.tsx` in right panel "Notes" tab:
    - Rich markdown editor using tiptap with WYSIWYG toolbar
    - Bold, italic, headings, lists, code blocks, links
    - Content saved to BOTH `.context/notes.md` in workspace AND `workspaces.notes` column
    - Auto-save on change (debounced 500ms)
    - Share with agent: notes content included in agent system prompt via `<notes>` tag
  - **Done when:**
    - Notes tab shows rich editor
    - Type formatted text, auto-saves after 500ms
    - Switch workspace and back → notes persisted
    - `.context/notes.md` file updated on disk
    - Agent system prompt includes notes content

- [ ] **P7-02: Todos with merge blocking**
  - Todo list in right panel Checks tab:
    - Add todo with Enter key in input field
    - Toggle complete/incomplete checkbox
    - "Blocks merge" flag toggle per todo (warning icon)
    - Delete todo
    - Reorder todos via drag
  - Stored in `.context/todos.md` as markdown checklist:
    ```
    - [ ] Add error handling [blocks]
    - [x] Update tests
    - [ ] Review edge cases
    ```
  - If ANY blocking todo is incomplete → merge button disabled with tooltip "N blocking todos incomplete"
  - **Done when:**
    - Can add, complete, uncomplete, delete, reorder todos
    - "Blocks merge" toggle works
    - Merge button disabled when blocking todo incomplete
    - Todos persist in `.context/todos.md`
    - Merge button tooltip shows reason when disabled

- [ ] **P7-03: Context directory management**
  - `.context/` folder per workspace: `notes.md`, `todos.md`, `attachments/`, `plans/`
  - Attachments: images, pasted text, files — stored here, referenced in messages via `attachments` table
  - When archiving workspace: `.context/` moved to `~/open-conductor/archived-contexts/<repo>/<workspace>/`
  - When unarchiving: `.context/` restored from archived-contexts
  - Context indicator integration: show `.context/` file count in workspace info
  - Plans directory: store plan mode outputs as markdown files
  - **Done when:**
    - `.context/` created on workspace creation with all subdirectories
    - Attachments stored in `.context/attachments/`
    - Archive moves `.context/` to archived-contexts
    - Unarchive restores `.context/`
    - Plan outputs saved to `.context/plans/`

- [ ] **P7-04: Token/cost tracking**
  - Parse cost metadata from agent output (`full_message` JSON — look for `usage`, `cost` fields)
  - Per-message cost: shown in response metadata tooltip (hover over message)
  - Per-session total: shown in chat header area
  - Per-workspace total: shown in workspace sidebar item tooltip
  - Optional top-bar display (setting: `show_cost_in_topbar`)
  - Cost breakdown: input tokens, output tokens, total cost in USD
  - **Done when:**
    - Hover over assistant message → tooltip shows cost + token breakdown
    - Chat header shows session total cost
    - Workspace tooltip shows cumulative cost
    - Setting `show_cost_in_topbar` toggles cost display in app header

**HARD STOP** — Verify: Notes editor works with rich markdown, todos block merge correctly, context directory lifecycle works with archive/unarchive, cost tracking shows in tooltips. Run `cargo test` and `pnpm test`.

### Phase 7 Tests

**Rust tests:**
```
test_notes_save_to_file_and_db()         — Notes saved to .context/notes.md AND workspaces.notes
test_todos_parse_markdown()              — Parse todos.md, extract items with blocking flag
test_todos_blocks_merge()                — Incomplete blocking todo prevents merge
test_context_dir_creation()              — .context/ created with all subdirs on workspace create
test_context_archive_move()              — Archive moves .context/ to archived-contexts
test_context_unarchive_restore()         — Unarchive restores .context/ from archived-contexts
test_cost_parsing_from_full_message()    — Extract cost/usage from claude JSON output
```

**Frontend tests:**
```
NotesEditor.test.tsx       — Rich editor renders, typing persists, formatting works
TodoList.test.tsx          — Add, toggle, delete, reorder, blocking flag, merge button state
CostDisplay.test.tsx       — Tooltip shows cost, header shows total, topbar setting works
```

---

### PHASE 8: Navigation + Search + Keyboard (P8-*)

- [ ] **P8-01: Command palette**
  - Create `src/components/Navigation/CommandPalette.tsx` using `cmdk`:
    - `Cmd+K` opens command palette overlay (centered modal with search input)
    - Fuzzy search across: workspaces (by name, branch), chats (by title), commands, recent files
    - Command categories: "Workspaces", "Actions", "Settings", "Navigation"
    - Actions: New Workspace, Archive Workspace, Toggle Left Sidebar, Toggle Right Sidebar, Zen Mode, Settings, etc.
    - Arrow keys to navigate, Enter to select, Escape to close
    - Most recent items shown first when empty
  - **Done when:**
    - `Cmd+K` opens palette
    - Type workspace name → matches shown
    - Type "new" → "New Workspace" action shown
    - Arrow keys navigate, Enter selects, Escape closes
    - Empty state shows recent items

- [ ] **P8-02: File picker**
  - Create `src/components/Navigation/FilePicker.tsx`:
    - `Cmd+P` opens file picker overlay
    - Fuzzy search across workspace files (uses git ls-files, respects .gitignore)
    - Shows file path with directory structure
    - Select file → opens in diff viewer or file explorer
    - Performance: cache file list, debounce search (100ms)
  - **Done when:**
    - `Cmd+P` opens file picker
    - Type partial filename → fuzzy matches shown
    - Select file → opens in viewer
    - Large repos (10k+ files) search completes in <200ms

- [ ] **P8-03: Workspace search**
  - `Cmd+Shift+F` opens workspace search overlay
  - Search across ALL workspaces by: name, branch, PR number, task prompt
  - Results show: workspace name, repo, branch, status badge
  - Click result navigates to workspace
  - **Done when:**
    - `Cmd+Shift+F` opens search
    - Search by branch name finds correct workspace
    - Search by PR number finds correct workspace
    - Click result switches to that workspace

- [ ] **P8-04: All keyboard shortcuts**
  - Implement ALL shortcuts from PRD Section 7 in `src/hooks/useKeyboard.ts`:
    - `Cmd+Shift+N` → New workspace dialog
    - `Cmd+T` → New chat tab
    - `Cmd+K` → Command palette
    - `Cmd+P` → File picker
    - `Cmd+F` → Chat search
    - `Cmd+Shift+F` → Workspace search
    - `Cmd+R` → Run script
    - `Cmd+Shift+Y` → Commit and push (stages all, commits with auto-message, pushes)
    - `Cmd+Shift+O` → Open localhost URL detected in terminal
    - `Cmd+Shift+C` → Copy current file path
    - `Cmd+I` → Link Linear issue (opens issue picker)
    - `Cmd+B` → Toggle left sidebar
    - `Option+Cmd+B` → Toggle right sidebar
    - `Cmd+.` / `Ctrl+Z` → Zen mode (hide both sidebars)
    - `Ctrl+backtick` → Focus terminal
    - `Cmd+K` (in terminal) → Clear terminal
    - `Cmd+,` → Repository settings
    - `Cmd+?` → Shortcuts help overlay
    - `Cmd+Shift` → Toggle thinking visibility
    - `Ctrl+V` → Mark file as viewed
    - `[` / `]` → Toggle left/right sidebar
    - `j` / `k` → Navigate chat messages (vim)
    - `Cmd+-` / `Cmd++` → Zoom out/in (WebView zoom)
    - `Cmd+A` → Select all (scoped to current panel)
    - `Cmd+W` → Close active tab
  - Shortcuts help overlay: `Cmd+?` shows modal with all shortcuts grouped by category
  - Prevent conflicts: shortcuts context-aware (e.g., `Cmd+K` is palette globally, clear in terminal)
  - **Done when:**
    - Every shortcut from PRD Section 7 triggers correct action
    - `Cmd+?` shows help overlay listing all shortcuts
    - No shortcut conflicts between contexts
    - Shortcuts work regardless of panel focus

- [ ] **P8-05: Quick navigation (unread)**
  - Navigate between workspaces/chats with unread messages
  - Keyboard shortcut or toolbar button to jump to next unread
  - Badge in sidebar showing total unread count
  - **Done when:**
    - Next-unread navigation jumps to correct workspace/chat
    - Badge shows correct unread count
    - After reading, unread clears

**HARD STOP** — Verify: Command palette, file picker, workspace search all work. All keyboard shortcuts functional. Help overlay shows complete list. Run `pnpm test`.

### Phase 8 Tests

**Frontend tests:**
```
CommandPalette.test.tsx     — Opens on Cmd+K, fuzzy search, keyboard navigation, select action
FilePicker.test.tsx         — Opens on Cmd+P, fuzzy file search, select opens file
WorkspaceSearch.test.tsx    — Opens on Cmd+Shift+F, search by branch/name/PR
useKeyboard.test.tsx        — Each shortcut triggers correct callback, no conflicts
ShortcutsHelp.test.tsx      — Modal shows all shortcuts grouped by category
```

---

### PHASE 9: Integrations (P9-*)

- [ ] **P9-01: GitHub — PR management**
  - Create `src-tauri/src/integrations/github.rs`:
    - `get_pr_status(repo_id, branch)`: checks if PR exists for branch, returns PR number, title, review status (approved/changes_requested/pending), mergeable state
    - `create_pr(repo_id, branch, title, body, draft)`: creates PR via `gh pr create`
    - `update_pr(repo_id, pr_number, title, body)`: updates PR via `gh pr edit`
    - `get_pr_checks(repo_id, pr_number)`: returns CI check statuses
    - `checkout_pr(repo_id, pr_number)`: checkout PR branch into new workspace
  - PR status in workspace sidebar: PR number badge, review status icon (checkmark/X/clock)
  - Workspace creation from PR: "From PR" mode in New Workspace dialog
  - GitHub Enterprise support: detect GHE from `gh auth status` hostname
  - **Done when:**
    - PR status shows in sidebar when PR exists for workspace branch
    - Review status (approved/changes requested) shown as icon
    - Create PR from workspace works
    - Draft PR creation works
    - Update PR title/description works
    - Checkout PR creates workspace from PR branch
    - GHE detected and supported

- [ ] **P9-02: GitHub — Actions CI**
  - Create `src/components/Checks/CIActions.tsx` in Checks tab:
    - Show GitHub Actions workflow runs for workspace branch
    - Each job: name, status icon (pass/fail/running), duration, timestamp
    - Sort by: runtime (longest first) or state (failed first)
    - Expandable: click job to view logs inline (fetched via `gh run view --log`)
    - "Re-run" button on failed jobs (`gh run rerun`)
    - "Forward to Agent" button: sends failing CI output to agent with "Fix these CI failures" prompt
  - Poll interval: every 30s for active workspaces, every 5m for inactive
  - **Done when:**
    - CI status shows in Checks tab with job list
    - Pass/fail/running icons correct
    - Sort by runtime and state works
    - Click job shows logs inline
    - Re-run button triggers re-run on GitHub
    - "Forward to Agent" sends failure logs to agent

- [ ] **P9-03: GitHub — Comment sync**
  - Sync PR comments from GitHub into diff viewer:
    - `get_pr_comments(repo_id, pr_number)`: fetch via `gh api repos/{owner}/{repo}/pulls/{pr}/comments`
    - Comments shown inline on diff lines (with GitHub avatar, username, timestamp)
    - "Fetch new comments" button for one-click refresh
    - Comment states: draft, published, resolved
    - Threaded comments: show thread_id grouping, reply chains
    - Draft comments persist across app restarts (stored in `diff_comments` table)
    - Submit draft comments to GitHub: `gh api` POST
  - **Done when:**
    - PR comments from GitHub appear on correct diff lines
    - Comment shows author avatar, name, timestamp, body
    - "Fetch comments" button refreshes from GitHub
    - Draft comments survive app restart
    - Threaded replies render as nested comments
    - Can submit draft comment to GitHub

- [ ] **P9-04: Code review by agent**
  - "Review" button in right panel header:
    - Click spawns a new agent session in same workspace
    - Agent receives: current diff + custom review prompt (from `repos.custom_prompt_code_review` or default)
    - Agent uses `DiffComment` MCP tool to add comments on specific lines
    - Review comments appear inline on diff with `author=claude`
    - Custom review prompt editable in Settings > Repository
    - Custom review model selector: pick which model performs reviews (from `repos` settings)
    - Apply custom branch rename prompt from `repos.custom_prompt_rename_branch`
  - **Done when:**
    - Click Review → agent starts reviewing diff
    - Comments appear inline on diff lines as they're added
    - Comments attributed to "claude" author
    - Custom review prompt used when configured
    - Review model selectable (different from chat model)
    - Custom prompts for review, PR, branch rename all configurable in settings

- [ ] **P9-05: Checks tab — unified pre-merge view**
  - Create `src/components/Checks/ChecksTab.tsx` consolidating:
    - **Git Status**: uncommitted files count, committed files count
    - **CI Actions**: GitHub Actions status (from P9-02)
    - **Deployments**: Vercel and GitHub deployment status (fetch via `gh api`)
    - **Comments**: unresolved comment count, link to view in diff
    - **Todos**: todo list with blocking indicators (from P7-02)
    - **PR Info**: editable PR title, description, merge button
    - **PR Status**: review approval state (approved/changes_requested/pending)
  - Sections collapsible, show summary badges when collapsed
  - **Done when:**
    - All 7 sections render in Checks tab
    - Git status shows correct counts
    - CI actions integrated from P9-02
    - Vercel deployment status shown
    - Comments section shows unresolved count
    - Todos section shows blocking items
    - PR info editable, merge button functional

- [ ] **P9-06: Linear integration**
  - Create `src-tauri/src/integrations/linear.rs`:
    - Authenticate via Linear API key (stored in settings)
    - `search_linear_issues(team_id, query)`: search issues, return id/title/status
    - `link_issue_to_workspace(workspace_id, issue_id)`: store link
    - `get_linked_issue(workspace_id)`: return linked issue details
  - `Cmd+I` in workspace: opens Linear issue search dialog
  - Create workspace from Linear issue: "From Issue" mode in New Workspace dialog
  - Issue status-based workspace organization: map Linear status to workspace derived_status
  - **Done when:**
    - Linear API key configurable in settings
    - `Cmd+I` opens issue search, can link issue to workspace
    - Linked issue shows in workspace sidebar
    - Create workspace from Linear issue works
    - Issues searchable with team filter

**HARD STOP** — Verify: Full GitHub integration: PR creation, CI viewing with re-run, comment sync, agent code review. Checks tab shows unified view. Linear issue linking works. Run `cargo test` and `pnpm test`.

### Phase 9 Tests

**Rust tests:**
```
test_github_pr_status_parsing()          — Parse gh output for PR status correctly
test_github_actions_status_parsing()     — Parse workflow runs, job statuses
test_github_comment_fetch()              — Fetch and parse PR comments
test_github_enterprise_detection()       — Detect GHE hostname from gh config
test_linear_issue_search()               — Search returns matching issues
test_linear_issue_link()                 — Link stored and retrievable
```

**Frontend tests:**
```
CIActions.test.tsx          — Jobs render with status icons, sort works, re-run button
PRComments.test.tsx         — Comments on diff lines, threaded replies, draft persistence
ReviewButton.test.tsx       — Click starts review, comments appear as agent adds them
ChecksTab.test.tsx          — All 7 sections render, collapsible, summary badges
LinearSearch.test.tsx       — Search dialog, results, link to workspace
```

---

### PHASE 10: Settings + Polish + Advanced (P10-*)

- [ ] **P10-01: Settings page**
  - Create `src/components/Settings/SettingsPage.tsx`: full-page settings (not dialog)
  - Navigate via gear icon in sidebar or `Cmd+,`
  - Sections:
    - **Chat**: Default model, default thinking level, default Codex thinking level, send key (Enter vs Cmd+Enter), strict data privacy toggle
    - **Appearance**: Monospace font picker, zoom level, max chat width, markdown style (default/tufte), sound effects toggle
    - **Git**: Branch prefix type (github_username/custom), custom prefix input, default target branch
    - **Environment**: Per-repo env var editor (from P6-03)
    - **Repository**: Per-repo settings — setup/run/archive scripts (in-UI editor), custom agent instructions, custom prompts (review, PR, branch rename), working directories for monorepos
    - **Experimental**: Spotlight testing toggle, Chrome integration toggle
    - **Integrations**: Linear API key, default IDE picker (VS Code, Cursor, Xcode, Android Studio, Sourcetree, Fork), GitHub Enterprise hostname
    - **Notifications**: Desktop notifications toggle, sound effects toggle
    - **About**: App version, SDK versions, links
  - All settings persisted to `settings` table via Tauri commands
  - Live preview: changing font/zoom/theme updates immediately
  - **Done when:**
    - Full-page settings opens via gear icon or `Cmd+,`
    - All sections render with correct current values
    - Changing any setting persists to DB and takes effect immediately
    - Font change updates terminal + code views
    - Zoom changes WebView zoom level
    - All settings keys from PRD Section 4 (settings table) are configurable

- [ ] **P10-02: Spotlight testing**
  - Settings > Experimental > "Use spotlight testing" toggle
  - Per-workspace spotlight button in toolbar
  - On activate:
    1. Check `is_git_busy` — block if rebase/merge in progress
    2. Save pre-spotlight checkpoint: `refs/orchestra-checkpoints/pre-spotlight`
    3. Start `watchexec` (or `notify` crate) watching worktree for file changes
    4. On each file change:
       - Run checkpoint save in worktree
       - Sync only git-tracked files (from `git ls-files`) to repo root via `git checkout <checkpoint> -- .`
       - Ignore `*.tmp.*`, `.context/**`
    5. Open terminal in repo root directory (separate from worktree terminal)
    6. Hot reload: changed files trigger dev server hot reload automatically
  - On deactivate: restore repo root to pre-spotlight state, clean up watchers
  - Conflict detection: block if git rebase/merge in progress in either worktree or repo root
  - Log to `/tmp/orchestra-spotlight-<pid>.log`
  - **Done when:**
    - Spotlight button activates/deactivates
    - File change in worktree → synced to repo root within 2s
    - Repo root terminal available for running dev server
    - Deactivate restores repo root to original state
    - Blocked when rebase/merge in progress

- [ ] **P10-03: macOS notifications**
  - `tauri_plugin_notification` for native macOS notifications
  - Notify on: agent completed task, agent errored, workspace ready to merge
  - Notification includes workspace name (district name) and branch
  - Click notification → focus Orchestra window and switch to that workspace
  - Toggle in settings: `notifications_enabled`
  - Sound effects: optional notification sounds (setting: `sound_effects_enabled`)
  - **Done when:**
    - Agent completes → macOS notification with workspace name
    - Agent errors → notification with error summary
    - Click notification → app focuses, workspace selected
    - Sound plays on notification (if enabled)
    - Notification toggle in settings works

- [ ] **P10-04: macOS menu bar**
  - Configure native macOS menu bar:
    - Orchestra menu: About Orchestra, Preferences (`Cmd+,`), Quit
    - File menu: New Workspace (`Cmd+Shift+N`), Close Tab (`Cmd+W`)
    - Edit menu: standard cut/copy/paste/select-all
    - View menu: Toggle Left Sidebar, Toggle Right Sidebar, Zen Mode, Zoom In/Out
    - Help menu: Shortcuts (`Cmd+?`), App version, SDK versions
  - **Done when:**
    - All menu items render in macOS menu bar
    - Menu shortcuts match keyboard shortcuts
    - About shows app version
    - Help > Shortcuts opens shortcuts overlay

- [ ] **P10-05: Workspace forking (UI)**
  - Fork option in workspace context menu
  - On fork:
    1. Create new worktree from same base branch
    2. Copy `.context/` contents to new workspace
    3. Generate summary of original workspace's conversation
    4. New workspace includes summary in initial context
  - Fork creates a new entry in sidebar with "(fork)" suffix on name
  - **Done when:**
    - Fork from context menu creates new workspace
    - New worktree created from same base
    - Chat summary carried over
    - Fork visible in sidebar with distinct name

- [ ] **P10-06: Zen mode + sidebar toggles**
  - `Cmd+.` or `Ctrl+Z`: Zen mode — hide both sidebars, maximize center panel
  - `Cmd+B`: toggle left sidebar
  - `Option+Cmd+B`: toggle right sidebar
  - `[` key: toggle left sidebar
  - `]` key: toggle right sidebar
  - Smooth animation: 200ms ease slide
  - **Done when:**
    - Zen mode hides both sidebars with smooth animation
    - `Cmd+B` and `[` toggle left sidebar
    - `Option+Cmd+B` and `]` toggle right sidebar
    - All toggles are reversible

- [ ] **P10-07: Open in IDE**
  - Support opening files in external IDEs: VS Code, Cursor, Xcode (`xed`), Android Studio, Sourcetree, Fork
  - Setting: `default_open_in` (dropdown in settings)
  - IDE detection: check which IDEs are installed on system
  - "Open in IDE" button in: file tree context menu, diff viewer header, file explorer
  - Commands: `code <path>`, `cursor <path>`, `xed <path>`, etc.
  - **Done when:**
    - Setting shows detected installed IDEs
    - Click "Open in IDE" opens file in selected IDE
    - All 6 IDEs supported
    - Works from file tree, diff viewer, and file explorer

- [ ] **P10-08: Workspace templates**
  - Save current workspace configuration as template: agent type + model + custom instructions + thinking level
  - Template library: list saved templates
  - New Workspace dialog: "From Template" option
  - Templates stored in settings or separate SQLite table
  - **Done when:**
    - "Save as Template" option in workspace context menu
    - Template saved with agent config
    - "From Template" tab in New Workspace dialog
    - Select template → pre-fills workspace creation form

- [ ] **P10-09: Export/import**
  - Export workspace data as markdown or JSON:
    - Conversation history (all messages)
    - Diff summary
    - Notes and todos
    - Cost/token summary
  - Export formats: `.md` (human-readable), `.json` (machine-readable)
  - Import: load exported JSON to recreate workspace context
  - **Done when:**
    - Export button in workspace context menu
    - Markdown export contains full conversation + diff
    - JSON export contains all structured data
    - Import creates workspace with loaded context

- [ ] **P10-10: Auto-updater**
  - `tauri_plugin_updater` for automatic update checking
  - Check on startup (and every 6 hours)
  - Notification banner: "Update available: v1.1.0" with "Update Now" button
  - One-click update: download + install + restart
  - **Done when:**
    - Update check runs on startup
    - Update available → banner shown
    - Click "Update Now" → downloads, installs, restarts
    - No update → no UI shown

- [ ] **P10-11: Slash command support**
  - Forward Claude Code slash commands from composer: `/clear`, `/compact`, `/restart`
  - Detect slash commands in user input (starts with `/`)
  - `/clear`: clear conversation display + send to agent
  - `/compact`: trigger context compaction, show `is_compacting` state
  - `/restart`: restart agent process, create new session
  - Project-level custom slash commands: parse from `conductor.json` `scripts` field
  - Autocomplete integration (already in P3-05): show both built-in and custom commands
  - **Done when:**
    - Type `/clear` in composer → conversation cleared
    - Type `/compact` → agent compacts, loading state shown
    - Type `/restart` → agent restarted, new session
    - Custom commands from conductor.json appear in autocomplete

- [ ] **P10-12: Configurable storage location**
  - Settings option to change workspace storage root (default: `~/open-conductor/workspaces/`)
  - On change: move existing workspaces to new location (or warn)
  - Validate new path is writable
  - **Done when:**
    - Settings shows current storage path
    - Can change to new path
    - New workspaces created in new location
    - Warning shown about existing workspaces

**HARD STOP** — Verify: All settings functional, spotlight testing works, notifications fire, menu bar configured, keyboard shortcuts complete, IDE opening works. Run full test suite.

### Phase 10 Tests

**Rust tests:**
```
test_spotlight_file_sync()               — Change in worktree synced to repo root
test_spotlight_deactivate_restore()      — Repo root restored to original state
test_spotlight_blocked_during_rebase()   — Returns error when rebase in progress
test_notification_agent_complete()       — Notification sent on agent completion
test_ide_detection()                     — Detects installed IDEs on system
test_export_markdown()                   — Export generates valid markdown with conversation + diff
test_export_json()                       — Export generates valid JSON with all workspace data
test_template_save_and_load()            — Save template, load it, all fields match
test_storage_location_change()           — Change path, new workspaces use new location
```

**Frontend tests:**
```
SettingsPage.test.tsx       — All sections render, changes persist, live preview works
SpotlightButton.test.tsx    — Toggle activates/deactivates, blocked state shown
ZenMode.test.tsx            — Toggle hides both sidebars with animation
MenuBar.test.tsx            — All menu items present with correct shortcuts
OpenInIDE.test.tsx          — Button visible, opens correct IDE
ExportDialog.test.tsx       — Format selection, export triggers download
TemplateSelector.test.tsx   — Templates listed, select pre-fills form
SlashCommands.test.tsx      — /clear, /compact, /restart all handled correctly
```

---

## CARGO.TOML DEPENDENCIES

```toml
[dependencies]
tauri = { version = "2", features = ["macos-private-api"] }
tauri-plugin-shell = "2"
tauri-plugin-notification = "2"
tauri-plugin-updater = "2"
tauri-plugin-dialog = "2"
tauri-plugin-fs = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
sqlx = { version = "0.8", features = ["runtime-tokio", "sqlite"] }
git2 = "0.19"
rmcp = { version = "1.0", features = ["server", "macros", "transport-io"] }
tokio = { version = "1", features = ["full"] }
schemars = "1.0"
reqwest = { version = "0.12", features = ["json"] }
uuid = { version = "1", features = ["v4"] }
chrono = { version = "0.4", features = ["serde"] }
thiserror = "2"
tracing = "0.1"
tracing-subscriber = "0.3"
notify = "7"
ring = "0.17"
portable-pty = "0.8"
rand = "0.8"
```

## PACKAGE.JSON KEY DEPENDENCIES

```json
{
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@tauri-apps/api": "^2.0.0",
    "@tauri-apps/plugin-shell": "^2.0.0",
    "@tauri-apps/plugin-notification": "^2.0.0",
    "@tauri-apps/plugin-dialog": "^2.0.0",
    "zustand": "^5.0.0",
    "@tanstack/react-query": "^5.0.0",
    "react-resizable-panels": "^2.0.0",
    "@xterm/xterm": "^5.5.0",
    "@xterm/addon-webgl": "^0.18.0",
    "@xterm/addon-web-links": "^0.11.0",
    "monaco-editor": "^0.52.0",
    "@monaco-editor/react": "^4.7.0",
    "cmdk": "^1.0.0",
    "react-window": "^1.8.0",
    "@tiptap/react": "^2.0.0",
    "@tiptap/starter-kit": "^2.0.0",
    "react-markdown": "^9.0.0",
    "remark-gfm": "^4.0.0",
    "remark-math": "^6.0.0",
    "rehype-katex": "^7.0.0",
    "mermaid": "^11.0.0",
    "tailwindcss": "^4.0.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@tauri-apps/cli": "^2.0.0",
    "typescript": "^5.6.0",
    "vite": "^6.0.0",
    "@vitejs/plugin-react": "^4.0.0",
    "vitest": "^3.0.0",
    "@testing-library/react": "^16.0.0",
    "@playwright/test": "^1.48.0"
  }
}
```

---

## PREREQUISITES — WHAT THE USER MUST PROVIDE

### 1. Development Toolchain (Required for building)

| Tool | Why | Install |
|------|-----|---------|
| **Rust toolchain** (rustup, cargo, rustc) | Tauri backend compiles to native Rust | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` |
| **Node.js >= 18** + **pnpm** | React frontend builds with Vite | `brew install node && npm i -g pnpm` |
| **Xcode Command Line Tools** | macOS system headers, linker | `xcode-select --install` |
| **sqlx-cli** (optional, for offline mode) | Pre-compile SQL queries at build time | `cargo install sqlx-cli` |

### 2. GitHub Authentication (Required for P4-05, P9-01 to P9-03)

- **Install `gh` CLI**: `brew install gh`
- **Authenticate**: `gh auth login`
- **Scopes needed**: `repo`, `read:org`
- **GitHub Enterprise**: `gh auth login --hostname your-enterprise.com`

### 3. AI Agent CLIs (Required for P3-*)

| Agent | Install | Auth |
|-------|---------|------|
| **Claude Code** | `npm install -g @anthropic-ai/claude-code` | `claude login` OR `ANTHROPIC_API_KEY` |
| **Codex** (optional) | `npm install -g @openai/codex` | `OPENAI_API_KEY` |

### 4. Environment Variables Summary

```bash
# Required for AI agents
ANTHROPIC_API_KEY=sk-ant-...        # For Claude Code (alternative to `claude login`)
OPENAI_API_KEY=sk-...                # For Codex (optional)

# Required only for distribution builds
APPLE_ID=you@email.com
APPLE_PASSWORD=xxxx-xxxx-xxxx-xxxx
APPLE_TEAM_ID=XXXXXXXXXX
```

### 5. First-Run Checklist

- [ ] Rust toolchain installed (`rustc --version`)
- [ ] Node.js + pnpm installed (`pnpm --version`)
- [ ] Xcode CLT installed (`xcode-select -p`)
- [ ] `gh` CLI authenticated (`gh auth status`)
- [ ] `claude` CLI installed (`claude --version`)
- [ ] At least one local git repo to test with

---

## NOTES FOR RALPH LOOP AGENT

1. **Work phase by phase, feature by feature.** Each `P*-**` item is a self-contained unit. Complete one before starting the next.
2. **Always run tests after each feature.** If a test fails, fix it before moving on.
3. **The TECHNICAL_PRD.md has the full reference** — real SQLite schemas, exact column names, all keyboard shortcuts, all MCP tools. Consult it when you need specifics.
4. **Theme is warm ochre/brown.** Every component should use the CSS variables defined above. No cold grays or blues.
5. **Use the exact CSS variable names** from the theme section. Don't invent new colors.
6. **The MCP server is in Rust using rmcp**, not Node.js. This is a key architectural choice.
7. **Indian district names** for workspace naming — not city names, not random strings.
8. **Bundle agent CLIs** — check if `claude` and `codex` are on PATH. Show setup dialog if missing.
9. **SQLite migrations** — use sqlx migrations in `src-tauri/migrations/`. Number sequentially.
10. **Tauri commands** are the bridge between frontend and backend. Frontend never touches SQLite directly.
11. **Error handling** — use `Result<T, E>` everywhere in Rust. Surface errors as structured JSON.
12. **HARD STOP markers** — stop and validate the full build + tests before crossing a phase boundary.
13. **Commit after each P-item** — `feat(P1-01): Initialize Tauri 2.0 project`
14. **Mark checkboxes as you go** — update this file with `- [x]` after completing each item.

---

*Orchestra — Built for the community, by the community.*
