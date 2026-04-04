import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { registerSwapTools } from "../../src/tools/swap.js";

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
  registerSwapTools(server);
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

describe("tao_swap_simulate", () => {
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

  it("simulates TAO-to-alpha swap", async () => {
    simulateAgcli(
      '{"alpha_fee":0,"amount_in":10,"amount_out":1230.15,"current_price":0.00812,"direction":"tao_to_alpha","effective_price":0.00813,"netuid":18,"tao_fee":0.005}',
    );
    const result = await client.callTool({
      name: "tao_swap_simulate",
      arguments: { netuid: 18, tao: 10 },
    });
    const data = parse(result);
    expect(data.direction).toBe("tao_to_alpha");
    expect(data.estimated_amount_out).toBe(1230.15);
    expect(data.note).toContain("estimates");
  });

  it("simulates alpha-to-TAO swap", async () => {
    simulateAgcli(
      '{"alpha_fee":0,"amount_in":500,"amount_out":4.05,"current_price":0.00812,"direction":"alpha_to_tao","effective_price":0.0081,"netuid":18,"tao_fee":0}',
    );
    const result = await client.callTool({
      name: "tao_swap_simulate",
      arguments: { netuid: 18, alpha: 500 },
    });
    const data = parse(result);
    expect(data.direction).toBe("alpha_to_tao");
    expect(data.estimated_amount_out).toBe(4.05);
  });

  it("rejects both tao and alpha", async () => {
    const result = await client.callTool({
      name: "tao_swap_simulate",
      arguments: { netuid: 18, tao: 10, alpha: 500 },
    });
    const data = parse(result);
    expect(data.error).toContain("not both");
  });

  it("rejects neither tao nor alpha", async () => {
    const result = await client.callTool({
      name: "tao_swap_simulate",
      arguments: { netuid: 18 },
    });
    const data = parse(result);
    expect(data.error).toContain("tao or alpha");
  });

  it("response contains estimated language", async () => {
    simulateAgcli(
      '{"alpha_fee":0,"amount_in":10,"amount_out":1230,"current_price":0.008,"direction":"tao_to_alpha","effective_price":0.008,"netuid":18,"tao_fee":0.005}',
    );
    const result = await client.callTool({
      name: "tao_swap_simulate",
      arguments: { netuid: 18, tao: 10 },
    });
    const raw = (result.content as Array<{ text: string }>)[0].text;
    expect(raw).toContain("estimated");
  });

  it("returns error when agcli not installed", async () => {
    mockExecFile.mockImplementation(
      (_b: string, _a: string[], _o: unknown, cb: ExecCb) => {
        cb({ code: "ENOENT" }, "", "");
        return { stdin: { end: vi.fn() } };
      },
    );
    const result = await client.callTool({
      name: "tao_swap_simulate",
      arguments: { netuid: 18, tao: 10 },
    });
    const data = parse(result);
    expect(data.error).toContain("not installed");
  });
});
