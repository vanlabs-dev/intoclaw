import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { registerWebSearchTools } from "../../src/tools/search-web.js";

const { mockSearchWeb, mockSearchTwitter, mockIsAvailable } = vi.hoisted(
  () => ({
    mockSearchWeb: vi.fn(),
    mockSearchTwitter: vi.fn(),
    mockIsAvailable: vi.fn(),
  }),
);

vi.mock("../../src/backends/desearch.js", async (importOriginal) => {
  const orig = await importOriginal<typeof import("../../src/backends/desearch.js")>();
  return {
    ...orig,
    searchWeb: mockSearchWeb,
    searchTwitter: mockSearchTwitter,
    isDesearchAvailable: mockIsAvailable,
  };
});

async function setup() {
  const server = new McpServer({ name: "test", version: "0.0.0" });
  registerWebSearchTools(server);
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

describe("tao_search_web", () => {
  let client: Client;
  let server: McpServer;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockIsAvailable.mockReturnValue(true);
    const s = await setup();
    client = s.client;
    server = s.server;
  });

  afterEach(async () => {
    await client.close();
    await server.close();
    vi.restoreAllMocks();
  });

  it("returns web search results", async () => {
    mockSearchWeb.mockResolvedValueOnce({
      search: [
        { title: "TAO News", link: "https://example.com", snippet: "Latest" },
      ],
      miner_link_scores: {},
      completion: "Summary here",
    });
    const result = await client.callTool({
      name: "tao_search_web",
      arguments: { query: "Bittensor news" },
    });
    const data = parse(result);
    expect(data.summary).toBe("Summary here");
    expect(data.results).toHaveLength(1);
    expect(data.results[0].title).toBe("TAO News");
    expect(data.results[0].url).toBe("https://example.com");
    expect(data.result_count).toBe(1);
  });

  it("returns setup message when not configured", async () => {
    mockIsAvailable.mockReturnValue(false);
    const result = await client.callTool({
      name: "tao_search_web",
      arguments: { query: "test" },
    });
    const data = parse(result);
    expect(data.error).toContain("DESEARCH_API_KEY");
    expect(data.error).toContain("desearch.ai");
    expect(result.isError).toBe(true);
  });

  it("handles API errors", async () => {
    const { DesearchApiError } = await import(
      "../../src/backends/desearch.js"
    );
    mockSearchWeb.mockRejectedValueOnce(
      new DesearchApiError("Rate limited", 429),
    );
    const result = await client.callTool({
      name: "tao_search_web",
      arguments: { query: "test" },
    });
    const data = parse(result);
    expect(data.error).toContain("Rate limited");
    expect(result.isError).toBe(true);
  });

  it("handles unexpected errors", async () => {
    mockSearchWeb.mockRejectedValueOnce(new Error("boom"));
    const result = await client.callTool({
      name: "tao_search_web",
      arguments: { query: "test" },
    });
    const data = parse(result);
    expect(data.error).toContain("unexpected");
    expect(result.isError).toBe(true);
  });
});

describe("tao_search_twitter", () => {
  let client: Client;
  let server: McpServer;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockIsAvailable.mockReturnValue(true);
    const s = await setup();
    client = s.client;
    server = s.server;
  });

  afterEach(async () => {
    await client.close();
    await server.close();
    vi.restoreAllMocks();
  });

  it("returns twitter search results", async () => {
    mockSearchTwitter.mockResolvedValueOnce({
      tweets: [
        {
          id: "1",
          text: "TAO to the moon",
          url: "https://x.com/user/status/1",
          created_at: "2026-04-01T00:00:00.000Z",
          like_count: 42,
          retweet_count: 10,
          reply_count: 3,
          view_count: 5000,
          user: {
            username: "taouser",
            name: "TAO Fan",
            followers_count: 1000,
            is_blue_verified: false,
          },
        },
      ],
      miner_link_scores: {},
      completion: "Twitter summary",
    });
    const result = await client.callTool({
      name: "tao_search_twitter",
      arguments: { query: "Bittensor" },
    });
    const data = parse(result);
    expect(data.summary).toBe("Twitter summary");
    expect(data.tweets).toHaveLength(1);
    expect(data.tweets[0].username).toBe("taouser");
    expect(data.tweets[0].likes).toBe(42);
    expect(data.tweets[0].views).toBe(5000);
    expect(data.result_count).toBe(1);
  });

  it("returns setup message when not configured", async () => {
    mockIsAvailable.mockReturnValue(false);
    const result = await client.callTool({
      name: "tao_search_twitter",
      arguments: { query: "test" },
    });
    const data = parse(result);
    expect(data.error).toContain("DESEARCH_API_KEY");
    expect(result.isError).toBe(true);
  });

  it("handles unavailable errors", async () => {
    const { DesearchUnavailableError } = await import(
      "../../src/backends/desearch.js"
    );
    mockSearchTwitter.mockRejectedValueOnce(
      new DesearchUnavailableError("Connection refused"),
    );
    const result = await client.callTool({
      name: "tao_search_twitter",
      arguments: { query: "test" },
    });
    const data = parse(result);
    expect(data.error).toContain("Connection refused");
    expect(result.isError).toBe(true);
  });

  it("handles unexpected errors", async () => {
    mockSearchTwitter.mockRejectedValueOnce(new Error("boom"));
    const result = await client.callTool({
      name: "tao_search_twitter",
      arguments: { query: "test" },
    });
    const data = parse(result);
    expect(data.error).toContain("unexpected");
    expect(result.isError).toBe(true);
  });
});
