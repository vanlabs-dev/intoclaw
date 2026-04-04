import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { registerLearnTools } from "../../src/tools/learn.js";

vi.mock("../../src/backends/taoswap.js", () => {
  const mockClient = { getSubnet: vi.fn() };

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
  getSubnet: ReturnType<typeof vi.fn>;
};

async function setup() {
  const server = new McpServer({ name: "test", version: "0.0.0" });
  registerLearnTools(server);
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

describe("tao_learn", () => {
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

  it("returns subnet links with correct slug", async () => {
    mock.getSubnet.mockResolvedValueOnce({ id: 18, name: "Zeus" });
    const result = await client.callTool({
      name: "tao_learn",
      arguments: { netuid: 18 },
    });
    const data = parse(result);
    expect(data.subnet_name).toBe("Zeus");
    expect(data.links[0].url).toBe(
      "https://intotao.app/subnets/18-zeus",
    );
    expect(data.links[1].url).toBe("https://taoswap.org");
  });

  it("returns error for unknown subnet", async () => {
    const { TaoSwapNotFoundError } = await import(
      "../../src/backends/taoswap.js"
    );
    mock.getSubnet.mockRejectedValueOnce(
      new TaoSwapNotFoundError(
        "Resource not found on TaoSwap. Check that the subnet ID is valid.",
      ),
    );
    const result = await client.callTool({
      name: "tao_learn",
      arguments: { netuid: 99999 },
    });
    const data = parse(result);
    expect(data.error).toContain("not found");
  });

  it("returns staking ground-truth for topic", async () => {
    const result = await client.callTool({
      name: "tao_learn",
      arguments: { topic: "staking" },
    });
    const data = parse(result);
    expect(data.context).toContain("Staking TAO converts TAO to alpha");
    expect(data.links[0].url).toBe("https://intotao.app/learn");
  });

  it("returns emissions ground-truth for topic", async () => {
    const result = await client.callTool({
      name: "tao_learn",
      arguments: { topic: "emissions" },
    });
    const data = parse(result);
    expect(data.context).toContain("ALPHA token");
  });

  it("returns dTAO ground-truth for topic", async () => {
    const result = await client.callTool({
      name: "tao_learn",
      arguments: { topic: "dTAO" },
    });
    const data = parse(result);
    expect(data.context).toContain("Dynamic TAO");
  });

  it("returns general resources when no params", async () => {
    const result = await client.callTool({
      name: "tao_learn",
      arguments: {},
    });
    const data = parse(result);
    expect(data.links).toHaveLength(2);
    expect(data.links[0].url).toBe("https://intotao.app/learn");
    expect(data.links[1].url).toBe("https://taoswap.org");
    expect(data.context).toContain("IntoTAO");
  });

  it("loads non-empty ground-truth content", async () => {
    const result = await client.callTool({
      name: "tao_learn",
      arguments: { topic: "validators" },
    });
    const data = parse(result);
    expect(data.context.length).toBeGreaterThan(50);
    expect(data.context).toContain("Validators");
  });
});
