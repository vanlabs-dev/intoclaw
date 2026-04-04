import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { registerPortfolioTools } from "../../src/tools/portfolio.js";

vi.mock("../../src/backends/taoswap.js", () => {
  const mockClient = {
    getPortfolioApy: vi.fn(),
    getPortfolioBalance: vi.fn(),
    getAccountTransactions: vi.fn(),
    getIdleStakes: vi.fn(),
    getIdleStakeLookup: vi.fn(),
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
  getPortfolioApy: ReturnType<typeof vi.fn>;
  getPortfolioBalance: ReturnType<typeof vi.fn>;
  getAccountTransactions: ReturnType<typeof vi.fn>;
  getIdleStakes: ReturnType<typeof vi.fn>;
  getIdleStakeLookup: ReturnType<typeof vi.fn>;
};

async function setup() {
  const server = new McpServer({ name: "test", version: "0.0.0" });
  registerPortfolioTools(server);
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

describe("tao_portfolio_balance", () => {
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

  it("returns balance history", async () => {
    mock.getPortfolioBalance.mockResolvedValueOnce({
      results: [
        { date: "2026-03-28", total_tao: 1912628, total_usd: 602095 },
        { date: "2026-03-29", total_tao: 1920000, total_usd: 605000 },
      ],
    });
    const result = await client.callTool({
      name: "tao_portfolio_balance",
      arguments: { account: "5Gsb" },
    });
    const data = parse(result);
    expect(data.account).toBe("5Gsb");
    expect(data.data_points).toBe(2);
    expect(data.history).toHaveLength(2);
  });

  it("returns error for unknown account", async () => {
    const { TaoSwapNotFoundError } = await import(
      "../../src/backends/taoswap.js"
    );
    mock.getPortfolioBalance.mockRejectedValueOnce(
      new TaoSwapNotFoundError("Resource not found on TaoSwap. Check that the subnet ID is valid."),
    );
    const result = await client.callTool({
      name: "tao_portfolio_balance",
      arguments: { account: "5Invalid" },
    });
    const data = parse(result);
    expect(data.error).toContain("not found");
  });
});

describe("tao_portfolio_apy", () => {
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

  it("returns APY breakdown with estimated language", async () => {
    mock.getPortfolioApy.mockResolvedValueOnce({
      results: {
        account: "5Gsb",
        updated_at: "2026-04-03T22:47:27Z",
        global: { apy_7d: 9.03, apy_30d: 3.66, apy_all: -1000000 },
        free: { apy_7d: -100, apy_30d: -1000000, apy_all: -1000000 },
        staked_tao: { apy_7d: 10.01, apy_30d: 10.07, apy_all: 0 },
        staked_alpha: { apy_7d: 92.13, apy_30d: 48.31, apy_all: 0 },
      },
    });
    const result = await client.callTool({
      name: "tao_portfolio_apy",
      arguments: { account: "5Gsb" },
    });
    const data = parse(result);
    expect(data.account).toBe("5Gsb");
    expect(data.note).toContain("estimated");
    expect(data.estimated_global_apy.apy_7d).toBe(9.03);
    expect(data.estimated_staked_alpha_apy.apy_7d).toBe(92.13);
  });

  it("returns error for unknown account", async () => {
    const { TaoSwapNotFoundError } = await import(
      "../../src/backends/taoswap.js"
    );
    mock.getPortfolioApy.mockRejectedValueOnce(
      new TaoSwapNotFoundError("Resource not found on TaoSwap. Check that the subnet ID is valid."),
    );
    const result = await client.callTool({
      name: "tao_portfolio_apy",
      arguments: { account: "5Unknown" },
    });
    const data = parse(result);
    expect(data.error).toContain("not found");
  });
});

describe("tao_account_transactions", () => {
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

  it("returns transactions", async () => {
    mock.getAccountTransactions.mockResolvedValueOnce({
      stake_transfers: [
        { block: 100, operation: "remove", amount_rao: 1000000000 },
      ],
      transfers: [
        { block: 101, sender: "5Gsb", receiver: "5Abc", amount_rao: 2000000000 },
      ],
    });
    const result = await client.callTool({
      name: "tao_account_transactions",
      arguments: { account: "5Gsb" },
    });
    const data = parse(result);
    expect(data.account).toBe("5Gsb");
    expect(data.stake_transfers).toHaveLength(1);
    expect(data.transfers).toHaveLength(1);
  });

  it("passes custom limit", async () => {
    mock.getAccountTransactions.mockResolvedValueOnce({
      stake_transfers: [],
      transfers: [],
    });
    await client.callTool({
      name: "tao_account_transactions",
      arguments: { account: "5Gsb", limit: 10 },
    });
    expect(mock.getAccountTransactions).toHaveBeenCalledWith("5Gsb", 10, 0);
  });

  it("returns error on failure", async () => {
    mock.getAccountTransactions.mockRejectedValueOnce(new TypeError("fail"));
    const result = await client.callTool({
      name: "tao_account_transactions",
      arguments: { account: "5Gsb" },
    });
    const data = parse(result);
    expect(data.error).toContain("Try again");
  });
});

describe("tao_idle_stakes", () => {
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

  it("returns global idle stakes when no account", async () => {
    mock.getIdleStakes.mockResolvedValueOnce({
      total_idle_alpha_tao: 106281,
      total_estimated_daily_loss_tao: 212,
      total_delegators_affected: 6002,
      subnets: [
        { netuid: 24, name: "Quasar", idle_alpha_tao: 15083, delegators_affected: 341 },
      ],
    });
    const result = await client.callTool({
      name: "tao_idle_stakes",
      arguments: {},
    });
    const data = parse(result);
    expect(data.total_idle_alpha_tao).toBe(106281);
    expect(data.subnets).toHaveLength(1);
  });

  it("returns account-specific idle stakes", async () => {
    mock.getIdleStakeLookup.mockResolvedValueOnce({
      coldkey: "5Gsb",
      total_idle_alpha_tao: 6.5,
      total_estimated_daily_loss_tao: 0.01,
      delegations: [
        { netuid: 17, subnet_name: "404-GEN", alpha_tao_value: 0.43 },
      ],
    });
    const result = await client.callTool({
      name: "tao_idle_stakes",
      arguments: { account: "5Gsb" },
    });
    const data = parse(result);
    expect(data.coldkey).toBe("5Gsb");
    expect(data.delegations).toHaveLength(1);
  });

  it("returns error for unknown account", async () => {
    const { TaoSwapNotFoundError } = await import(
      "../../src/backends/taoswap.js"
    );
    mock.getIdleStakeLookup.mockRejectedValueOnce(
      new TaoSwapNotFoundError("Resource not found on TaoSwap. Check that the subnet ID is valid."),
    );
    const result = await client.callTool({
      name: "tao_idle_stakes",
      arguments: { account: "5Unknown" },
    });
    const data = parse(result);
    expect(data.error).toContain("not found");
  });
});
