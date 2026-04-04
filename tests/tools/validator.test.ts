import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { registerValidatorTools } from "../../src/tools/validator.js";

vi.mock("../../src/backends/taoswap.js", () => {
  const mockClient = {
    getValidators: vi.fn(),
    getValidator: vi.fn(),
    getValidatorHistory: vi.fn(),
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
    TaoSwapRateLimitError: class extends MockTaoSwapApiError {
      constructor() {
        super("TaoSwap API rate limit reached. Try again in a few seconds.", 429);
        this.name = "TaoSwapRateLimitError";
      }
    },
    TaoSwapUnavailableError: class extends MockTaoSwapApiError {
      constructor(message: string) {
        super(message, 503);
        this.name = "TaoSwapUnavailableError";
      }
    },
  };
});

import { taoswap } from "../../src/backends/taoswap.js";

const mockTaoswap = taoswap as unknown as {
  getValidators: ReturnType<typeof vi.fn>;
  getValidator: ReturnType<typeof vi.fn>;
  getValidatorHistory: ReturnType<typeof vi.fn>;
};

async function setupServer() {
  const server = new McpServer({ name: "test", version: "0.0.0" });
  registerValidatorTools(server);
  const client = new Client({ name: "test-client", version: "0.0.0" });
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  await Promise.all([
    server.connect(serverTransport),
    client.connect(clientTransport),
  ]);
  return { server, client };
}

function parseResult(result: { content: unknown }) {
  const content = result.content as Array<{ type: string; text: string }>;
  return JSON.parse(content[0].text);
}

const sampleValidator = {
  validator_coldkey: "5Gsb",
  validator_hotkey: "5E2L",
  identity: {
    name: "tao.bot",
    url: "https://tao.bot",
    github: "",
    image: "/img.ico",
    discord: "dan",
    description: "Official validator",
    additional: "",
  },
  take: 0,
  apy_7d: 14.0,
  total_stake: "1252063.67",
  total_stake_root: "926712.42",
  total_stake_alpha: "325351.25",
  root_weight: "166808.24",
  dominance: "16.15",
  count_delegators: 7204,
};

describe("tao_validator_list", () => {
  let client: Client;
  let server: McpServer;

  beforeEach(async () => {
    vi.clearAllMocks();
    const setup = await setupServer();
    client = setup.client;
    server = setup.server;
  });

  afterEach(async () => {
    await client.close();
    await server.close();
  });

  it("returns formatted validator list", async () => {
    mockTaoswap.getValidators.mockResolvedValueOnce([sampleValidator]);

    const result = await client.callTool({ name: "tao_validator_list" });
    const data = parseResult(result);
    expect(Array.isArray(data)).toBe(true);
    expect(data[0].coldkey).toBe("5Gsb");
    expect(data[0].name).toBe("tao.bot");
    expect(data[0].total_stake_tao).toBeCloseTo(1252063.67);
    expect(data[0].delegator_count).toBe(7204);
  });

  it("returns error on API failure", async () => {
    const { TaoSwapUnavailableError } = await import(
      "../../src/backends/taoswap.js"
    );
    mockTaoswap.getValidators.mockRejectedValueOnce(
      new TaoSwapUnavailableError("TaoSwap API returned 500. The service may be temporarily down."),
    );

    const result = await client.callTool({ name: "tao_validator_list" });
    const data = parseResult(result);
    expect(data.error).toContain("500");
  });
});

describe("tao_validator_info", () => {
  let client: Client;
  let server: McpServer;

  beforeEach(async () => {
    vi.clearAllMocks();
    const setup = await setupServer();
    client = setup.client;
    server = setup.server;
  });

  afterEach(async () => {
    await client.close();
    await server.close();
  });

  it("returns detailed validator info with history", async () => {
    mockTaoswap.getValidator.mockResolvedValueOnce({
      ...sampleValidator,
      delegator_daily_earning: 353.6,
      validator_daily_earning: 0,
      monitoring: [
        {
          subnet_id: 1,
          subnet_name: "Apex",
          uid: 42,
          stake: 7731.5,
          vtrust: 0.9998,
          emission: 0.118,
          health: "success",
        },
      ],
      stakes: [
        { subnet_id: 0, subnet_name: "root", stake: 926712, percent: 74.01 },
      ],
      history: [],
    });
    mockTaoswap.getValidatorHistory.mockResolvedValueOnce({
      hotkey: "5E2L",
      count: 1,
      results: [
        {
          date: "2026-03-28",
          stake_tao: 1253478,
          root_stake_tao: 930908,
          alpha_stake_tao: 322569,
          alpha_stake_tao_with_slippage: 248013,
          stake_tao_with_slippage: 1178922,
          delegator_count: 7107,
          delegation_count: 39464,
        },
      ],
    });

    const result = await client.callTool({
      name: "tao_validator_info",
      arguments: { id: "5Gsb" },
    });
    const data = parseResult(result);
    expect(data.coldkey).toBe("5Gsb");
    expect(data.name).toBe("tao.bot");
    expect(data.delegator_daily_earning).toBe(353.6);
    expect(data.subnet_stakes).toHaveLength(1);
    expect(data.monitoring).toHaveLength(1);
    expect(data.history.data_points).toBe(1);
    expect(data.history.data).toHaveLength(1);
  });

  it("returns error for unknown validator", async () => {
    const { TaoSwapNotFoundError } = await import(
      "../../src/backends/taoswap.js"
    );
    const err = new TaoSwapNotFoundError(
      "Resource not found on TaoSwap. Check that the subnet ID is valid.",
    );
    mockTaoswap.getValidator.mockRejectedValueOnce(err);
    mockTaoswap.getValidatorHistory.mockRejectedValueOnce(err);

    const result = await client.callTool({
      name: "tao_validator_info",
      arguments: { id: "5Invalid" },
    });
    const data = parseResult(result);
    expect(data.error).toContain("not found");
  });

  it("passes custom days parameter to history", async () => {
    mockTaoswap.getValidator.mockResolvedValueOnce({
      ...sampleValidator,
      delegator_daily_earning: 0,
      validator_daily_earning: 0,
      monitoring: [],
      stakes: [],
      history: [],
    });
    mockTaoswap.getValidatorHistory.mockResolvedValueOnce({
      hotkey: "5E2L",
      count: 0,
      results: [],
    });

    const result = await client.callTool({
      name: "tao_validator_info",
      arguments: { id: "5Gsb", days: 7 },
    });
    const data = parseResult(result);
    expect(data.history.days_requested).toBe(7);
    expect(mockTaoswap.getValidatorHistory).toHaveBeenCalledWith("5Gsb", 7);
  });

  it("returns error with guidance on unexpected failure", async () => {
    mockTaoswap.getValidator.mockRejectedValueOnce(new TypeError("oops"));
    mockTaoswap.getValidatorHistory.mockRejectedValueOnce(
      new TypeError("oops"),
    );

    const result = await client.callTool({
      name: "tao_validator_info",
      arguments: { id: "5Gsb" },
    });
    const data = parseResult(result);
    expect(data.error).toContain("Try again");
  });
});
