import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { registerConfirmTools } from "../../src/tools/confirm.js";

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
  registerConfirmTools(server);
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

function createTestOp(): string {
  return pendingStore.createPending({
    tool: "tao_stake_add",
    params: { netuid: 1, amount: 10 },
    agcliCommand: ["stake", "add", "--netuid", "1", "--amount", "10"],
    preview: {},
  });
}

describe("tao_confirm", () => {
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
    delete process.env.AGCLI_PASSWORD;
  });

  it("executes a valid pending operation", async () => {
    simulateAgcli('{"tx_hash":"0xabc","success":true}');
    process.env.AGCLI_PASSWORD = "testpass";
    const opId = createTestOp();

    const result = await client.callTool({
      name: "tao_confirm",
      arguments: { operation_id: opId },
    });
    const data = parse(result);
    expect(data.status).toBe("executed");
    expect(data.result.success).toBe(true);
  });

  it("returns not_found for unknown operation_id", async () => {
    const result = await client.callTool({
      name: "tao_confirm",
      arguments: { operation_id: "00000000-0000-4000-a000-000000000000" },
    });
    const data = parse(result);
    expect(data.error).toContain("not found");
    expect(data.error).toContain("5 minutes");
  });

  it("returns not_found for expired operation", async () => {
    vi.useFakeTimers();
    const opId = createTestOp();
    vi.advanceTimersByTime(301_000);

    const result = await client.callTool({
      name: "tao_confirm",
      arguments: { operation_id: opId },
    });
    const data = parse(result);
    expect(data.error).toContain("not found");
    vi.useRealTimers();
  });

  it("returns error when password not configured", async () => {
    simulateAgcli("{}");
    delete process.env.AGCLI_PASSWORD;
    const opId = createTestOp();

    const result = await client.callTool({
      name: "tao_confirm",
      arguments: { operation_id: opId },
    });
    const data = parse(result);
    expect(data.error).toContain("password not configured");
  });

  it("does not include password in response", async () => {
    simulateAgcli('{"success":true}');
    process.env.AGCLI_PASSWORD = "supersecret";
    const opId = createTestOp();

    const result = await client.callTool({
      name: "tao_confirm",
      arguments: { operation_id: opId },
    });
    const raw = (result.content as Array<{ text: string }>)[0].text;
    expect(raw).not.toContain("supersecret");
  });

  it("consumes operation after execution", async () => {
    simulateAgcli('{"success":true}');
    process.env.AGCLI_PASSWORD = "testpass";
    const opId = createTestOp();

    await client.callTool({
      name: "tao_confirm",
      arguments: { operation_id: opId },
    });

    _resetCacheForTesting();
    simulateAgcli("{}");
    const result2 = await client.callTool({
      name: "tao_confirm",
      arguments: { operation_id: opId },
    });
    const data2 = parse(result2);
    expect(data2.error).toContain("not found");
  });
});
