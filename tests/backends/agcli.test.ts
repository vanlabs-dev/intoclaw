import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { mockExecFile } = vi.hoisted(() => ({
  mockExecFile: vi.fn(),
}));
vi.mock("node:child_process", () => ({
  execFile: mockExecFile,
}));

import {
  getBalance,
  listWallets,
  listStakes,
  _resetCacheForTesting,
  AgcliNotInstalledError,
  AgcliExecutionError,
  AgcliValidationError,
  AgcliTimeoutError,
} from "../../src/backends/agcli.js";

type ExecCallback = (
  err: { code?: string; killed?: boolean } | null,
  stdout: string,
  stderr: string,
) => void;

function simulateExecFile(
  stdout: string,
  stderr = "",
  err: { code?: string; killed?: boolean } | null = null,
) {
  mockExecFile.mockImplementation(
    (
      _bin: string,
      _args: string[],
      _opts: unknown,
      cb: ExecCallback,
    ) => {
      cb(err, stdout, stderr);
      return { stdin: { end: vi.fn() } };
    },
  );
}

function simulateAvailableThen(
  stdout: string,
  stderr = "",
  err: { code?: string; killed?: boolean } | null = null,
) {
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
        cb(err, stdout, stderr);
      }
      return { stdin: { end: vi.fn() } };
    },
  );
}

describe("agcli backend", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetCacheForTesting();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("detects binary not found (ENOENT)", async () => {
    simulateExecFile("", "", { code: "ENOENT" });
    await expect(listWallets()).rejects.toThrow(AgcliNotInstalledError);
  });

  it("fetches balance for valid address", async () => {
    simulateAvailableThen(
      '{"address":"5Gsb","balance_rao":1766331327,"balance_tao":1.766331327}',
    );
    const result = await getBalance(
      "5GsbTgfvgCH4xdqSkiPb7EaBBFLHjWH5vfEALhJaewSFpZX9",
    );
    expect(result.address).toBe("5Gsb");
    expect(result.balance_tao).toBeCloseTo(1.766);
  });

  it("lists wallets (empty)", async () => {
    simulateAvailableThen("[]");
    const result = await listWallets();
    expect(result).toEqual([]);
  });

  it("lists wallets with entries", async () => {
    simulateAvailableThen(
      '[{"name":"default","address":"5Gsb","path":"/home/user/.bittensor"}]',
    );
    const result = await listWallets();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("default");
  });

  it("lists stakes for address", async () => {
    simulateAvailableThen(
      '[{"hotkey":"5E2L","coldkey":"5Gsb","netuid":0,"stake":{"rao":1875072702578},"alpha_stake":{"raw":1875072702578}}]',
    );
    const result = await listStakes(
      "5GsbTgfvgCH4xdqSkiPb7EaBBFLHjWH5vfEALhJaewSFpZX9",
    );
    expect(result).toHaveLength(1);
    expect(result[0].netuid).toBe(0);
    expect(result[0].stake.rao).toBe(1875072702578);
  });

  it("handles exit code 1 with error JSON in stdout", async () => {
    simulateAvailableThen(
      '{"code":1,"error":true,"message":"Invalid address"}',
    );
    await expect(
      getBalance("5GsbTgfvgCH4xdqSkiPb7EaBBFLHjWH5vfEALhJaewSFpZX9"),
    ).rejects.toThrow(AgcliExecutionError);
  });

  it("handles exit code 12 as validation error", async () => {
    simulateAvailableThen(
      '{"code":12,"error":true,"message":"Subnet not found"}',
    );
    await expect(
      listStakes("5GsbTgfvgCH4xdqSkiPb7EaBBFLHjWH5vfEALhJaewSFpZX9"),
    ).rejects.toThrow(AgcliValidationError);
  });

  it("handles timeout", async () => {
    simulateAvailableThen("", "", { killed: true });
    await expect(
      getBalance("5GsbTgfvgCH4xdqSkiPb7EaBBFLHjWH5vfEALhJaewSFpZX9"),
    ).rejects.toThrow(AgcliTimeoutError);
  });

  it("never logs password value", async () => {
    const spy = vi.spyOn(console, "error");
    simulateAvailableThen("[]");
    await listWallets();
    const logged = spy.mock.calls.map((c) => c.join(" ")).join(" ");
    expect(logged).not.toContain("AGCLI_PASSWORD");
  });

  it("rejects addresses starting with --", async () => {
    await expect(getBalance("--help")).rejects.toThrow(AgcliExecutionError);
    expect(mockExecFile).not.toHaveBeenCalled();
  });

  it("rejects malformed addresses", async () => {
    await expect(getBalance("not_valid!")).rejects.toThrow(
      AgcliExecutionError,
    );
    expect(mockExecFile).not.toHaveBeenCalled();
  });
});
