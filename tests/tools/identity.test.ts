import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { registerIdentityTools } from "../../src/tools/identity.js";

vi.mock("../../src/backends/taoswap.js", () => {
  const mockClient = { getIdentities: vi.fn() };

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
  getIdentities: ReturnType<typeof vi.fn>;
};

async function setup() {
  const server = new McpServer({ name: "test", version: "0.0.0" });
  registerIdentityTools(server);
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

const identitiesData = {
  results: {
    "5Abc": {
      ss58_address: "5Abc",
      name: "TestValidator",
      image: "",
      url: "https://test.com",
      github: "test",
      discord: "test",
    },
    "5Def": {
      ss58_address: "5Def",
      name: "-",
      image: "-",
      url: "-",
      github: "-",
      discord: "-",
    },
  },
  access_map: { "5Hot": "5Abc" },
};

describe("tao_identity", () => {
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

  it("lists all identities when no address", async () => {
    mock.getIdentities.mockResolvedValueOnce(identitiesData);
    const result = await client.callTool({
      name: "tao_identity",
      arguments: {},
    });
    const data = parse(result);
    expect(data.count).toBe(1);
    expect(data.identities[0].name).toBe("TestValidator");
  });

  it("looks up identity by address", async () => {
    mock.getIdentities.mockResolvedValueOnce(identitiesData);
    const result = await client.callTool({
      name: "tao_identity",
      arguments: { address: "5Abc" },
    });
    const data = parse(result);
    expect(data.name).toBe("TestValidator");
  });

  it("resolves hotkey via access_map", async () => {
    mock.getIdentities.mockResolvedValueOnce(identitiesData);
    const result = await client.callTool({
      name: "tao_identity",
      arguments: { address: "5Hot" },
    });
    const data = parse(result);
    expect(data.name).toBe("TestValidator");
  });

  it("returns error for address with no identity", async () => {
    mock.getIdentities.mockResolvedValueOnce(identitiesData);
    const result = await client.callTool({
      name: "tao_identity",
      arguments: { address: "5Unknown" },
    });
    const data = parse(result);
    expect(data.error).toContain("No on-chain identity");
  });
});
