import { describe, it, expect } from "vitest";
import { AGENTS, getAgent, getAgentModels } from "../constants/agents";

describe("AGENTS constants", () => {
  it("defines exactly Claude Code and Codex", () => {
    expect(AGENTS).toHaveLength(2);
    expect(AGENTS.map((a) => a.id)).toEqual(["claude", "codex"]);
  });

  it("each agent has required fields", () => {
    for (const agent of AGENTS) {
      expect(agent.id).toBeTruthy();
      expect(agent.name).toBeTruthy();
      expect(agent.cli).toBeTruthy();
      expect(agent.description).toBeTruthy();
      expect(agent.color).toBeTruthy();
      expect(agent.iconLabel).toBeTruthy();
      expect(agent.models.length).toBeGreaterThan(0);
    }
  });

  it("Claude Code supports resume and session IDs", () => {
    const claude = AGENTS.find((a) => a.id === "claude")!;
    expect(claude.supportsResume).toBe(true);
    expect(claude.supportsSessionId).toBe(true);
    expect(claude.terminalOnly).toBe(false);
  });

  it("Codex is terminal-only and does not support resume", () => {
    const codex = AGENTS.find((a) => a.id === "codex")!;
    expect(codex.supportsResume).toBe(false);
    expect(codex.supportsSessionId).toBe(false);
    expect(codex.terminalOnly).toBe(true);
  });

  it("agent icon labels are 2 characters", () => {
    for (const agent of AGENTS) {
      expect(agent.iconLabel).toHaveLength(2);
    }
  });

  it("all model IDs are unique across all agents", () => {
    const allModelIds = AGENTS.flatMap((a) => a.models.map((m) => m.id));
    const unique = new Set(allModelIds);
    expect(unique.size).toBe(allModelIds.length);
  });

  it("each agent has a default model that exists in its model list", () => {
    for (const agent of AGENTS) {
      if (agent.defaultModel) {
        const modelIds = agent.models.map((m) => m.id);
        expect(modelIds).toContain(agent.defaultModel);
      }
    }
  });
});

describe("getAgent", () => {
  it("returns Claude Code by id", () => {
    const agent = getAgent("claude");
    expect(agent).toBeDefined();
    expect(agent!.name).toBe("Claude Code");
  });

  it("returns Codex by id", () => {
    const agent = getAgent("codex");
    expect(agent).toBeDefined();
    expect(agent!.name).toBe("Codex");
  });

  it("returns undefined for unknown id", () => {
    expect(getAgent("nonexistent")).toBeUndefined();
  });
});

describe("getAgentModels", () => {
  it("returns Claude Code models", () => {
    const models = getAgentModels("claude");
    expect(models.length).toBeGreaterThan(0);
    expect(models.some((m) => m.provider === "anthropic")).toBe(true);
  });

  it("returns Codex models", () => {
    const models = getAgentModels("codex");
    expect(models.length).toBeGreaterThan(0);
    expect(models.some((m) => m.provider === "openai")).toBe(true);
  });

  it("returns empty array for unknown agent", () => {
    expect(getAgentModels("unknown")).toEqual([]);
  });
});
