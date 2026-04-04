import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  getBalance,
  AgcliNotInstalledError,
  AgcliExecutionError,
} from "../backends/agcli.js";

function errorResult(msg: string) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify({ error: msg }) }],
    isError: true,
  };
}

export function registerBalanceTools(server: McpServer): void {
  server.registerTool(
    "tao_balance",
    {
      description:
        "Check TAO balance for a Bittensor address directly from the chain. Returns the current balance in TAO. Example queries: 'check my balance', 'how much TAO does 5Gx... have', 'what is the balance of this address'",
      inputSchema: {
        address: z
          .string()
          .optional()
          .describe(
            "SS58 address to check balance for. Uses default wallet if not provided",
          ),
      },
    },
    async ({ address }) => {
      if (!address) {
        return errorResult(
          "No address provided. Provide an SS58 address or use tao_wallet_list to see your wallets.",
        );
      }
      try {
        const result = await getBalance(address);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                address: result.address,
                balance_tao: result.balance_tao,
                balance_rao: result.balance_rao,
              }),
            },
          ],
        };
      } catch (err) {
        if (err instanceof AgcliNotInstalledError) {
          return errorResult(err.message);
        }
        if (err instanceof AgcliExecutionError) {
          return errorResult(err.message);
        }
        return errorResult(
          "An unexpected error occurred. Try again in a moment.",
        );
      }
    },
  );
}
