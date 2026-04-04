import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  searchWeb,
  searchTwitter,
  isDesearchAvailable,
  DesearchNotConfiguredError,
  DesearchApiError,
  DesearchUnavailableError,
} from "../../src/backends/desearch.js";

function mockResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    headers: new Headers(),
  } as Response;
}

const webResponse = {
  search: [
    {
      title: "Bittensor News",
      link: "https://example.com/news",
      snippet: "Latest TAO updates",
    },
  ],
  miner_link_scores: { "https://example.com/news": "HIGH" },
  completion: "Summary of Bittensor news",
};

const twitterResponse = {
  tweets: [
    {
      id: "123",
      text: "TAO is great",
      url: "https://x.com/user/status/123",
      created_at: "2026-04-01T00:00:00.000Z",
      like_count: 10,
      retweet_count: 5,
      reply_count: 2,
      view_count: 1000,
      user: {
        username: "taouser",
        name: "TAO User",
        followers_count: 500,
        is_blue_verified: true,
      },
    },
  ],
  miner_link_scores: {},
  completion: "Summary of TAO tweets",
};

describe("DesearchClient", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;
  const originalEnv = process.env.DESEARCH_API_KEY;

  beforeEach(() => {
    fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    process.env.DESEARCH_API_KEY = "test-key-123";
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalEnv !== undefined) {
      process.env.DESEARCH_API_KEY = originalEnv;
    } else {
      delete process.env.DESEARCH_API_KEY;
    }
  });

  it("searchWeb returns parsed results", async () => {
    fetchSpy.mockResolvedValueOnce(mockResponse(webResponse));
    const result = await searchWeb("Bittensor news");
    expect(result.search).toHaveLength(1);
    expect(result.search[0].title).toBe("Bittensor News");
    expect(result.completion).toBe("Summary of Bittensor news");
    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, opts] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://api.desearch.ai/desearch/ai/search");
    expect(opts.method).toBe("POST");
    expect(opts.headers.Authorization).toBe("test-key-123");
    expect(opts.headers["User-Agent"]).toBe("intoclaw/1.0");
  });

  it("searchTwitter returns parsed results", async () => {
    fetchSpy.mockResolvedValueOnce(mockResponse(twitterResponse));
    const result = await searchTwitter("TAO");
    expect(result.tweets).toHaveLength(1);
    expect(result.tweets[0].user.username).toBe("taouser");
    expect(result.completion).toBe("Summary of TAO tweets");
  });

  it("throws DesearchNotConfiguredError when key not set", async () => {
    delete process.env.DESEARCH_API_KEY;
    await expect(searchWeb("test")).rejects.toThrow(
      DesearchNotConfiguredError,
    );
  });

  it("isDesearchAvailable returns false when key not set", () => {
    delete process.env.DESEARCH_API_KEY;
    expect(isDesearchAvailable()).toBe(false);
  });

  it("isDesearchAvailable returns true when key is set", () => {
    expect(isDesearchAvailable()).toBe(true);
  });

  it("throws DesearchApiError on 401", async () => {
    fetchSpy.mockResolvedValue(
      mockResponse({ detail: "Invalid API key" }, 401),
    );
    await expect(searchWeb("test")).rejects.toThrow(DesearchApiError);
    await expect(searchWeb("test")).rejects.toThrow(/invalid/i);
  });

  it("throws DesearchApiError on 403", async () => {
    fetchSpy.mockResolvedValue(
      mockResponse({ detail: "Forbidden" }, 403),
    );
    await expect(searchWeb("test")).rejects.toThrow(DesearchApiError);
    await expect(searchWeb("test")).rejects.toThrow(/forbidden/i);
  });

  it("throws DesearchUnavailableError on network error", async () => {
    fetchSpy.mockRejectedValue(new Error("ECONNREFUSED"));
    await expect(searchWeb("test")).rejects.toThrow(
      DesearchUnavailableError,
    );
    await expect(searchWeb("test")).rejects.toThrow(/network/i);
  });

  it("throws DesearchUnavailableError on timeout", async () => {
    fetchSpy.mockRejectedValueOnce(new Error("The operation was aborted"));
    await expect(searchWeb("test")).rejects.toThrow(
      DesearchUnavailableError,
    );
  });

  it("never logs the API key", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    fetchSpy.mockResolvedValueOnce(mockResponse(webResponse));
    await searchWeb("test");
    for (const call of errorSpy.mock.calls) {
      for (const arg of call) {
        expect(String(arg)).not.toContain("test-key-123");
      }
    }
  });

  it("sends correct body for web search", async () => {
    fetchSpy.mockResolvedValueOnce(mockResponse(webResponse));
    await searchWeb("query", "PAST_24_HOURS", 15);
    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body.tools).toEqual(["web"]);
    expect(body.date_filter).toBe("PAST_24_HOURS");
    expect(body.count).toBe("15");
    expect(body.streaming).toBe(false);
  });

  it("sends correct body for twitter search", async () => {
    fetchSpy.mockResolvedValueOnce(mockResponse(twitterResponse));
    await searchTwitter("query");
    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body.tools).toEqual(["twitter"]);
    expect(body.date_filter).toBe("PAST_WEEK");
    expect(body.count).toBe("10");
  });

  it("enforces minimum count of 10", async () => {
    fetchSpy.mockResolvedValueOnce(mockResponse(webResponse));
    await searchWeb("query", undefined, 5);
    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body.count).toBe("10");
  });
});
