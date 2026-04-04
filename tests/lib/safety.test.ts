import { describe, it, expect, vi, beforeEach } from "vitest";

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
    TaoSwapUnavailableError: class extends MockTaoSwapApiError {
      constructor(message: string) {
        super(message, 503);
        this.name = "TaoSwapUnavailableError";
      }
    },
  };
});

import { taoswap } from "../../src/backends/taoswap.js";
import { assessStakingSafety } from "../../src/lib/safety.js";

const mock = taoswap as unknown as {
  getSubnet: ReturnType<typeof vi.fn>;
};

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

describe("assessStakingSafety", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns safe for active subnet with low slippage", async () => {
    mock.getSubnet.mockResolvedValueOnce(activeSubnet());
    const result = await assessStakingSafety(18, 100);
    expect(result.verdict).toBe("safe");
    expect(result.subnetName).toBe("Zeus");
    expect(result.checks.every((c) => c.passed)).toBe(true);
  });

  it("blocks inactive subnet (alpha > 1 TAO)", async () => {
    mock.getSubnet.mockResolvedValueOnce(activeSubnet({ price: 1.5 }));
    const result = await assessStakingSafety(18, 100);
    expect(result.verdict).toBe("blocked");
    expect(result.checks[0].name).toBe("subnet_active");
    expect(result.checks[0].severity).toBe("block");
    expect(result.checks[0].message).toContain("INACTIVE");
  });

  it("blocks subnet not found (404)", async () => {
    const { TaoSwapNotFoundError } = await import(
      "../../src/backends/taoswap.js"
    );
    mock.getSubnet.mockRejectedValueOnce(
      new TaoSwapNotFoundError("Not found"),
    );
    const result = await assessStakingSafety(99999, 100);
    expect(result.verdict).toBe("blocked");
    expect(result.checks[0].message).toContain("not found");
  });

  it("warns on newly re-registered subnet (pool < 10 TAO)", async () => {
    mock.getSubnet.mockResolvedValueOnce(
      activeSubnet({ root_in_pool: 5 }),
    );
    const result = await assessStakingSafety(18, 1);
    expect(result.verdict).toBe("warning");
    const reReg = result.checks.find((c) => c.name === "recently_registered");
    expect(reReg?.severity).toBe("warning");
    expect(reReg?.message).toContain("recently re-registered");
  });

  it("warns on high slippage (> 10%)", async () => {
    mock.getSubnet.mockResolvedValueOnce(
      activeSubnet({ root_in_pool: 100 }),
    );
    const result = await assessStakingSafety(18, 20);
    expect(result.verdict).toBe("warning");
    const slip = result.checks.find((c) => c.name === "slippage");
    expect(slip?.severity).toBe("warning");
  });

  it("blocks on extreme slippage (> 25%)", async () => {
    mock.getSubnet.mockResolvedValueOnce(
      activeSubnet({ root_in_pool: 100 }),
    );
    const result = await assessStakingSafety(18, 50);
    expect(result.verdict).toBe("blocked");
    const slip = result.checks.find((c) => c.name === "slippage");
    expect(slip?.severity).toBe("block");
  });

  it("passes on moderate slippage (< 10%)", async () => {
    mock.getSubnet.mockResolvedValueOnce(
      activeSubnet({ root_in_pool: 1000 }),
    );
    const result = await assessStakingSafety(18, 50);
    expect(result.verdict).toBe("safe");
    const slip = result.checks.find((c) => c.name === "slippage");
    expect(slip?.severity).toBe("info");
    expect(slip?.passed).toBe(true);
  });

  it("blocks when TaoSwap API is unavailable (fail closed)", async () => {
    const { TaoSwapUnavailableError } = await import(
      "../../src/backends/taoswap.js"
    );
    mock.getSubnet.mockRejectedValueOnce(
      new TaoSwapUnavailableError("Service down"),
    );
    const result = await assessStakingSafety(18, 100);
    expect(result.verdict).toBe("blocked");
    expect(result.checks[0].message).toContain("unavailable");
  });

  it("summary contains estimated/approximately", async () => {
    mock.getSubnet.mockResolvedValueOnce(activeSubnet());
    const result = await assessStakingSafety(18, 100);
    expect(result.summary).toContain("approximately");
  });

  it("combines active subnet with high slippage correctly", async () => {
    mock.getSubnet.mockResolvedValueOnce(
      activeSubnet({ root_in_pool: 100 }),
    );
    const result = await assessStakingSafety(18, 15);
    expect(result.checks.find((c) => c.name === "subnet_active")?.passed).toBe(
      true,
    );
    const slip = result.checks.find((c) => c.name === "slippage");
    expect(slip?.severity).toBe("warning");
    expect(result.verdict).toBe("warning");
  });
});
