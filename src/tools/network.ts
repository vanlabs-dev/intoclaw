import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { taoswap, TaoSwapApiError } from "../backends/taoswap.js";
import type {
  TaoSwapHomeStats,
  TaoSwapHalvingState,
} from "../types/taoswap.js";

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

      const result: Record<string, unknown> = {};

      if (stats) {
        result.apy_root_pct = stats.apy_root;
        result.apy_best_subnet_pct = stats.apy_best_subnet;
        result.best_subnet = stats.best_subnet_name;
        result.validator_dominance = stats.dominance;
        result.fees = stats.fees;
      }

      result.halving = {
        last_halving: "December 5, 2025",
        last_halving_effect: "Daily emissions reduced from 7,200 to 3,600 TAO",
        next_halving: "Approximately December 2029",
        total_issuance: halving?.at_issuance ?? null,
      };

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
