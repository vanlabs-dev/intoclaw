import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { registerExplainTools } from "../../src/tools/explain.js";

const { mockExecFile } = vi.hoisted(() => ({
  mockExecFile: vi.fn(),
}));
vi.mock("node:child_process", () => ({
  execFile: mockExecFile,
}));

import { _resetCacheForTesting } from "../../src/backends/agcli.js";

type ExecCb = (
  err: { code?: string; killed?: boolean } | null,
  stdout: string,
  stderr: string,
) => void;

function simulateAgcli(stdout = "{}") {
  let n = 0;
  mockExecFile.mockImplementation(
    (_b: string, args: string[], _o: unknown, cb: ExecCb) => {
      n++;
      if (n === 1 && args[0] === "--version") cb(null, "agcli 0.1.0", "");
      else cb(null, stdout, "");
      return { stdin: { end: vi.fn() } };
    },
  );
}

async function setup() {
  const server = new McpServer({ name: "test", version: "0.0.0" });
  registerExplainTools(server);
  const client = new Client({ name: "test-client", version: "0.0.0" });
  const [ct, st] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(st), client.connect(ct)]);
  return { server, client };
}

function parse(result: { content: unknown }) {
  return JSON.parse(
    (result.content as Array<{ text: string }>)[0].text,
  );
}

describe("tao_explain", () => {
  let client: Client;
  let server: McpServer;

  beforeEach(async () => {
    vi.clearAllMocks();
    _resetCacheForTesting();
    vi.spyOn(console, "error").mockImplementation(() => {});
    const s = await setup();
    client = s.client;
    server = s.server;
  });

  afterEach(async () => {
    await client.close();
    await server.close();
    vi.restoreAllMocks();
  });

  it("returns agcli explanation with ground-truth", async () => {
    simulateAgcli(
      '{"content":"Tempo is the number of blocks...","topic":"tempo"}',
    );
    const result = await client.callTool({
      name: "tao_explain",
      arguments: { topic: "tempo" },
    });
    const data = parse(result);
    expect(data.source).toBe("agcli + ground-truth");
    expect(data.explanation).toContain("Tempo");
    expect(data.verified_facts).toBeTruthy();
    expect(data.verified_facts.length).toBeGreaterThan(10);
  });

  it("includes ground-truth reference content", async () => {
    simulateAgcli(
      '{"content":"Emissions explained...","topic":"emission"}',
    );
    const result = await client.callTool({
      name: "tao_explain",
      arguments: { topic: "emission" },
    });
    const data = parse(result);
    expect(data.verified_facts).toContain("ALPHA token");
  });

  it("falls back to ground-truth when agcli not installed", async () => {
    mockExecFile.mockImplementation(
      (_b: string, _a: string[], _o: unknown, cb: ExecCb) => {
        cb({ code: "ENOENT" }, "", "");
        return { stdin: { end: vi.fn() } };
      },
    );
    const result = await client.callTool({
      name: "tao_explain",
      arguments: { topic: "staking" },
    });
    const data = parse(result);
    expect(data.source).toBe("ground-truth");
    expect(data.explanation).toContain("Staking");
    expect(data.note).toContain("not available");
  });

  it("handles unknown agcli topic gracefully", async () => {
    simulateAgcli(
      '{"code":12,"error":true,"message":"Unknown topic"}',
    );
    const result = await client.callTool({
      name: "tao_explain",
      arguments: { topic: "staking" },
    });
    const data = parse(result);
    expect(data.source).toBe("ground-truth");
    expect(data.explanation).toBeTruthy();
  });
});
