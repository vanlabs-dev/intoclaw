import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { registerConfigTools } from "../../src/tools/config.js";

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
  registerConfigTools(server);
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

describe("tao_config", () => {
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

  it("shows all config with no params", async () => {
    simulateAgcli('{"network":"finney","wallet":"default"}');
    const result = await client.callTool({
      name: "tao_config",
      arguments: {},
    });
    const data = parse(result);
    expect(data.config).toBeDefined();
    expect(data.config.network).toBe("finney");
  });

  it("sets config key and value", async () => {
    simulateAgcli('{"ok":true}');
    const result = await client.callTool({
      name: "tao_config",
      arguments: { key: "spending_limit", value: "50" },
    });
    const data = parse(result);
    expect(data.action).toBe("set");
    expect(data.key).toBe("spending_limit");
    expect(data.value).toBe("50");
  });

  it("returns error when agcli not installed", async () => {
    mockExecFile.mockImplementation(
      (_b: string, _a: string[], _o: unknown, cb: ExecCb) => {
        cb({ code: "ENOENT" }, "", "");
        return { stdin: { end: vi.fn() } };
      },
    );
    const result = await client.callTool({
      name: "tao_config",
      arguments: {},
    });
    const data = parse(result);
    expect(data.error).toContain("not installed");
  });
});
