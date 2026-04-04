import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { taoswap, TaoSwapApiError } from "../backends/taoswap.js";

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

export function registerPortfolioTools(server: McpServer): void {
  server.registerTool(
    "tao_portfolio_balance",
    {
      description:
        "Get daily balance history for a Bittensor wallet address. Shows how your total TAO-equivalent value has changed over time. Example queries: 'show my balance history', 'portfolio over last year', 'how has my balance changed'",
      inputSchema: {
        account: z
          .string()
          .describe("SS58 coldkey address to check portfolio for"),
        days: z
          .number()
          .optional()
          .describe("Number of days of history. Defaults to 30"),
      },
    },
    async ({ account, days }) => {
      try {
        const data = await taoswap.getPortfolioBalance(account, days ?? 30);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                account,
                days_requested: days ?? 30,
                data_points: data.results.length,
                history: data.results,
              }),
            },
          ],
        };
      } catch (err) {
        return handleApiError(err);
      }
    },
  );

  server.registerTool(
    "tao_portfolio_apy",
    {
      description:
        "Get estimated APY breakdown across all staked subnets for a wallet address. Shows estimated returns by subnet. Example queries: 'what is my APY', 'show my estimated returns by subnet', 'which subnets give best estimated APY'",
      inputSchema: {
        account: z
          .string()
          .describe("SS58 coldkey address to check APY for"),
      },
    },
    async ({ account }) => {
      try {
        const data = await taoswap.getPortfolioApy(account);
        const r = data.results;
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                account: r.account,
                updated_at: r.updated_at,
                note: "All APY values are estimated based on recent performance and may vary.",
                estimated_global_apy: r.global,
                estimated_free_apy: r.free,
                estimated_staked_tao_apy: r.staked_tao,
                estimated_staked_alpha_apy: r.staked_alpha,
              }),
            },
          ],
        };
      } catch (err) {
        return handleApiError(err);
      }
    },
  );

  server.registerTool(
    "tao_account_transactions",
    {
      description:
        "Get recent transaction history for a wallet address. Shows stakes, transfers, and other chain activity. Example queries: 'show my recent transactions', 'what has this address done', 'transaction history for 5Gx...'",
      inputSchema: {
        account: z
          .string()
          .describe("SS58 coldkey address to get transactions for"),
        limit: z
          .number()
          .optional()
          .describe(
            "Maximum number of transactions to return. Defaults to 50",
          ),
        offset: z
          .number()
          .optional()
          .describe("Offset for pagination"),
      },
    },
    async ({ account, limit, offset }) => {
      try {
        const data = await taoswap.getAccountTransactions(
          account,
          limit ?? 50,
          offset ?? 0,
        );
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                account,
                stake_transfers: data.stake_transfers,
                transfers: data.transfers,
              }),
            },
          ],
        };
      } catch (err) {
        return handleApiError(err);
      }
    },
  );

  server.registerTool(
    "tao_idle_stakes",
    {
      description:
        "Check for idle or non-earning stakes. Identifies positions that have not received rewards recently. Example queries: 'are any of my stakes idle', 'check for idle stakes', 'which stakes are not earning'",
      inputSchema: {
        account: z
          .string()
          .optional()
          .describe(
            "SS58 coldkey address to check. Omit to see all idle stakes on the network",
          ),
      },
    },
    async ({ account }) => {
      try {
        if (account) {
          const data = await taoswap.getIdleStakeLookup(account);
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  coldkey: data.coldkey,
                  total_idle_alpha_tao: data.total_idle_alpha_tao,
                  estimated_daily_loss_tao:
                    data.total_estimated_daily_loss_tao,
                  delegations: data.delegations,
                }),
              },
            ],
          };
        }

        const data = await taoswap.getIdleStakes();
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                total_idle_alpha_tao: data.total_idle_alpha_tao,
                estimated_daily_loss_tao:
                  data.total_estimated_daily_loss_tao,
                total_delegators_affected: data.total_delegators_affected,
                subnets: data.subnets,
              }),
            },
          ],
        };
      } catch (err) {
        return handleApiError(err);
      }
    },
  );
}
