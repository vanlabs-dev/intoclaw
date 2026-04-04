import {
  assessStakingSafety,
  type SafetyAssessment,
} from "./safety.js";
import { pendingStore } from "./pending.js";
import {
  executeAgcli,
  isAgcliAvailable,
  isWalletPasswordConfigured,
  AgcliNotInstalledError,
} from "../backends/agcli.js";

export interface PreviewResult {
  operationId: string;
  status: "preview" | "blocked";
  preview: {
    tool: string;
    params: Record<string, unknown>;
    safetyAssessment?: SafetyAssessment;
    dryRunOutput?: Record<string, unknown>;
    summary: string;
  };
}

export interface ExecuteResult {
  status: "executed" | "not_found" | "expired" | "error";
  result?: Record<string, unknown>;
  error?: string;
}

export async function createPreview(options: {
  tool: string;
  params: Record<string, unknown>;
  agcliArgs: string[];
  safetyNetuid?: number;
  safetyAmount?: number;
  dryRunArgs?: string[];
}): Promise<PreviewResult> {
  let safetyAssessment: SafetyAssessment | undefined;
  const summaryParts: string[] = [];

  if (options.safetyNetuid !== undefined && options.safetyAmount !== undefined) {
    safetyAssessment = await assessStakingSafety(
      options.safetyNetuid,
      options.safetyAmount,
    );

    if (safetyAssessment.verdict === "blocked") {
      return {
        operationId: "",
        status: "blocked",
        preview: {
          tool: options.tool,
          params: options.params,
          safetyAssessment,
          summary: safetyAssessment.summary,
        },
      };
    }

    summaryParts.push(safetyAssessment.summary);
  }

  let dryRunOutput: Record<string, unknown> | undefined;
  if (options.dryRunArgs) {
    try {
      dryRunOutput = await executeAgcli<Record<string, unknown>>(
        options.dryRunArgs,
      );
      summaryParts.push("Dry-run preview generated successfully.");
    } catch {
      summaryParts.push("Dry-run preview not available.");
    }
  }

  if (summaryParts.length === 0) {
    summaryParts.push(`Ready to execute ${options.tool}.`);
  }

  const operationId = pendingStore.createPending({
    tool: options.tool,
    params: options.params,
    agcliCommand: options.agcliArgs,
    safetyAssessment,
    preview: {
      dryRunOutput: dryRunOutput ?? null,
      safetyAssessment: safetyAssessment ?? null,
    },
  });

  return {
    operationId,
    status: "preview",
    preview: {
      tool: options.tool,
      params: options.params,
      safetyAssessment,
      dryRunOutput,
      summary: summaryParts.join("\n"),
    },
  };
}

export async function executeConfirmed(
  operationId: string,
): Promise<ExecuteResult> {
  const op = pendingStore.getPending(operationId);
  if (!op) {
    return {
      status: "not_found",
      error:
        "Operation not found or expired. Create a new preview before confirming.",
    };
  }

  const available = await isAgcliAvailable();
  if (!available) {
    pendingStore.removePending(operationId);
    return {
      status: "error",
      error: new AgcliNotInstalledError().message,
    };
  }

  if (!isWalletPasswordConfigured()) {
    return {
      status: "error",
      error:
        "Wallet password not configured. Set the AGCLI_PASSWORD environment variable.",
    };
  }

  const password = process.env.AGCLI_PASSWORD ?? "";
  const fullArgs = [
    ...op.agcliCommand,
    "--yes",
    "--password",
    password,
  ];

  try {
    const result = await executeAgcli<Record<string, unknown>>(fullArgs);
    pendingStore.removePending(operationId);
    return { status: "executed", result };
  } catch (err) {
    pendingStore.removePending(operationId);
    const msg = err instanceof Error ? err.message : "Execution failed.";
    return { status: "error", error: msg };
  }
}
