import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";

interface SettingsStore {
  settings: Record<string, string>;
  loading: boolean;
  fetchSettings: () => Promise<void>;
  setSetting: (key: string, value: string) => Promise<void>;
  getSetting: (key: string, fallback?: string) => string;
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: {},
  loading: false,

  fetchSettings: async () => {
    set({ loading: true });
    try {
      const settings = await invoke<Record<string, string>>("get_settings");
      set({ settings });
    } finally {
      set({ loading: false });
    }
  },

  setSetting: async (key, value) => {
    await invoke("set_setting", { key, value });
    set((state) => ({
      settings: { ...state.settings, [key]: value },
    }));
  },

  getSetting: (key, fallback = "") => {
    return get().settings[key] ?? fallback;
  },
}));
