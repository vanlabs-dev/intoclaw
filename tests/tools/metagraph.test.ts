import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { registerMetagraphTools } from "../../src/tools/metagraph.js";

vi.mock("../../src/backends/taoswap.js", () => {
  const mockClient = {
    getMetagraph: vi.fn(),
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
  getMetagraph: ReturnType<typeof vi.fn>;
};

async function setupServer() {
  const server = new McpServer({ name: "test", version: "0.0.0" });
  registerMetagraphTools(server);
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

describe("tao_metagraph", () => {
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

  it("returns formatted metagraph", async () => {
    mockTaoswap.getMetagraph.mockResolvedValueOnce({
      subnet: { id: 18, name: "Zeus", symbol: "s", price: 0.008 },
      count: 2,
      neurons: [
        {
          uid: 0,
          hotkey: "5Hx",
          coldkey: "5Cx",
          type: "miner",
          status: "ACTIVE",
          stake: 0,
          vtrust: 0,
          consensus: 0,
          incentive: 0.5,
          dividends: 0,
          emission: 0.01,
          daily_rewards: 1.2,
          is_validator: false,
          delegate_take: 0,
          updated_at_block: 100,
        },
        {
          uid: 1,
          hotkey: "5Vy",
          coldkey: "5Dy",
          type: "validator",
          status: "ACTIVE",
          stake: 5000,
          vtrust: 0.99,
          consensus: 0.8,
          incentive: 0,
          dividends: 0.5,
          emission: 0.02,
          daily_rewards: 3.4,
          is_validator: true,
          delegate_take: 0.18,
          updated_at_block: 101,
        },
      ],
    });

    const result = await client.callTool({
      name: "tao_metagraph",
      arguments: { netuid: 18 },
    });
    const data = parseResult(result);
    expect(data.netuid).toBe(18);
    expect(data.subnet_name).toBe("Zeus");
    expect(data.neuron_count).toBe(2);
    expect(data.neurons).toHaveLength(2);
    expect(data.neurons[0].uid).toBe(0);
    expect(data.neurons[1].is_validator).toBe(true);
  });

  it("returns error for unknown subnet", async () => {
    const { TaoSwapNotFoundError } = await import(
      "../../src/backends/taoswap.js"
    );
    mockTaoswap.getMetagraph.mockRejectedValueOnce(
      new TaoSwapNotFoundError(
        "Resource not found on TaoSwap. Check that the subnet ID is valid.",
      ),
    );

    const result = await client.callTool({
      name: "tao_metagraph",
      arguments: { netuid: 99999 },
    });
    const data = parseResult(result);
    expect(data.error).toContain("not found");
  });

  it("returns error with guidance on unexpected failure", async () => {
    mockTaoswap.getMetagraph.mockRejectedValueOnce(new TypeError("oops"));

    const result = await client.callTool({
      name: "tao_metagraph",
      arguments: { netuid: 1 },
    });
    const data = parseResult(result);
    expect(data.error).toContain("Try again");
  });
});
