import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  getSwapSimulation,
  AgcliNotInstalledError,
  AgcliExecutionError,
} from "../backends/agcli.js";

function errorResult(msg: string) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify({ error: msg }) }],
    isError: true,
  };
}

export function registerSwapTools(server: McpServer): void {
  server.registerTool(
    "tao_swap_simulate",
    {
      description:
        "Simulate a TAO-to-alpha or alpha-to-TAO swap for a subnet without executing it. Shows estimated output amount and estimated slippage. Example queries: 'what would I get for 10 TAO on SN18', 'simulate swapping 500 alpha on subnet 1', 'how much slippage for 5 TAO on SN18'",
      inputSchema: {
        netuid: z
          .number()
          .int()
          .nonnegative()
          .describe("Subnet ID to simulate the swap for"),
        tao: z
          .number()
          .positive()
          .optional()
          .describe(
            "Amount of TAO to simulate swapping for alpha. Provide either tao or alpha, not both",
          ),
        alpha: z
          .number()
          .positive()
          .optional()
          .describe(
            "Amount of alpha to simulate swapping for TAO. Provide either tao or alpha, not both",
          ),
      },
    },
    async ({ netuid, tao, alpha }) => {
      if (tao !== undefined && alpha !== undefined) {
        return errorResult(
          "Provide either tao or alpha amount, not both. Choose which direction to simulate.",
        );
      }
      if (tao === undefined && alpha === undefined) {
        return errorResult(
          "Provide a tao or alpha amount to simulate the swap.",
        );
      }

      try {
        const sim = await getSwapSimulation(netuid, tao, alpha);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                netuid,
                direction: sim.direction,
                estimated_amount_in: sim.amount_in,
                estimated_amount_out: sim.amount_out,
                estimated_current_price: sim.current_price,
                estimated_effective_price: sim.effective_price,
                estimated_tao_fee: sim.tao_fee,
                estimated_alpha_fee: sim.alpha_fee,
                note: "All values are estimates. Actual amounts may differ due to pool changes between simulation and execution.",
              }),
            },
          ],
        };
      } catch (err) {
        if (err instanceof AgcliNotInstalledError) return errorResult(err.message);
        if (err instanceof AgcliExecutionError) return errorResult(err.message);
        return errorResult("An unexpected error occurred. Try again in a moment.");
      }
    },
  );
}
