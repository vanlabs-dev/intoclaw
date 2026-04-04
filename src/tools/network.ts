import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { taoswap, TaoSwapApiError } from "../backends/taoswap.js";
import type {
  TaoSwapHomeStats,
  TaoSwapHalvingState,
} from "../types/taoswap.js";

function errorResult(msg: string) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify({ error: msg }) }],
    isError: true,
  };
}

export function registerNetworkTools(server: McpServer): void {
  server.registerTool(
    "tao_network_stats",
    {
      description:
        "Get Bittensor network overview including total stake, delegator stats, APY, and halving status. Example queries: 'Bittensor network stats', 'how many subnets are there', 'when is the halving', 'total TAO staked'",
    },
    async () => {
      let stats: TaoSwapHomeStats | null = null;
      let halving: TaoSwapHalvingState | null = null;
      const errors: string[] = [];

      const results = await Promise.allSettled([
        taoswap.getHomeStats(),
        taoswap.getHalving(),
      ]);

      if (results[0].status === "fulfilled") {
        stats = results[0].value;
      } else {
        const err = results[0].reason;
        errors.push(
          err instanceof TaoSwapApiError
            ? err.message
            : "Failed to fetch network stats.",
        );
      }

      if (results[1].status === "fulfilled") {
        halving = results[1].value;
      } else {
        const err = results[1].reason;
        errors.push(
          err instanceof TaoSwapApiError
            ? err.message
            : "Failed to fetch halving data.",
        );
      }

      if (!stats && !halving) {
        return errorResult(
          errors.join(" ") +
            " Both network stats and halving data are unavailable. Try again later.",
        );
      }

      const result: Record<string, unknown> = {};

      if (stats) {
        result.total_stake_tao = stats.total_stake;
        result.root_stake_tao = stats.total_stake_root;
        result.alpha_stake_tao = stats.total_stake_alpha;
        result.apy_root_pct = stats.apy_root;
        result.apy_best_subnet_pct = stats.apy_best_subnet;
        result.best_subnet = stats.best_subnet_name;
        result.total_delegators = stats.count_delegators;
        result.validator_dominance = stats.dominance;
        result.fees = stats.fees;
      }

      if (halving) {
        result.halving = {
          id: halving.id,
          at_issuance: halving.at_issuance,
          at_block: halving.at_block,
          estimated_time: halving.time_remaining,
        };
      }

      if (errors.length > 0) {
        result.warnings = errors;
      }

      return {
        content: [
          { type: "text" as const, text: JSON.stringify(result) },
        ],
      };
    },
  );
}
