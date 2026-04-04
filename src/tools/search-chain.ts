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

export function registerSearchTools(server: McpServer): void {
  server.registerTool(
    "tao_search",
    {
      description:
        "Search across the Bittensor network for addresses, subnets, validators, or identities. Example queries: 'search for Opentensor', 'find address 5Gx...', 'search cortex'",
      inputSchema: {
        query: z
          .string()
          .describe(
            "Search term: an address, subnet name, validator name, or keyword",
          ),
      },
    },
    async ({ query }) => {
      try {
        const data = await taoswap.search(query);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                query,
                count: data.count,
                results: data.results,
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
