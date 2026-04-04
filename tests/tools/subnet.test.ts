import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { registerSubnetTools } from "../../src/tools/subnet.js";

vi.mock("../../src/backends/taoswap.js", () => {
  const mockClient = {
    getSubnets: vi.fn(),
    getSubnet: vi.fn(),
    getSubnetHistory: vi.fn(),
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
    TaoSwapNotFoundError: class extends MockTaoSwapApiError {
      constructor(message: string) {
        super(message, 404);
        this.name = "TaoSwapNotFoundError";
      }
    },
    TaoSwapRateLimitError: class extends MockTaoSwapApiError {
      constructor() {
        super("TaoSwap API rate limit reached. Try again in a few seconds.", 429);
        this.name = "TaoSwapRateLimitError";
      }
    },
    TaoSwapUnavailableError: class extends MockTaoSwapApiError {
      constructor(message: string) {
        super(message, 503);
        this.name = "TaoSwapUnavailableError";
      }
    },
  };
});

import { taoswap } from "../../src/backends/taoswap.js";

const mockTaoswap = taoswap as unknown as {
  getSubnets: ReturnType<typeof vi.fn>;
  getSubnet: ReturnType<typeof vi.fn>;
  getSubnetHistory: ReturnType<typeof vi.fn>;
};

async function setupServer() {
  const server = new McpServer({ name: "test", version: "0.0.0" });
  registerSubnetTools(server);
  const client = new Client({ name: "test-client", version: "0.0.0" });
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  await Promise.all([
    server.connect(serverTransport),
    client.connect(clientTransport),
  ]);
  return { server, client };
}

function parseResult(result: { content: unknown }) {
  const content = result.content as Array<{ type: string; text: string }>;
  return JSON.parse(content[0].text);
}

describe("tao_subnet_list", () => {
  let client: Client;
  let server: McpServer;

  beforeEach(async () => {
    vi.clearAllMocks();
    const setup = await setupServer();
    client = setup.client;
    server = setup.server;
  });

  afterEach(async () => {
    await client.close();
    await server.close();
  });

  it("returns formatted subnet list", async () => {
    mockTaoswap.getSubnets.mockResolvedValueOnce([
      {
        id: 1,
        name: "Apex",
        symbol: "a",
        price: 0.012489,
        price_evolution_h_24: -4.07,
        price_evolution_d_7: -0.13,
        market_cap: 59239,
        emission_percent: 1.25,
        emission_ema_percent: 1.7,
        root_in_pool: 31203,
        active_miners: 2,
        holders_count: 0,
        registration_cost: 0.001383,
      },
    ]);

    const result = await client.callTool({ name: "tao_subnet_list" });
    const data = parseResult(result);
    expect(Array.isArray(data)).toBe(true);
    expect(data[0].netuid).toBe(1);
    expect(data[0].alpha_price_tao).toBe("0.01249");
  });

  it("returns error on API failure", async () => {
    const { TaoSwapUnavailableError } = await import(
      "../../src/backends/taoswap.js"
    );
    mockTaoswap.getSubnets.mockRejectedValueOnce(
      new TaoSwapUnavailableError("TaoSwap API returned 500. The service may be temporarily down."),
    );

    const result = await client.callTool({ name: "tao_subnet_list" });
    const data = parseResult(result);
    expect(data.error).toContain("500");
  });
});

describe("tao_subnet_info", () => {
  let client: Client;
  let server: McpServer;

  beforeEach(async () => {
    vi.clearAllMocks();
    const setup = await setupServer();
    client = setup.client;
    server = setup.server;
  });

  afterEach(async () => {
    await client.close();
    await server.close();
  });

  it("returns detailed subnet info", async () => {
    mockTaoswap.getSubnet.mockResolvedValueOnce({
      id: 18,
      name: "Zeus",
      symbol: "s",
      owner: "5DHwW...",
      identity: {
        name: "Zeus",
        url: "https://zeussubnet.com",
        github: "https://github.com/zeus",
        discord: "zeus_discord",
        description: "Weather forecasts",
      },
      price: 0.008145,
      moving_price: 0.008095,
      price_evolution_h_1: -0.97,
      price_evolution_h_24: 0.67,
      price_evolution_d_7: 16.09,
      price_evolution_d_30: 17.14,
      price_evolution_d_90: 6.32,
      market_cap: 36118,
      total_supply: 4461333,
      emission_percent: 0.81,
      emission_ema_percent: 0.98,
      emission_chain_buys: 5.95,
      emission_chain_buys_percent: 0.44,
      emission_miner_burn: 95.0,
      tao_in_emission: 0.008145,
      alpha_in_emission: 1.0,
      alpha_out_emission: 2.0,
      inflow: 0.002492,
      outflow: 0.0,
      root_in_pool: 13556,
      alpha_in_pool: 1664096,
      alpha_stake: 2797237,
      active_miners: 8,
      holders_count: 0,
      tempo: 360,
      registration_cost: 0.999999,
      hyperparameters: {
        registration_allowed: true,
        max_validators: 64,
        max_n: 257,
      },
      neurons: new Array(257),
    });

    const result = await client.callTool({
      name: "tao_subnet_info",
      arguments: { netuid: 18 },
    });
    const data = parseResult(result);
    expect(data.netuid).toBe(18);
    expect(data.name).toBe("Zeus");
    expect(data.links.intotao).toContain("18-zeus");
    expect(data.alpha_price_tao).toBe("0.00814");
  });

  it("returns error for unknown subnet", async () => {
    const { TaoSwapNotFoundError } = await import(
      "../../src/backends/taoswap.js"
    );
    mockTaoswap.getSubnet.mockRejectedValueOnce(
      new TaoSwapNotFoundError(
        "Resource not found on TaoSwap. Check that the subnet ID is valid.",
      ),
    );

    const result = await client.callTool({
      name: "tao_subnet_info",
      arguments: { netuid: 99999 },
    });
    const data = parseResult(result);
    expect(data.error).toContain("not found");
  });

  it("returns error with guidance on unexpected failures", async () => {
    mockTaoswap.getSubnet.mockRejectedValueOnce(new TypeError("oops"));

    const result = await client.callTool({
      name: "tao_subnet_info",
      arguments: { netuid: 18 },
    });
    const data = parseResult(result);
    expect(data.error).toContain("Try again");
  });
});

describe("tao_subnet_history", () => {
  let client: Client;
  let server: McpServer;

  beforeEach(async () => {
    vi.clearAllMocks();
    const setup = await setupServer();
    client = setup.client;
    server = setup.server;
  });

  afterEach(async () => {
    await client.close();
    await server.close();
  });

  it("returns history with default days", async () => {
    mockTaoswap.getSubnetHistory.mockResolvedValueOnce({
      netuid: 18,
      count: 2,
      results: [
        { date: "2026-03-05", active_miners: 246 },
        { date: "2026-03-06", active_miners: 240 },
      ],
    });

    const result = await client.callTool({
      name: "tao_subnet_history",
      arguments: { netuid: 18 },
    });
    const data = parseResult(result);
    expect(data.netuid).toBe(18);
    expect(data.days_requested).toBe(30);
    expect(data.history).toHaveLength(2);
  });

  it("passes custom days parameter", async () => {
    mockTaoswap.getSubnetHistory.mockResolvedValueOnce({
      netuid: 1,
      count: 0,
      results: [],
    });

    await client.callTool({
      name: "tao_subnet_history",
      arguments: { netuid: 1, days: 7 },
    });
    expect(mockTaoswap.getSubnetHistory).toHaveBeenCalledWith(1, 7);
  });
});
