import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { registerSearchTools } from "../../src/tools/search-chain.js";

vi.mock("../../src/backends/taoswap.js", () => {
  const mockClient = { search: vi.fn() };

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
  search: ReturnType<typeof vi.fn>;
};

async function setup() {
  const server = new McpServer({ name: "test", version: "0.0.0" });
  registerSearchTools(server);
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

describe("tao_search", () => {
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

  it("returns search results", async () => {
    mock.search.mockResolvedValueOnce({
      count: 1,
      results: [
        { type: "validator", ss58_address: "5Gsb", name: "tao.bot", total_stake: 1252063 },
      ],
    });
    const result = await client.callTool({
      name: "tao_search",
      arguments: { query: "tao.bot" },
    });
    const data = parse(result);
    expect(data.query).toBe("tao.bot");
    expect(data.count).toBe(1);
    expect(data.results[0].type).toBe("validator");
  });

  it("returns empty results", async () => {
    mock.search.mockResolvedValueOnce({ count: 0, results: [] });
    const result = await client.callTool({
      name: "tao_search",
      arguments: { query: "nonexistent12345" },
    });
    const data = parse(result);
    expect(data.count).toBe(0);
    expect(data.results).toHaveLength(0);
  });

  it("returns error on failure", async () => {
    mock.search.mockRejectedValueOnce(new TypeError("fail"));
    const result = await client.callTool({
      name: "tao_search",
      arguments: { query: "test" },
    });
    const data = parse(result);
    expect(data.error).toContain("Try again");
  });
});
