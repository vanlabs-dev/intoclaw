import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { registerNetworkTools } from "../../src/tools/network.js";

vi.mock("../../src/backends/taoswap.js", () => {
  const mockClient = {
    getHomeStats: vi.fn(),
    getHalving: vi.fn(),
  };

  class MockTaoSwapApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
      this.name = "TaoSwapApiError";
    }
  }

  return {
    taoswap: mockClient,
    TaoSwapApiError: MockTaoSwapApiError,
  };
});

import { taoswap } from "../../src/backends/taoswap.js";

const mock = taoswap as unknown as {
  getHomeStats: ReturnType<typeof vi.fn>;
  getHalving: ReturnType<typeof vi.fn>;
};

const sampleStats = {
  apy_root: 10.58,
  apy_best_subnet: 308.85,
  best_subnet_name: "SN99 - Leoma",
  count_delegators: 413,
  dominance: 0.244,
  fees: 6.0,
  total_stake_alpha: 11056.77,
  total_stake_root: 7937.04,
  total_stake: 18993.8,
};

const sampleHalving = {
  id: 1,
  at_issuance: 10799831.02,
  at_block: 0,
  time_remaining: "2026-04-04T03:40:03Z",
};

async function setupServer() {
  const server = new McpServer({ name: "test", version: "0.0.0" });
  registerNetworkTools(server);
  const client = new Client({ name: "test-client", version: "0.0.0" });
  const [ct, st] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(st), client.connect(ct)]);
  return { server, client };
}

function parseResult(result: { content: unknown }) {
  const content = result.content as Array<{ type: string; text: string }>;
  return JSON.parse(content[0].text);
}

describe("tao_network_stats", () => {
  let client: Client;
  let server: McpServer;

  beforeEach(async () => {
    vi.clearAllMocks();
    const s = await setupServer();
    client = s.client;
    server = s.server;
  });

  afterEach(async () => {
    await client.close();
    await server.close();
  });

  it("returns combined stats and halving data", async () => {
    mock.getHomeStats.mockResolvedValueOnce(sampleStats);
    mock.getHalving.mockResolvedValueOnce(sampleHalving);

    const result = await client.callTool({ name: "tao_network_stats" });
    const data = parseResult(result);
    expect(data.taoswap_platform_stake).toBeUndefined();
    expect(data.apy_root_pct).toBe(10.58);
    expect(data.best_subnet).toBe("SN99 - Leoma");
    expect(data.halving.last_halving).toBe("December 5, 2025");
    expect(data.halving.next_halving).toContain("2029");
    expect(data.halving.total_issuance).toBe(10799831.02);
    expect(data.warnings).toBeUndefined();
  });

  it("returns ground-truth halving when halving API fails", async () => {
    mock.getHomeStats.mockResolvedValueOnce(sampleStats);
    mock.getHalving.mockRejectedValueOnce(new Error("timeout"));

    const result = await client.callTool({ name: "tao_network_stats" });
    const data = parseResult(result);
    expect(data.apy_root_pct).toBe(10.58);
    expect(data.halving.last_halving).toBe("December 5, 2025");
    expect(data.halving.total_issuance).toBeNull();
    expect(data.warnings).toHaveLength(1);
  });

  it("returns halving data when stats fails", async () => {
    mock.getHomeStats.mockRejectedValueOnce(new Error("timeout"));
    mock.getHalving.mockResolvedValueOnce(sampleHalving);

    const result = await client.callTool({ name: "tao_network_stats" });
    const data = parseResult(result);
    expect(data.apy_root_pct).toBeUndefined();
    expect(data.halving.last_halving).toBe("December 5, 2025");
    expect(data.halving.total_issuance).toBe(10799831.02);
    expect(data.warnings).toHaveLength(1);
  });

  it("returns ground-truth halving when both APIs fail", async () => {
    mock.getHomeStats.mockRejectedValueOnce(new Error("down"));
    mock.getHalving.mockRejectedValueOnce(new Error("down"));

    const result = await client.callTool({ name: "tao_network_stats" });
    const data = parseResult(result);
    expect(data.halving.last_halving).toBe("December 5, 2025");
    expect(data.halving.total_issuance).toBeNull();
    expect(data.warnings).toHaveLength(2);
  });
});
