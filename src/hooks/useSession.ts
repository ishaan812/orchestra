import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

export interface SessionInfo {
  id: string;
  workspace_id: string;
  title: string | null;
  agent_type: string;
  model: string | null;
  permission_mode: string;
  thinking_enabled: boolean;
  context_used_percent: number;
  unread_count: number;
  is_compacting: boolean;
  created_at: string;
}

export interface MessageInfo {
  id: string;
  session_id: string;
  role: string;
  content: string;
  full_message: string | null;
  model: string | null;
  turn_id: string | null;
  sent_at: string;
  cancelled_at: string | null;
}

export interface AgentMessageEvent {
  session_id: string;
  id: string;
  role: string;
  content: string;
  tool_name: string | null;
  tool_args: string | null;
  model: string | null;
  turn_id: string;
}

export interface AgentStatusEvent {
  session_id: string;
  status: "running" | "completed" | "error";
}

interface SessionStore {
  sessions: Record<string, SessionInfo>;
  messages: Record<string, MessageInfo[]>;
  agentStatus: Record<string, string>;
  loading: boolean;

  createSession: (params: {
    workspace_id: string;
    agent_type: string;
    model: string;
    task_prompt: string;
    thinking_enabled: boolean;
  }) => Promise<SessionInfo>;

  sendMessage: (sessionId: string, content: string) => Promise<MessageInfo>;
  cancelSession: (sessionId: string) => Promise<void>;
  stopSession: (sessionId: string) => Promise<void>;
  loadMessages: (sessionId: string) => Promise<void>;
  getSession: (sessionId: string) => Promise<SessionInfo>;
  addMessage: (sessionId: string, msg: MessageInfo) => void;
  setAgentStatus: (sessionId: string, status: string) => void;
}

export const useSessionStore = create<SessionStore>((set, get) => ({
  sessions: {},
  messages: {},
  agentStatus: {},
  loading: false,

  createSession: async (params) => {
    const session = await invoke<SessionInfo>("create_session", {
      params,
    });
    set((state) => ({
      sessions: { ...state.sessions, [session.id]: session },
      messages: { ...state.messages, [session.id]: [] },
      agentStatus: { ...state.agentStatus, [session.id]: "running" },
    }));
    return session;
  },

  sendMessage: async (sessionId, content) => {
    const msg = await invoke<MessageInfo>("send_message", {
      sessionId,
      content,
    });
    get().addMessage(sessionId, msg);
    return msg;
  },

  cancelSession: async (sessionId) => {
    await invoke("cancel_session", { sessionId });
  },

  stopSession: async (sessionId) => {
    await invoke("stop_session", { sessionId });
    set((state) => ({
      agentStatus: { ...state.agentStatus, [sessionId]: "stopped" },
    }));
  },

  loadMessages: async (sessionId) => {
    set({ loading: true });
    try {
      const msgs = await invoke<MessageInfo[]>("get_session_messages", {
        sessionId,
      });
      set((state) => ({
        messages: { ...state.messages, [sessionId]: msgs },
      }));
    } finally {
      set({ loading: false });
    }
  },

  getSession: async (sessionId) => {
    const session = await invoke<SessionInfo>("get_session", { sessionId });
    set((state) => ({
      sessions: { ...state.sessions, [session.id]: session },
    }));
    return session;
  },

  addMessage: (sessionId, msg) => {
    set((state) => {
      const existing = state.messages[sessionId] ?? [];
      return {
        messages: { ...state.messages, [sessionId]: [...existing, msg] },
      };
    });
  },

  setAgentStatus: (sessionId, status) => {
    set((state) => ({
      agentStatus: { ...state.agentStatus, [sessionId]: status },
    }));
  },
}));

// Listen for agent events from Tauri backend
let eventListenersSetup = false;

export function setupAgentEventListeners() {
  if (eventListenersSetup) return;
  eventListenersSetup = true;

  listen<AgentMessageEvent>("agent:message", (event) => {
    const data = event.payload;
    const store = useSessionStore.getState();
    store.addMessage(data.session_id, {
      id: data.id,
      session_id: data.session_id,
      role: data.role,
      content: data.content,
      full_message: null,
      model: data.model,
      turn_id: data.turn_id,
      sent_at: new Date().toISOString(),
      cancelled_at: null,
    });
  });

  listen<AgentStatusEvent>("agent:status", (event) => {
    const data = event.payload;
    const store = useSessionStore.getState();
    store.setAgentStatus(data.session_id, data.status);
  });
}
