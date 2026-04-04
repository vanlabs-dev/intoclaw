import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

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
import { createPreview, executeConfirmed } from "../../src/lib/confirmation.js";

const mockTaoswap = taoswap as unknown as {
  getSubnet: ReturnType<typeof vi.fn>;
};

type ExecCallback = (
  err: { code?: string; killed?: boolean } | null,
  stdout: string,
  stderr: string,
) => void;

function simulateAgcli(stdout: string) {
  let callCount = 0;
  mockExecFile.mockImplementation(
    (
      _bin: string,
      args: string[],
      _opts: unknown,
      cb: ExecCallback,
    ) => {
      callCount++;
      if (callCount === 1 && args[0] === "--version") {
        cb(null, "agcli 0.1.0", "");
      } else {
        cb(null, stdout, "");
      }
      return { stdin: { end: vi.fn() } };
    },
  );
}

describe("createPreview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetCacheForTesting();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns preview with operation ID when safety passes", async () => {
    mockTaoswap.getSubnet.mockResolvedValueOnce({
      id: 1,
      name: "Apex",
      price: 0.012,
      root_in_pool: 30000,
      alpha_in_pool: 2500000,
    });

    const result = await createPreview({
      tool: "tao_stake_add",
      params: { netuid: 1, amount: 10 },
      agcliArgs: ["stake", "add", "--netuid", "1", "--amount", "10"],
      safetyNetuid: 1,
      safetyAmount: 10,
    });

    expect(result.status).toBe("preview");
    expect(result.operationId).toBeTruthy();
    expect(result.preview.safetyAssessment?.verdict).toBe("safe");
    pendingStore.removePending(result.operationId);
  });

  it("returns blocked when safety blocks", async () => {
    mockTaoswap.getSubnet.mockResolvedValueOnce({
      id: 1,
      name: "Apex",
      price: 1.5,
      root_in_pool: 100,
      alpha_in_pool: 50,
    });

    const result = await createPreview({
      tool: "tao_stake_add",
      params: { netuid: 1, amount: 10 },
      agcliArgs: ["stake", "add"],
      safetyNetuid: 1,
      safetyAmount: 10,
    });

    expect(result.status).toBe("blocked");
    expect(result.operationId).toBe("");
    expect(pendingStore.getPending("")).toBeNull();
  });

  it("includes dry-run output when provided", async () => {
    simulateAgcli('{"estimated_alpha":1234.5}');

    const result = await createPreview({
      tool: "tao_stake_add",
      params: { netuid: 1, amount: 10 },
      agcliArgs: ["stake", "add"],
      dryRunArgs: ["stake", "add", "--dry-run"],
    });

    expect(result.status).toBe("preview");
    expect(result.preview.dryRunOutput).toEqual({ estimated_alpha: 1234.5 });
    pendingStore.removePending(result.operationId);
  });
});

describe("executeConfirmed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetCacheForTesting();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("executes and removes pending operation", async () => {
    simulateAgcli('{"success":true}');
    process.env.AGCLI_PASSWORD = "testpass";

    const opId = pendingStore.createPending({
      tool: "tao_stake_add",
      params: { netuid: 1 },
      agcliCommand: ["stake", "add", "--netuid", "1"],
      preview: {},
    });

    const result = await executeConfirmed(opId);
    expect(result.status).toBe("executed");
    expect(result.result).toEqual({ success: true });
    expect(pendingStore.getPending(opId)).toBeNull();
    delete process.env.AGCLI_PASSWORD;
  });

  it("returns not_found for unknown ID", async () => {
    const result = await executeConfirmed(
      "00000000-0000-4000-a000-000000000000",
    );
    expect(result.status).toBe("not_found");
  });

  it("returns not_found for expired ID", async () => {
    vi.useFakeTimers();
    const opId = pendingStore.createPending({
      tool: "tao_stake_add",
      params: {},
      agcliCommand: ["stake", "add"],
      preview: {},
    });
    vi.advanceTimersByTime(301_000);
    const result = await executeConfirmed(opId);
    expect(result.status).toBe("not_found");
    vi.useRealTimers();
  });

  it("returns error when password not configured", async () => {
    simulateAgcli("{}");
    delete process.env.AGCLI_PASSWORD;

    const opId = pendingStore.createPending({
      tool: "tao_stake_add",
      params: {},
      agcliCommand: ["stake", "add"],
      preview: {},
    });

    const result = await executeConfirmed(opId);
    expect(result.status).toBe("error");
    expect(result.error).toContain("password not configured");
  });

  it("never logs password value", async () => {
    const spy = vi.spyOn(console, "error");
    simulateAgcli('{"success":true}');
    process.env.AGCLI_PASSWORD = "supersecret";

    const opId = pendingStore.createPending({
      tool: "tao_stake_add",
      params: {},
      agcliCommand: ["stake", "add"],
      preview: {},
    });

    await executeConfirmed(opId);
    const logged = spy.mock.calls.map((c) => c.join(" ")).join(" ");
    expect(logged).not.toContain("supersecret");
    delete process.env.AGCLI_PASSWORD;
  });
});
