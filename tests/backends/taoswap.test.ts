import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  TaoSwapClient,
  TaoSwapNotFoundError,
  TaoSwapRateLimitError,
  TaoSwapUnavailableError,
  TaoSwapApiError,
} from "../../src/backends/taoswap.js";

function mockResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    headers: new Headers(),
  } as Response;
}

describe("TaoSwapClient", () => {
  let client: TaoSwapClient;
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    client = new TaoSwapClient();
    fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const subnetListBody = {
    results: [
      { id: 1, name: "Apex", price: 0.012, holders_count: 100 },
    ],
  };

  const subnetDetailBody = {
    id: 18,
    name: "Zeus",
    price: 0.008,
    hyperparameters: { tempo: 360 },
    neurons: [],
  };

  const historyBody = {
    netuid: 18,
    count: 1,
    results: [
      { date: "2026-03-05", active_miners: 246, holders_count: 1593 },
    ],
  };

  it("fetches subnet list", async () => {
    fetchSpy.mockResolvedValueOnce(mockResponse(subnetListBody));
    const subnets = await client.getSubnets();
    expect(subnets).toHaveLength(1);
    expect(subnets[0].name).toBe("Apex");
  });

  it("fetches subnet detail", async () => {
    fetchSpy.mockResolvedValueOnce(mockResponse(subnetDetailBody));
    const subnet = await client.getSubnet(18);
    expect(subnet.id).toBe(18);
    expect(subnet.name).toBe("Zeus");
  });

  it("fetches subnet history", async () => {
    fetchSpy.mockResolvedValueOnce(mockResponse(historyBody));
    const history = await client.getSubnetHistory(18, 7);
    expect(history.netuid).toBe(18);
    expect(history.results).toHaveLength(1);
  });

  it("throws TaoSwapNotFoundError on 404", async () => {
    fetchSpy.mockResolvedValueOnce(mockResponse({ error: true }, 404));
    await expect(client.getSubnet(99999)).rejects.toThrow(
      TaoSwapNotFoundError,
    );
  });

  it("retries once on 429 then throws if still 429", async () => {
    fetchSpy.mockResolvedValue(mockResponse({}, 429));
    await expect(client.getSubnets()).rejects.toThrow(TaoSwapRateLimitError);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("succeeds on retry after 429", async () => {
    fetchSpy
      .mockResolvedValueOnce(mockResponse({}, 429))
      .mockResolvedValueOnce(mockResponse(subnetListBody));
    const subnets = await client.getSubnets();
    expect(subnets).toHaveLength(1);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("throws TaoSwapUnavailableError on 500", async () => {
    fetchSpy.mockResolvedValueOnce(mockResponse({}, 500));
    await expect(client.getSubnets()).rejects.toThrow(
      TaoSwapUnavailableError,
    );
  });

  it("throws TaoSwapUnavailableError on network error", async () => {
    fetchSpy.mockRejectedValueOnce(new Error("ECONNREFUSED"));
    await expect(client.getSubnets()).rejects.toThrow(
      TaoSwapUnavailableError,
    );
  });

  it("throws TaoSwapApiError on malformed JSON", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError("Unexpected token");
      },
      headers: new Headers(),
    } as Response);
    await expect(client.getSubnets()).rejects.toThrow(TaoSwapApiError);
  });

  it("returns cached data on second call within TTL", async () => {
    fetchSpy.mockResolvedValueOnce(mockResponse(subnetListBody));
    await client.getSubnets();
    await client.getSubnets();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("re-fetches after cache expiry", async () => {
    vi.useFakeTimers();
    fetchSpy.mockResolvedValue(mockResponse(subnetListBody));

    await client.getSubnets();
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(61_000);
    await client.getSubnets();
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });
});
