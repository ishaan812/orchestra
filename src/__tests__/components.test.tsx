import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AgentLogo } from "../components/Agents/AgentLogo";
import { ConnectionStatusBadge } from "../components/SSH/ConnectionStatusBadge";
import { RemoteProjectIndicator } from "../components/SSH/RemoteProjectIndicator";
import { SshConnectionTestButton } from "../components/SSH/SshConnectionTestButton";

describe("AgentLogo", () => {
  it("renders Claude Code initials", () => {
    const { container } = render(<AgentLogo agentId="claude" size={24} />);
    expect(container.textContent).toContain("CC");
  });

  it("renders Codex initials", () => {
    const { container } = render(<AgentLogo agentId="codex" size={24} />);
    expect(container.textContent).toContain("CX");
  });

  it("renders fallback for unknown agent", () => {
    const { container } = render(<AgentLogo agentId="unknown" size={24} />);
    expect(container.textContent).toBeTruthy();
  });

  it("respects size prop", () => {
    const { container } = render(<AgentLogo agentId="claude" size={32} />);
    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();
    expect(svg?.getAttribute("width")).toBe("32");
    expect(svg?.getAttribute("height")).toBe("32");
  });
});

describe("ConnectionStatusBadge", () => {
  it("renders nothing when no result", () => {
    const { container } = render(<ConnectionStatusBadge />);
    expect(container.innerHTML).toBe("");
  });

  it("shows Testing... when testing", () => {
    render(<ConnectionStatusBadge testing={true} />);
    expect(screen.getByText("Testing...")).toBeTruthy();
  });

  it("shows Connected for successful result", () => {
    render(
      <ConnectionStatusBadge
        result={{ success: true, message: "OK", latency_ms: 42 }}
      />
    );
    expect(screen.getByText(/Connected/)).toBeTruthy();
    expect(screen.getByText(/42ms/)).toBeTruthy();
  });

  it("shows Failed for unsuccessful result", () => {
    render(
      <ConnectionStatusBadge
        result={{ success: false, message: "Connection refused", latency_ms: null }}
      />
    );
    expect(screen.getByText("Failed")).toBeTruthy();
  });
});

describe("RemoteProjectIndicator", () => {
  it("renders host name", () => {
    render(<RemoteProjectIndicator hostName="myserver.com" />);
    expect(screen.getByText(/myserver\.com/)).toBeTruthy();
  });

  it("shows SSH prefix", () => {
    render(<RemoteProjectIndicator hostName="example.com" connected />);
    expect(screen.getByText(/SSH:/)).toBeTruthy();
  });
});

describe("SshConnectionTestButton", () => {
  it("shows Test when not testing", () => {
    render(<SshConnectionTestButton testing={false} onTest={() => {}} />);
    expect(screen.getByText("Test")).toBeTruthy();
  });

  it("shows Testing... when testing", () => {
    render(<SshConnectionTestButton testing={true} onTest={() => {}} />);
    expect(screen.getByText("Testing...")).toBeTruthy();
  });

  it("is disabled when testing", () => {
    render(<SshConnectionTestButton testing={true} onTest={() => {}} />);
    const button = screen.getByText("Testing...").closest("button");
    expect(button?.disabled).toBe(true);
  });
});
