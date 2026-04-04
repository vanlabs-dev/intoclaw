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

  const metagraphBody = {
    subnet: { id: 18, name: "Zeus", symbol: "s", price: 0.008 },
    count: 1,
    neurons: [{ uid: 0, hotkey: "5Hx", type: "miner", stake: 0 }],
  };

  it("fetches metagraph", async () => {
    fetchSpy.mockResolvedValueOnce(mockResponse(metagraphBody));
    const meta = await client.getMetagraph(18);
    expect(meta.subnet.id).toBe(18);
    expect(meta.neurons).toHaveLength(1);
  });

  it("throws TaoSwapNotFoundError on metagraph 404", async () => {
    fetchSpy.mockResolvedValueOnce(mockResponse({}, 404));
    await expect(client.getMetagraph(99999)).rejects.toThrow(
      TaoSwapNotFoundError,
    );
  });

  const validatorListBody = {
    results: [
      {
        validator_coldkey: "5Gsb",
        validator_hotkey: "5E2L",
        take: 0,
        apy_7d: 14.0,
        total_stake: "1252063",
        total_stake_root: "926712",
        total_stake_alpha: "325351",
        dominance: "16.1",
        count_delegators: 7204,
      },
    ],
  };

  it("fetches validator list", async () => {
    fetchSpy.mockResolvedValueOnce(mockResponse(validatorListBody));
    const validators = await client.getValidators();
    expect(validators).toHaveLength(1);
    expect(validators[0].validator_coldkey).toBe("5Gsb");
  });

  const validatorDetailBody = {
    validator_coldkey: "5Gsb",
    validator_hotkey: "5E2L",
    take: 0,
    apy_7d: 14.0,
    total_stake: "1252063",
    total_stake_root: "926712",
    total_stake_alpha: "325351",
    dominance: "16.1",
    count_delegators: 7204,
    delegator_daily_earning: 353.6,
    validator_daily_earning: 0,
    monitoring: [],
    stakes: [],
    history: [],
  };

  it("fetches validator detail", async () => {
    fetchSpy.mockResolvedValueOnce(mockResponse(validatorDetailBody));
    const detail = await client.getValidator("5Gsb");
    expect(detail.validator_coldkey).toBe("5Gsb");
    expect(detail.delegator_daily_earning).toBe(353.6);
  });

  it("throws TaoSwapNotFoundError on validator 404", async () => {
    fetchSpy.mockResolvedValueOnce(mockResponse({}, 404));
    await expect(client.getValidator("invalid")).rejects.toThrow(
      TaoSwapNotFoundError,
    );
  });

  const validatorHistoryBody = {
    hotkey: "5E2L",
    count: 1,
    results: [
      { date: "2026-03-28", stake_tao: 1253478, delegator_count: 7107 },
    ],
  };

  it("fetches validator history", async () => {
    fetchSpy.mockResolvedValueOnce(mockResponse(validatorHistoryBody));
    const history = await client.getValidatorHistory("5Gsb", 7);
    expect(history.count).toBe(1);
    expect(history.results[0].stake_tao).toBe(1253478);
  });

  const priceHistoryBody = {
    currency: "usd",
    results: [{ date: "2026-04-01", price: 350, volume: 1000000 }],
  };

  it("fetches price history", async () => {
    fetchSpy.mockResolvedValueOnce(mockResponse(priceHistoryBody));
    const data = await client.getPriceHistory("usd", 7);
    expect(data.currency).toBe("usd");
    expect(data.results).toHaveLength(1);
  });

  const subnetPriceBody = {
    netuid: 18,
    resolution: "D",
    count: 1,
    results: [
      { time: 1774742400, open: 0.007, high: 0.0072, low: 0.0069, close: 0.0071, volume: 0 },
    ],
  };

  it("fetches subnet price history", async () => {
    fetchSpy.mockResolvedValueOnce(mockResponse(subnetPriceBody));
    const data = await client.getSubnetPriceHistory(18, "D", 7);
    expect(data.netuid).toBe(18);
    expect(data.results[0].open).toBe(0.007);
  });

  it("throws TaoSwapNotFoundError on subnet price 404", async () => {
    fetchSpy.mockResolvedValueOnce(mockResponse({}, 404));
    await expect(client.getSubnetPriceHistory(99999)).rejects.toThrow(
      TaoSwapNotFoundError,
    );
  });

  it("fetches home stats", async () => {
    fetchSpy.mockResolvedValueOnce(
      mockResponse({ total_stake: 18993, apy_root: 10.58 }),
    );
    const data = await client.getHomeStats();
    expect(data.total_stake).toBe(18993);
  });

  it("fetches halving state", async () => {
    fetchSpy.mockResolvedValueOnce(
      mockResponse({ id: 1, at_issuance: 10799831, at_block: 0, time_remaining: "2026-04-04T03:40:03Z" }),
    );
    const data = await client.getHalving();
    expect(data.id).toBe(1);
  });

  it("fetches identities", async () => {
    fetchSpy.mockResolvedValueOnce(
      mockResponse({
        results: { "5Abc": { ss58_address: "5Abc", name: "Test" } },
        access_map: {},
      }),
    );
    const data = await client.getIdentities();
    expect(data.results["5Abc"].name).toBe("Test");
  });

  it("fetches events with filters", async () => {
    fetchSpy.mockResolvedValueOnce(
      mockResponse({
        results: [{ block: 100, section: "SubtensorModule", method: "StakeAdded" }],
        pagination: { page: 1, page_size: 25, has_next: false, has_previous: false },
      }),
    );
    const data = await client.getEvents({ section: "SubtensorModule", method: "StakeAdded" });
    expect(data.results).toHaveLength(1);
    const url = fetchSpy.mock.calls[0][0] as string;
    expect(url).toContain("section=SubtensorModule");
    expect(url).toContain("method=StakeAdded");
  });

  it("fetches extrinsics with filters", async () => {
    fetchSpy.mockResolvedValueOnce(
      mockResponse({
        results: [{ block: 200, category: "staking" }],
        pagination: { page: 1, page_size: 50, has_next: false, has_previous: false },
      }),
    );
    const data = await client.getExtrinsics({ category: "staking", page_size: 50 });
    expect(data.results).toHaveLength(1);
    const url = fetchSpy.mock.calls[0][0] as string;
    expect(url).toContain("category=staking");
  });

  it("fetches extrinsic counts", async () => {
    fetchSpy.mockResolvedValueOnce(
      mockResponse({ staking: 100, transfers: 50, evm: 0, other: 200, total: 350 }),
    );
    const data = await client.getExtrinsicCounts({ netuid: 1 });
    expect(data.total).toBe(350);
  });

  it("searches the network", async () => {
    fetchSpy.mockResolvedValueOnce(
      mockResponse({ count: 1, results: [{ type: "validator", name: "tao.bot" }] }),
    );
    const data = await client.search("tao.bot");
    expect(data.count).toBe(1);
    const url = fetchSpy.mock.calls[0][0] as string;
    expect(url).toContain("q=tao.bot");
  });

  it("skips undefined params in query string", async () => {
    fetchSpy.mockResolvedValueOnce(
      mockResponse({ results: [], pagination: { page: 1, page_size: 25, has_next: false, has_previous: false } }),
    );
    await client.getEvents({ block: 100 });
    const url = fetchSpy.mock.calls[0][0] as string;
    expect(url).toContain("block=100");
    expect(url).not.toContain("section");
  });

  it("fetches portfolio APY", async () => {
    fetchSpy.mockResolvedValueOnce(
      mockResponse({
        results: {
          account: "5Gsb",
          global: { apy_7d: 9.0 },
          staked_tao: { apy_7d: 10.0 },
        },
      }),
    );
    const data = await client.getPortfolioApy("5Gsb");
    expect(data.results.account).toBe("5Gsb");
    const url = fetchSpy.mock.calls[0][0] as string;
    expect(url).toContain("account=5Gsb");
  });

  it("fetches portfolio balance", async () => {
    fetchSpy.mockResolvedValueOnce(
      mockResponse({
        results: [{ date: "2026-03-28", total_tao: 1912628 }],
      }),
    );
    const data = await client.getPortfolioBalance("5Gsb", 7);
    expect(data.results).toHaveLength(1);
    const url = fetchSpy.mock.calls[0][0] as string;
    expect(url).toContain("account=5Gsb");
    expect(url).toContain("days=7");
  });

  it("fetches account transactions", async () => {
    fetchSpy.mockResolvedValueOnce(
      mockResponse({
        stake_transfers: [{ block: 100, operation: "remove" }],
        transfers: [],
      }),
    );
    const data = await client.getAccountTransactions("5Gsb", 10, 0);
    expect(data.stake_transfers).toHaveLength(1);
    const url = fetchSpy.mock.calls[0][0] as string;
    expect(url).toContain("account=5Gsb");
    expect(url).toContain("limit=10");
  });

  it("fetches idle stakes", async () => {
    fetchSpy.mockResolvedValueOnce(
      mockResponse({
        total_idle_alpha_tao: 106281,
        subnets: [{ netuid: 24, name: "Quasar" }],
      }),
    );
    const data = await client.getIdleStakes();
    expect(data.total_idle_alpha_tao).toBe(106281);
  });

  it("fetches idle stake lookup", async () => {
    fetchSpy.mockResolvedValueOnce(
      mockResponse({
        coldkey: "5Gsb",
        total_idle_alpha_tao: 6.5,
        delegations: [{ netuid: 17, subnet_name: "404-GEN" }],
      }),
    );
    const data = await client.getIdleStakeLookup("5Gsb");
    expect(data.coldkey).toBe("5Gsb");
    const url = fetchSpy.mock.calls[0][0] as string;
    expect(url).toContain("coldkey=5Gsb");
  });
});
