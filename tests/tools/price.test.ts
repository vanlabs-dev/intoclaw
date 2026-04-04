import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { registerPriceTools } from "../../src/tools/price.js";

vi.mock("../../src/backends/taoswap.js", () => {
  const mockClient = {
    getPriceHistory: vi.fn(),
    getSubnetPriceHistory: vi.fn(),
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
  };
});

import { taoswap } from "../../src/backends/taoswap.js";

const mock = taoswap as unknown as {
  getPriceHistory: ReturnType<typeof vi.fn>;
  getSubnetPriceHistory: ReturnType<typeof vi.fn>;
};

async function setupServer() {
  const server = new McpServer({ name: "test", version: "0.0.0" });
  registerPriceTools(server);
  const client = new Client({ name: "test-client", version: "0.0.0" });
  const [ct, st] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(st), client.connect(ct)]);
  return { server, client };
}

function parseResult(result: { content: unknown }) {
  const content = result.content as Array<{ type: string; text: string }>;
  return JSON.parse(content[0].text);
}

describe("tao_price", () => {
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

  it("returns TAO price history when no netuid", async () => {
    mock.getPriceHistory.mockResolvedValueOnce({
      currency: "usd",
      results: [
        { date: "2026-04-01", price: 350.5, volume: 1000000 },
        { date: "2026-04-02", price: 355.0, volume: 1100000 },
      ],
    });

    const result = await client.callTool({
      name: "tao_price",
      arguments: {},
    });
    const data = parseResult(result);
    expect(data.currency).toBe("usd");
    expect(data.data_points).toBe(2);
    expect(data.prices[0].price_usd).toBe("350.50");
    expect(mock.getPriceHistory).toHaveBeenCalledWith("usd", 30);
  });

  it("returns subnet alpha candles when netuid provided", async () => {
    mock.getSubnetPriceHistory.mockResolvedValueOnce({
      netuid: 18,
      resolution: "D",
      count: 2,
      results: [
        { time: 1774742400, open: 0.007, high: 0.0072, low: 0.0069, close: 0.0071, volume: 0 },
        { time: 1774828800, open: 0.0071, high: 0.0075, low: 0.007, close: 0.0074, volume: 0.5 },
      ],
    });

    const result = await client.callTool({
      name: "tao_price",
      arguments: { netuid: 18 },
    });
    const data = parseResult(result);
    expect(data.netuid).toBe(18);
    expect(data.resolution).toBe("D");
    expect(data.candles).toHaveLength(2);
    expect(data.candles[0].open).toBe("0.00700");
    expect(data.candles[0].close).toBe("0.00710");
  });

  it("passes custom resolution and limit", async () => {
    mock.getSubnetPriceHistory.mockResolvedValueOnce({
      netuid: 1,
      resolution: "60",
      count: 0,
      results: [],
    });

    await client.callTool({
      name: "tao_price",
      arguments: { netuid: 1, resolution: "60", limit: 12 },
    });
    expect(mock.getSubnetPriceHistory).toHaveBeenCalledWith(
      1, "60", 12, undefined, undefined,
    );
  });

  it("returns error for unknown netuid", async () => {
    const { TaoSwapNotFoundError } = await import(
      "../../src/backends/taoswap.js"
    );
    mock.getSubnetPriceHistory.mockRejectedValueOnce(
      new TaoSwapNotFoundError(
        "Resource not found on TaoSwap. Check that the subnet ID is valid.",
      ),
    );

    const result = await client.callTool({
      name: "tao_price",
      arguments: { netuid: 99999 },
    });
    const data = parseResult(result);
    expect(data.error).toContain("not found");
  });

  it("returns guidance on unexpected error", async () => {
    mock.getPriceHistory.mockRejectedValueOnce(new TypeError("fail"));

    const result = await client.callTool({
      name: "tao_price",
      arguments: {},
    });
    const data = parseResult(result);
    expect(data.error).toContain("Try again");
  });
});
