import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";

export interface Repo {
  id: string;
  name: string;
  path: string;
  remote_url: string | null;
  default_branch: string;
  remote: string;
  display_order: number;
  created_at: string;
  updated_at: string;
}

interface RepoStore {
  repos: Repo[];
  selectedRepoId: string | null;
  loading: boolean;
  setSelectedRepoId: (id: string | null) => void;
  fetchRepos: () => Promise<void>;
  addRepo: (path: string) => Promise<Repo>;
  removeRepo: (id: string) => Promise<void>;
  reorderRepos: (ids: string[]) => Promise<void>;
}

export const useRepoStore = create<RepoStore>((set, get) => ({
  repos: [],
  selectedRepoId: null,
  loading: false,

  setSelectedRepoId: (id) => set({ selectedRepoId: id }),

  fetchRepos: async () => {
    set({ loading: true });
    try {
      const repos = await invoke<Repo[]>("list_repos");
      const { selectedRepoId } = get();
      set({
        repos,
        selectedRepoId:
          selectedRepoId && repos.some((r) => r.id === selectedRepoId)
            ? selectedRepoId
            : repos[0]?.id ?? null,
      });
    } finally {
      set({ loading: false });
    }
  },

  addRepo: async (path) => {
    const repo = await invoke<Repo>("add_repo", { path });
    const { repos } = get();
    set({ repos: [...repos, repo], selectedRepoId: repo.id });
    return repo;
  },

  removeRepo: async (id) => {
    await invoke("remove_repo", { id });
    const { repos, selectedRepoId } = get();
    const remaining = repos.filter((r) => r.id !== id);
    set({
      repos: remaining,
      selectedRepoId:
        selectedRepoId === id ? (remaining[0]?.id ?? null) : selectedRepoId,
    });
  },

  reorderRepos: async (ids) => {
    await invoke("reorder_repos", { ids });
    const { repos } = get();
    const reordered = ids
      .map((id) => repos.find((r) => r.id === id))
      .filter((r): r is Repo => r !== undefined);
    set({ repos: reordered });
  },
}));
