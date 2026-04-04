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

export function registerEventTools(server: McpServer): void {
  server.registerTool(
    "tao_events",
    {
      description:
        "Query Bittensor chain events filtered by block number, section, or method. Shows staking events, transfers, registrations, and other on-chain activity. Example queries: 'recent staking events', 'what happened at block 7531566', 'show SubtensorModule events'",
      inputSchema: {
        block: z
          .number()
          .optional()
          .describe("Specific block number to query events from"),
        section: z
          .string()
          .optional()
          .describe(
            "Pallet/section to filter by, e.g. SubtensorModule, Balances",
          ),
        method: z
          .string()
          .optional()
          .describe(
            "Event method to filter by, e.g. StakeAdded, Transfer",
          ),
        from_block: z
          .number()
          .optional()
          .describe("Start of block range"),
        to_block: z
          .number()
          .optional()
          .describe("End of block range"),
      },
    },
    async ({ block, section, method, from_block, to_block }) => {
      try {
        const data = await taoswap.getEvents({
          block,
          section,
          method,
          from_block,
          to_block,
        });
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                count: data.results.length,
                pagination: data.pagination,
                events: data.results,
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
    "tao_extrinsics",
    {
      description:
        "Query Bittensor chain transactions (extrinsics) filtered by signer, module, category, or subnet. Categories include staking, transfers, and other. Example queries: 'show staking transactions for 5Gx...', 'recent transfers on SN1', 'extrinsics by this address'",
      inputSchema: {
        signer: z
          .string()
          .optional()
          .describe("SS58 address of the transaction signer"),
        module: z
          .string()
          .optional()
          .describe("Pallet module, e.g. SubtensorModule"),
        category: z
          .string()
          .optional()
          .describe(
            "Transaction category: staking, transfers, or other",
          ),
        netuid: z
          .number()
          .optional()
          .describe("Filter by subnet ID"),
        page: z.number().optional().describe("Page number for pagination"),
        page_size: z
          .number()
          .optional()
          .describe("Results per page, default 50"),
      },
    },
    async ({ signer, module, category, netuid, page, page_size }) => {
      try {
        const data = await taoswap.getExtrinsics({
          signer,
          module,
          category,
          netuid,
          page,
          page_size,
        });
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                count: data.results.length,
                pagination: data.pagination,
                extrinsics: data.results,
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
