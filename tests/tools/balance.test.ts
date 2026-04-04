import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { registerBalanceTools } from "../../src/tools/balance.js";

vi.mock("../../src/backends/agcli.js", () => {
  class MockAgcliNotInstalledError extends Error {
    constructor() {
      super("agcli is not installed or not in PATH. Install it to use chain commands.");
      this.name = "AgcliNotInstalledError";
    }
  }
  class MockAgcliExecutionError extends Error {
    exitCode: number;
    constructor(message: string, exitCode: number) {
      super(message);
      this.exitCode = exitCode;
      this.name = "AgcliExecutionError";
    }
  }
  return {
    getBalance: vi.fn(),
    AgcliNotInstalledError: MockAgcliNotInstalledError,
    AgcliExecutionError: MockAgcliExecutionError,
  };
});

import { getBalance } from "../../src/backends/agcli.js";
const mock = { getBalance: getBalance as ReturnType<typeof vi.fn> };

async function setup() {
  const server = new McpServer({ name: "test", version: "0.0.0" });
  registerBalanceTools(server);
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

describe("tao_balance", () => {
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

  it("returns balance for valid address", async () => {
    mock.getBalance.mockResolvedValueOnce({
      address: "5Gsb",
      balance_rao: 1766331327,
      balance_tao: 1.766331327,
    });
    const result = await client.callTool({
      name: "tao_balance",
      arguments: { address: "5Gsb" },
    });
    const data = parse(result);
    expect(data.balance_tao).toBeCloseTo(1.766);
  });

  it("returns error when agcli not installed", async () => {
    const { AgcliNotInstalledError } = await import(
      "../../src/backends/agcli.js"
    );
    mock.getBalance.mockRejectedValueOnce(new AgcliNotInstalledError());
    const result = await client.callTool({
      name: "tao_balance",
      arguments: { address: "5Gsb" },
    });
    const data = parse(result);
    expect(data.error).toContain("not installed");
  });

  it("returns error when no address provided", async () => {
    const result = await client.callTool({
      name: "tao_balance",
      arguments: {},
    });
    const data = parse(result);
    expect(data.error).toContain("No address");
  });
});
