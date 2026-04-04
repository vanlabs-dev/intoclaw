import { execFile } from "node:child_process";
import type {
  AgcliBalanceResult,
  AgcliWalletEntry,
  AgcliStakeEntry,
} from "../types/agcli.js";

const DEFAULT_TIMEOUT_MS = 30_000;
const SS58_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{46,48}$/;

export class AgcliNotInstalledError extends Error {
  constructor() {
    super(
      "agcli is not installed or not in PATH. Install it to use chain commands.",
    );
    this.name = "AgcliNotInstalledError";
  }
}

export class AgcliExecutionError extends Error {
  constructor(
    message: string,
    public readonly exitCode: number,
  ) {
    super(message);
    this.name = "AgcliExecutionError";
  }
}

export class AgcliValidationError extends AgcliExecutionError {
  constructor(message: string) {
    super(message, 12);
    this.name = "AgcliValidationError";
  }
}

export class AgcliTimeoutError extends Error {
  constructor() {
    super(
      "agcli command timed out. The chain may be slow to respond. Try again.",
    );
    this.name = "AgcliTimeoutError";
  }
}

let availableCache: boolean | null = null;

export async function isAgcliAvailable(): Promise<boolean> {
  if (availableCache !== null) return availableCache;
  try {
    await runRaw(["--version"]);
    availableCache = true;
  } catch {
    availableCache = false;
  }
  return availableCache;
}

export function _resetCacheForTesting(): void {
  availableCache = null;
}

export function isWalletPasswordConfigured(): boolean {
  return "AGCLI_PASSWORD" in process.env && process.env.AGCLI_PASSWORD !== "";
}

export function validateAddress(address: string): void {
  if (address.startsWith("-")) {
    throw new AgcliExecutionError(
      "Invalid address format. SS58 addresses start with a number or letter.",
      1,
    );
  }
  if (!SS58_PATTERN.test(address)) {
    throw new AgcliExecutionError(
      "Invalid address format. Provide a valid SS58 address (46-48 Base58 characters).",
      1,
    );
  }
}

function runRaw(
  args: string[],
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = execFile(
      "agcli",
      args,
      { timeout: timeoutMs, maxBuffer: 10 * 1024 * 1024 },
      (err, stdout, stderr) => {
        if (err && "killed" in err && err.killed) {
          reject(new AgcliTimeoutError());
          return;
        }
        if (err && "code" in err && err.code === "ENOENT") {
          availableCache = false;
          reject(new AgcliNotInstalledError());
          return;
        }
        resolve({ stdout: stdout ?? "", stderr: stderr ?? "" });
      },
    );
    child.stdin?.end();
  });
}

async function run<T>(
  args: string[],
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<T> {
  const available = await isAgcliAvailable();
  if (!available) throw new AgcliNotInstalledError();

  const fullArgs = ["--output", "json", "--batch", ...args];

  const redacted = fullArgs
    .map((a, i) =>
      fullArgs[i - 1] === "--password" ? "***" : a,
    )
    .join(" ");
  // eslint-disable-next-line no-console
  console.error(`[agcli] ${redacted}`);

  const { stdout, stderr } = await runRaw(fullArgs, timeoutMs);

  if (stdout.trim()) {
    try {
      const parsed = JSON.parse(stdout.trim()) as
        | T
        | { error: boolean; code: number; message: string };
      if (
        parsed &&
        typeof parsed === "object" &&
        "error" in parsed &&
        (parsed as { error: boolean }).error
      ) {
        const errObj = parsed as { code: number; message: string };
        if (errObj.code === 12) {
          throw new AgcliValidationError(errObj.message);
        }
        throw new AgcliExecutionError(errObj.message, errObj.code);
      }
      return parsed as T;
    } catch (e) {
      if (
        e instanceof AgcliExecutionError ||
        e instanceof AgcliValidationError
      ) {
        throw e;
      }
    }
  }

  if (stderr.trim()) {
    const lines = stderr.trim().split("\n");
    const lastLine = lines[lines.length - 1];
    try {
      const errObj = JSON.parse(lastLine) as {
        error: boolean;
        code: number;
        message: string;
      };
      if (errObj.error) {
        if (errObj.code === 12) {
          throw new AgcliValidationError(errObj.message);
        }
        throw new AgcliExecutionError(errObj.message, errObj.code);
      }
    } catch (e) {
      if (
        e instanceof AgcliExecutionError ||
        e instanceof AgcliValidationError
      ) {
        throw e;
      }
      throw new AgcliExecutionError(
        `agcli returned an error. ${lastLine}`,
        1,
      );
    }
  }

  throw new AgcliExecutionError(
    "agcli returned no output. The command may have failed silently.",
    1,
  );
}

export async function getBalance(
  address: string,
): Promise<AgcliBalanceResult> {
  validateAddress(address);
  return run<AgcliBalanceResult>(["balance", "--address", address]);
}

export async function listWallets(): Promise<AgcliWalletEntry[]> {
  return run<AgcliWalletEntry[]>(["wallet", "list"]);
}

export async function listStakes(
  address?: string,
): Promise<AgcliStakeEntry[]> {
  const args = ["stake", "list"];
  if (address) {
    validateAddress(address);
    args.push("--address", address);
  }
  return run<AgcliStakeEntry[]>(args);
}

export async function executeAgcli<T = Record<string, unknown>>(
  args: string[],
): Promise<T> {
  return run<T>(args);
}

export function buildStakeAddArgs(
  amount: number,
  netuid: number,
  maxSlippage?: number,
): string[] {
  const args = ["stake", "add", "--amount", String(amount), "--netuid", String(netuid)];
  if (maxSlippage !== undefined) {
    args.push("--max-slippage", String(maxSlippage));
  }
  return args;
}

export function buildStakeRemoveArgs(
  amount: number,
  netuid: number,
): string[] {
  return ["stake", "remove", "--amount", String(amount), "--netuid", String(netuid)];
}

export function buildStakeMoveArgs(
  amount: number,
  from: number,
  to: number,
): string[] {
  return ["stake", "move", "--amount", String(amount), "--from", String(from), "--to", String(to)];
}

export function buildTransferArgs(dest: string, amount: number): string[] {
  validateAddress(dest);
  return ["transfer", "--dest", dest, "--amount", String(amount)];
}

export function buildWalletCreateArgs(name: string): string[] {
  return ["wallet", "create", "--name", name, "--yes"];
}

export async function getSwapSimulation(
  netuid: number,
  tao?: number,
  alpha?: number,
): Promise<Record<string, unknown>> {
  const args = ["view", "swap-sim", "--netuid", String(netuid)];
  if (tao !== undefined) args.push("--tao", String(tao));
  if (alpha !== undefined) args.push("--alpha", String(alpha));
  return run<Record<string, unknown>>(args);
}

export async function getExplanation(
  topic: string,
): Promise<{ content: string; topic: string }> {
  return run<{ content: string; topic: string }>(["explain", "--topic", topic]);
}

export async function getConfigAll(): Promise<Record<string, unknown>> {
  try {
    return await run<Record<string, unknown>>(["config", "show"]);
  } catch {
    const available = await isAgcliAvailable();
    if (!available) throw new AgcliNotInstalledError();
    const { stdout } = await runRaw(
      ["--output", "json", "--batch", "config", "show"],
    );
    return { raw: stdout.trim() || "No configuration set." };
  }
}

export async function setConfig(
  key: string,
  value: string,
): Promise<Record<string, unknown>> {
  return run<Record<string, unknown>>(["config", "set", key, value]);
}
