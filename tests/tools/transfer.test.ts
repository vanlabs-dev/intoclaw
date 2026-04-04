import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { registerTransferTools } from "../../src/tools/transfer.js";

const { mockExecFile } = vi.hoisted(() => ({
  mockExecFile: vi.fn(),
}));
vi.mock("node:child_process", () => ({
  execFile: mockExecFile,
}));

import { _resetCacheForTesting } from "../../src/backends/agcli.js";
import { pendingStore } from "../../src/lib/pending.js";

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
  registerTransferTools(server);
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

describe("tao_transfer", () => {
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

  it("returns preview with operation_id", async () => {
    simulateAgcli('{"success":true}');
    const result = await client.callTool({
      name: "tao_transfer",
      arguments: {
        dest: "5GsbTgfvgCH4xdqSkiPb7EaBBFLHjWH5vfEALhJaewSFpZX9",
        amount: 5,
      },
    });
    const data = parse(result);
    expect(data.status).toBe("preview");
    expect(data.needs_confirmation).toBe(true);
    expect(data.operation_id).toBeTruthy();
    pendingStore.removePending(data.operation_id);
  });

  it("rejects invalid SS58 address", async () => {
    const result = await client.callTool({
      name: "tao_transfer",
      arguments: { dest: "not-valid!", amount: 5 },
    });
    const data = parse(result);
    expect(data.error).toContain("Invalid address");
  });

  it("returns error when agcli not installed", async () => {
    mockExecFile.mockImplementation(
      (_b: string, _a: string[], _o: unknown, cb: ExecCb) => {
        cb({ code: "ENOENT" }, "", "");
        return { stdin: { end: vi.fn() } };
      },
    );
    const result = await client.callTool({
      name: "tao_transfer",
      arguments: {
        dest: "5GsbTgfvgCH4xdqSkiPb7EaBBFLHjWH5vfEALhJaewSFpZX9",
        amount: 5,
      },
    });
    const data = parse(result);
    expect(data.error).toContain("not installed");
  });
});
