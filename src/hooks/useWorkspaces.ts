import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";

export interface WorkspaceInfo {
  id: string;
  repo_id: string;
  name: string;
  branch_name: string;
  worktree_path: string;
  state: string;
  derived_status: string;
  task_prompt: string | null;
  agent_type: string | null;
  model: string | null;
  unread: boolean;
  pinned_at: string | null;
  intended_target_branch: string | null;
  pr_title: string | null;
  pr_description: string | null;
  notes: string | null;
  insertions: number;
  deletions: number;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceGroup {
  backlog: WorkspaceInfo[];
  in_progress: WorkspaceInfo[];
  in_review: WorkspaceInfo[];
  done: WorkspaceInfo[];
}

interface WorkspaceStore {
  workspaces: WorkspaceGroup;
  activeWorkspaceId: string | null;
  openTabs: string[];
  loading: boolean;
  setActiveWorkspaceId: (id: string | null) => void;
  fetchWorkspaces: (repoId: string) => Promise<void>;
  createWorkspace: (params: {
    repo_id: string;
    task_prompt?: string;
    agent_type?: string;
    model?: string;
    target_branch?: string;
  }) => Promise<WorkspaceInfo>;
  deleteWorkspace: (id: string) => Promise<void>;
  archiveWorkspace: (id: string) => Promise<void>;
  pinWorkspace: (id: string) => Promise<void>;
  unpinWorkspace: (id: string) => Promise<void>;
  openTab: (id: string) => void;
  closeTab: (id: string) => void;
}

const emptyGroup: WorkspaceGroup = {
  backlog: [],
  in_progress: [],
  in_review: [],
  done: [],
};

export const useWorkspaceStore = create<WorkspaceStore>((set, get) => ({
  workspaces: emptyGroup,
  activeWorkspaceId: null,
  openTabs: [],
  loading: false,

  setActiveWorkspaceId: (id) => {
    set({ activeWorkspaceId: id });
    if (id) {
      const { openTabs } = get();
      if (!openTabs.includes(id)) {
        set({ openTabs: [...openTabs, id] });
      }
    }
  },

  fetchWorkspaces: async (repoId) => {
    set({ loading: true });
    try {
      const workspaces = await invoke<WorkspaceGroup>("list_workspaces", {
        repoId,
      });
      set({ workspaces });
    } finally {
      set({ loading: false });
    }
  },

  createWorkspace: async (params) => {
    const ws = await invoke<WorkspaceInfo>("create_workspace", params);
    const { openTabs } = get();
    set({
      activeWorkspaceId: ws.id,
      openTabs: [...openTabs, ws.id],
    });
    return ws;
  },

  deleteWorkspace: async (id) => {
    await invoke("delete_workspace", { id });
    const { openTabs, activeWorkspaceId } = get();
    const newTabs = openTabs.filter((t) => t !== id);
    set({
      openTabs: newTabs,
      activeWorkspaceId:
        activeWorkspaceId === id ? (newTabs[newTabs.length - 1] ?? null) : activeWorkspaceId,
    });
  },

  archiveWorkspace: async (id) => {
    await invoke("archive_workspace", { id });
    const { openTabs, activeWorkspaceId } = get();
    const newTabs = openTabs.filter((t) => t !== id);
    set({
      openTabs: newTabs,
      activeWorkspaceId:
        activeWorkspaceId === id ? (newTabs[newTabs.length - 1] ?? null) : activeWorkspaceId,
    });
  },

  pinWorkspace: async (id) => {
    await invoke("pin_workspace", { id });
  },

  unpinWorkspace: async (id) => {
    await invoke("unpin_workspace", { id });
  },

  openTab: (id) => {
    const { openTabs } = get();
    if (!openTabs.includes(id)) {
      set({ openTabs: [...openTabs, id] });
    }
    set({ activeWorkspaceId: id });
  },

  closeTab: (id) => {
    const { openTabs, activeWorkspaceId } = get();
    const idx = openTabs.indexOf(id);
    const newTabs = openTabs.filter((t) => t !== id);
    set({ openTabs: newTabs });
    if (activeWorkspaceId === id) {
      const nextId = newTabs[Math.min(idx, newTabs.length - 1)] ?? null;
      set({ activeWorkspaceId: nextId });
    }
  },
}));
