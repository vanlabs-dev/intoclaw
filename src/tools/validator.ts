import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { taoswap, TaoSwapApiError } from "../backends/taoswap.js";
import type {
  TaoSwapValidator,
  TaoSwapValidatorDetail,
} from "../types/taoswap.js";

function formatValidatorSummary(v: TaoSwapValidator) {
  return {
    coldkey: v.validator_coldkey,
    hotkey: v.validator_hotkey,
    name: v.identity?.name ?? null,
    description: v.identity?.description ?? null,
    take_pct: v.take,
    apy_7d: v.apy_7d,
    total_stake_tao: parseFloat(v.total_stake),
    root_stake_tao: parseFloat(v.total_stake_root),
    alpha_stake_tao: parseFloat(v.total_stake_alpha),
    dominance_pct: parseFloat(v.dominance),
    delegator_count: v.count_delegators,
  };
}

function formatValidatorDetail(v: TaoSwapValidatorDetail) {
  return {
    coldkey: v.validator_coldkey,
    hotkey: v.validator_hotkey,
    name: v.identity?.name ?? null,
    description: v.identity?.description ?? null,
    website: v.identity?.url ?? null,
    github: v.identity?.github ?? null,
    discord: v.identity?.discord ?? null,
    take_pct: v.take,
    apy_7d: v.apy_7d,
    total_stake_tao: parseFloat(v.total_stake),
    root_stake_tao: parseFloat(v.total_stake_root),
    alpha_stake_tao: parseFloat(v.total_stake_alpha),
    dominance_pct: parseFloat(v.dominance),
    delegator_count: v.count_delegators,
    delegator_daily_earning: v.delegator_daily_earning,
    validator_daily_earning: v.validator_daily_earning,
    subnet_stakes: v.stakes.map((s) => ({
      subnet_id: s.subnet_id,
      subnet_name: s.subnet_name,
      stake_tao: s.stake,
      pct_of_total: s.percent,
    })),
    monitoring: v.monitoring.slice(0, 50).map((m) => ({
      subnet_id: m.subnet_id,
      subnet_name: m.subnet_name,
      uid: m.uid,
      stake: m.stake,
      vtrust: m.vtrust,
      emission: m.emission,
      health: m.health,
    })),
  };
}

function errorResult(msg: string) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify({ error: msg }) }],
    isError: true,
  };
}

function handleApiError(err: unknown) {
  if (err instanceof TaoSwapApiError) {
    return errorResult(err.message);
  }
  return errorResult(
    "An unexpected error occurred. Try again in a moment.",
  );
}

export function registerValidatorTools(server: McpServer): void {
  server.registerTool(
    "tao_validator_list",
    {
      description:
        "List all Bittensor validators with their stake, delegator count, and take rate. Example queries: 'show validators', 'list all validators', 'who are the validators'",
    },
    async () => {
      try {
        const validators = await taoswap.getValidators();
        const formatted = validators.map(formatValidatorSummary);
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(formatted) },
          ],
        };
      } catch (err) {
        return handleApiError(err);
      }
    },
  );

  server.registerTool(
    "tao_validator_info",
    {
      description:
        "Get detailed information and stake history for a specific validator. Example queries: 'tell me about validator 5Gx...', 'validator details for this address', 'how has this validator performed'",
      inputSchema: {
        id: z
          .string()
          .describe(
            "Validator identifier (coldkey address, e.g. 5Gsb...)",
          ),
        days: z
          .number()
          .optional()
          .describe(
            "Number of days of history to include. Defaults to 30",
          ),
      },
    },
    async ({ id, days }) => {
      try {
        const [detail, history] = await Promise.all([
          taoswap.getValidator(id),
          taoswap.getValidatorHistory(id, days ?? 30),
        ]);
        const formatted = formatValidatorDetail(detail);
        const result = {
          ...formatted,
          history: {
            days_requested: days ?? 30,
            data_points: history.count,
            data: history.results,
          },
        };
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(result) },
          ],
        };
      } catch (err) {
        return handleApiError(err);
      }
    },
  );
}
