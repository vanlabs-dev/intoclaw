import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { registerStakeTools } from "../../src/tools/stake.js";

vi.mock("../../src/backends/agcli.js", () => {
  class MockAgcliNotInstalledError extends Error {
    constructor() {
      super("agcli is not installed or not in PATH. Install it to use chain commands.");
      this.name = "AgcliNotInstalledError";
    }
  }
  return {
    listStakes: vi.fn(),
    AgcliNotInstalledError: MockAgcliNotInstalledError,
    AgcliExecutionError: class extends Error {
      exitCode: number;
      constructor(message: string, exitCode: number) {
        super(message);
        this.exitCode = exitCode;
        this.name = "AgcliExecutionError";
      }
    },
  };
});

import { listStakes } from "../../src/backends/agcli.js";
const mock = { listStakes: listStakes as ReturnType<typeof vi.fn> };

async function setup() {
  const server = new McpServer({ name: "test", version: "0.0.0" });
  registerStakeTools(server);
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

describe("tao_stake_list", () => {
  let client: Client;
  let server: McpServer;

  beforeEach(async () => {
    vi.clearAllMocks();
    const s = await setup();
    client = s.client;
    server = s.server;
  });

  afterEach(async () => {
    await client.close();
    await server.close();
  });

  it("returns stake positions", async () => {
    mock.listStakes.mockResolvedValueOnce([
      {
        hotkey: "5E2L",
        coldkey: "5Gsb",
        netuid: 0,
        stake: { rao: 1875072702578 },
        alpha_stake: { raw: 1875072702578 },
      },
    ]);
    const result = await client.callTool({
      name: "tao_stake_list",
      arguments: { address: "5Gsb" },
    });
    const data = parse(result);
    expect(data.positions).toBe(1);
    expect(data.stakes[0].netuid).toBe(0);
    expect(data.stakes[0].estimated_stake_tao).toBeCloseTo(1875.07, 1);
  });

  it("returns error when agcli not installed", async () => {
    const { AgcliNotInstalledError } = await import(
      "../../src/backends/agcli.js"
    );
    mock.listStakes.mockRejectedValueOnce(new AgcliNotInstalledError());
    const result = await client.callTool({
      name: "tao_stake_list",
      arguments: { address: "5Gsb" },
    });
    const data = parse(result);
    expect(data.error).toContain("not installed");
  });
});
