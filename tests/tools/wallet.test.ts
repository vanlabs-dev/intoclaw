import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { registerWalletTools } from "../../src/tools/wallet.js";

vi.mock("../../src/backends/agcli.js", () => {
  class MockAgcliNotInstalledError extends Error {
    constructor() {
      super("agcli is not installed or not in PATH. Install it to use chain commands.");
      this.name = "AgcliNotInstalledError";
    }
  }
  return {
    listWallets: vi.fn(),
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

import { listWallets } from "../../src/backends/agcli.js";
const mock = { listWallets: listWallets as ReturnType<typeof vi.fn> };

async function setup() {
  const server = new McpServer({ name: "test", version: "0.0.0" });
  registerWalletTools(server);
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

describe("tao_wallet_list", () => {
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

  it("returns wallets", async () => {
    mock.listWallets.mockResolvedValueOnce([
      { name: "default", address: "5Gsb", path: "/home/.bittensor" },
    ]);
    const result = await client.callTool({ name: "tao_wallet_list" });
    const data = parse(result);
    expect(data.wallets).toHaveLength(1);
    expect(data.wallets[0].name).toBe("default");
  });

  it("returns message when no wallets", async () => {
    mock.listWallets.mockResolvedValueOnce([]);
    const result = await client.callTool({ name: "tao_wallet_list" });
    const data = parse(result);
    expect(data.wallets).toHaveLength(0);
    expect(data.message).toContain("No wallets found");
  });

  it("returns error when agcli not installed", async () => {
    const { AgcliNotInstalledError } = await import(
      "../../src/backends/agcli.js"
    );
    mock.listWallets.mockRejectedValueOnce(new AgcliNotInstalledError());
    const result = await client.callTool({ name: "tao_wallet_list" });
    const data = parse(result);
    expect(data.error).toContain("not installed");
  });
});
