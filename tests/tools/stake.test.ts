import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { registerStakeTools } from "../../src/tools/stake.js";

vi.mock("../../src/backends/taoswap.js", () => {
  const mockClient = {
    getSubnet: vi.fn(),
    getPortfolioBalance: vi.fn(),
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
      }
    },
  };
});

const { mockExecFile } = vi.hoisted(() => ({
  mockExecFile: vi.fn(),
}));
vi.mock("node:child_process", () => ({
  execFile: mockExecFile,
}));

import { taoswap } from "../../src/backends/taoswap.js";
import { _resetCacheForTesting } from "../../src/backends/agcli.js";
import { pendingStore } from "../../src/lib/pending.js";

const mockTaoswap = taoswap as unknown as {
  getSubnet: ReturnType<typeof vi.fn>;
  getPortfolioBalance: ReturnType<typeof vi.fn>;
};

type ExecCb = (
  err: { code?: string; killed?: boolean } | null,
  stdout: string,
  stderr: string,
) => void;

function simulateAgcli(stdout = "{}") {
  let n = 0;
  mockExecFile.mockImplementation(
    (_b: string, args: string[], _o: unknown, cb: ExecCb) => {
      n++;
      if (n === 1 && args[0] === "--version") cb(null, "agcli 0.1.0", "");
      else cb(null, stdout, "");
      return { stdin: { end: vi.fn() } };
    },
  );
}

function activeSubnet(overrides: Record<string, unknown> = {}) {
  return {
    id: 18,
    name: "Zeus",
    price: 0.008,
    root_in_pool: 13500,
    alpha_in_pool: 1664000,
    ...overrides,
  };
}

async function setup() {
  const server = new McpServer({ name: "test", version: "0.0.0" });
  registerStakeTools(server);
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

describe("tao_stake_list", () => {
  let client: Client;
  let server: McpServer;

  beforeEach(async () => {
    vi.clearAllMocks();
    _resetCacheForTesting();
    vi.spyOn(console, "error").mockImplementation(() => {});
    const s = await setup();
    client = s.client;
    server = s.server;
  });

  afterEach(async () => {
    await client.close();
    await server.close();
    vi.restoreAllMocks();
  });

  it("returns stake positions with alpha and estimated TAO", async () => {
    simulateAgcli(
      '[{"hotkey":"5E2L","coldkey":"5Gsb","netuid":18,"stake":{"rao":1875072702578},"alpha_stake":{"raw":12111060000000}}]',
    );
    mockTaoswap.getSubnet.mockResolvedValueOnce({
      id: 18, name: "Zeus", price: 0.008,
    });
    mockTaoswap.getPortfolioBalance.mockResolvedValueOnce({
      results: [{
        date: "2026-04-08",
        staked_alpha_in_tao: 403800000000,
        staked_alpha_in_usd: "137235.00",
      }],
    });

    const result = await client.callTool({
      name: "tao_stake_list",
      arguments: { address: "5GsbTgfvgCH4xdqSkiPb7EaBBFLHjWH5vfEALhJaewSFpZX9" },
    });
    const data = parse(result);
    expect(data.positions).toBe(1);
    expect(data.stakes[0].alpha_amount).toBeCloseTo(12111.06, 1);
    expect(data.stakes[0].subnet_name).toBe("Zeus");
    expect(data.stakes[0].estimated_tao).toBeCloseTo(96.89, 0);
    expect(data.estimated_total_tao).toBeCloseTo(403.8, 1);
    expect(data.estimated_total_usd).toBe("137235.00");
  });

  it("works when TaoSwap is unavailable", async () => {
    simulateAgcli(
      '[{"hotkey":"5E2L","coldkey":"5Gsb","netuid":18,"stake":{"rao":100000000},"alpha_stake":{"raw":5000000000000}}]',
    );
    mockTaoswap.getSubnet.mockRejectedValueOnce(new Error("timeout"));
    mockTaoswap.getPortfolioBalance.mockRejectedValueOnce(new Error("timeout"));

    const result = await client.callTool({
      name: "tao_stake_list",
      arguments: { address: "5GsbTgfvgCH4xdqSkiPb7EaBBFLHjWH5vfEALhJaewSFpZX9" },
    });
    const data = parse(result);
    expect(data.positions).toBe(1);
    expect(data.stakes[0].alpha_amount).toBeCloseTo(5000, 0);
    expect(data.stakes[0].estimated_tao).toBeNull();
    expect(data.stakes[0].subnet_name).toBeNull();
    expect(data.estimated_total_note).toContain("unavailable");
  });

  it("returns error when agcli not installed", async () => {
    mockExecFile.mockImplementation(
      (_b: string, _a: string[], _o: unknown, cb: ExecCb) => {
        cb({ code: "ENOENT" }, "", "");
        return { stdin: { end: vi.fn() } };
      },
    );
    const result = await client.callTool({
      name: "tao_stake_list",
      arguments: { address: "5GsbTgfvgCH4xdqSkiPb7EaBBFLHjWH5vfEALhJaewSFpZX9" },
    });
    const data = parse(result);
    expect(data.error).toContain("not installed");
  });
});

describe("tao_stake_add", () => {
  let client: Client;
  let server: McpServer;

  beforeEach(async () => {
    vi.clearAllMocks();
    _resetCacheForTesting();
    vi.spyOn(console, "error").mockImplementation(() => {});
    const s = await setup();
    client = s.client;
    server = s.server;
  });

  afterEach(async () => {
    await client.close();
    await server.close();
    vi.restoreAllMocks();
  });

  it("returns preview when safety passes", async () => {
    mockTaoswap.getSubnet.mockResolvedValueOnce(activeSubnet());
    simulateAgcli('{"estimated_alpha":1234}');

    const result = await client.callTool({
      name: "tao_stake_add",
      arguments: { amount: 10, netuid: 18 },
    });
    const data = parse(result);
    expect(data.status).toBe("preview");
    expect(data.needs_confirmation).toBe(true);
    expect(data.operation_id).toBeTruthy();
    expect(data.message).toContain("Confirm");
    pendingStore.removePending(data.operation_id);
  });

  it("returns blocked for inactive subnet", async () => {
    simulateAgcli("{}");
    mockTaoswap.getSubnet.mockResolvedValueOnce(activeSubnet({ price: 1.5 }));

    const result = await client.callTool({
      name: "tao_stake_add",
      arguments: { amount: 10, netuid: 18 },
    });
    const data = parse(result);
    expect(data.status).toBe("blocked");
    expect(data.safety.verdict).toBe("blocked");
  });

  it("returns preview with warning for high slippage", async () => {
    mockTaoswap.getSubnet.mockResolvedValueOnce(
      activeSubnet({ root_in_pool: 100 }),
    );
    simulateAgcli("{}");

    const result = await client.callTool({
      name: "tao_stake_add",
      arguments: { amount: 20, netuid: 18 },
    });
    const data = parse(result);
    expect(data.status).toBe("preview");
    expect(data.safety.verdict).toBe("warning");
    pendingStore.removePending(data.operation_id);
  });
});

describe("tao_stake_remove", () => {
  let client: Client;
  let server: McpServer;

  beforeEach(async () => {
    vi.clearAllMocks();
    _resetCacheForTesting();
    vi.spyOn(console, "error").mockImplementation(() => {});
    const s = await setup();
    client = s.client;
    server = s.server;
  });

  afterEach(async () => {
    await client.close();
    await server.close();
    vi.restoreAllMocks();
  });

  it("returns preview without safety check", async () => {
    simulateAgcli('{"estimated_tao":5}');

    const result = await client.callTool({
      name: "tao_stake_remove",
      arguments: { amount: 5, netuid: 18 },
    });
    const data = parse(result);
    expect(data.status).toBe("preview");
    expect(data.needs_confirmation).toBe(true);
    pendingStore.removePending(data.operation_id);
  });
});

describe("tao_stake_move", () => {
  let client: Client;
  let server: McpServer;

  beforeEach(async () => {
    vi.clearAllMocks();
    _resetCacheForTesting();
    vi.spyOn(console, "error").mockImplementation(() => {});
    const s = await setup();
    client = s.client;
    server = s.server;
  });

  afterEach(async () => {
    await client.close();
    await server.close();
    vi.restoreAllMocks();
  });

  it("runs safety on destination subnet", async () => {
    mockTaoswap.getSubnet.mockResolvedValueOnce(activeSubnet({ id: 1 }));
    simulateAgcli("{}");

    const result = await client.callTool({
      name: "tao_stake_move",
      arguments: { amount: 10, from: 3, to: 1 },
    });
    const data = parse(result);
    expect(data.status).toBe("preview");
    expect(mockTaoswap.getSubnet).toHaveBeenCalledWith(1);
    pendingStore.removePending(data.operation_id);
  });
});
