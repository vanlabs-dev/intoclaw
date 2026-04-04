import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { registerEventTools } from "../../src/tools/events.js";

vi.mock("../../src/backends/taoswap.js", () => {
  const mockClient = {
    getEvents: vi.fn(),
    getExtrinsics: vi.fn(),
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
  getEvents: ReturnType<typeof vi.fn>;
  getExtrinsics: ReturnType<typeof vi.fn>;
};

async function setup() {
  const server = new McpServer({ name: "test", version: "0.0.0" });
  registerEventTools(server);
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

const pagination = { page: 1, page_size: 25, has_next: false, has_previous: false };

describe("tao_events", () => {
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

  it("returns events for a block", async () => {
    mock.getEvents.mockResolvedValueOnce({
      results: [
        { block: 7531566, idx: 0, section: "SubtensorModule", method: "RootClaimed", data: "{}" },
      ],
      pagination,
    });
    const result = await client.callTool({
      name: "tao_events",
      arguments: { block: 7531566 },
    });
    const data = parse(result);
    expect(data.count).toBe(1);
    expect(data.events[0].section).toBe("SubtensorModule");
  });

  it("passes section and method filters", async () => {
    mock.getEvents.mockResolvedValueOnce({ results: [], pagination });
    await client.callTool({
      name: "tao_events",
      arguments: { section: "SubtensorModule", method: "StakeAdded" },
    });
    expect(mock.getEvents).toHaveBeenCalledWith({
      block: undefined,
      section: "SubtensorModule",
      method: "StakeAdded",
      from_block: undefined,
      to_block: undefined,
    });
  });

  it("returns error on failure", async () => {
    mock.getEvents.mockRejectedValueOnce(new TypeError("fail"));
    const result = await client.callTool({
      name: "tao_events",
      arguments: {},
    });
    const data = parse(result);
    expect(data.error).toContain("Try again");
  });
});

describe("tao_extrinsics", () => {
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

  it("returns extrinsics with category filter", async () => {
    mock.getExtrinsics.mockResolvedValueOnce({
      results: [
        { block: 100, idx: 1, module: "SubtensorModule", call: "add_stake", category: "staking", signer: "5Abc", success: true },
      ],
      pagination: { ...pagination, total_count: 1, total_pages: 1 },
    });
    const result = await client.callTool({
      name: "tao_extrinsics",
      arguments: { category: "staking" },
    });
    const data = parse(result);
    expect(data.count).toBe(1);
    expect(data.extrinsics[0].category).toBe("staking");
  });

  it("passes signer filter", async () => {
    mock.getExtrinsics.mockResolvedValueOnce({ results: [], pagination });
    await client.callTool({
      name: "tao_extrinsics",
      arguments: { signer: "5Abc" },
    });
    expect(mock.getExtrinsics).toHaveBeenCalledWith(
      expect.objectContaining({ signer: "5Abc" }),
    );
  });
});
