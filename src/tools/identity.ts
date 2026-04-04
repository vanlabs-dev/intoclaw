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

export function registerIdentityTools(server: McpServer): void {
  server.registerTool(
    "tao_identity",
    {
      description:
        "Look up on-chain identity for a Bittensor address, or list all registered identities. Returns name, website, github, and description when available. Example queries: 'who owns this address', 'show identities', 'look up 5Gx...'",
      inputSchema: {
        address: z
          .string()
          .optional()
          .describe(
            "SS58 address to look up. Omit to list all identities",
          ),
      },
    },
    async ({ address }) => {
      try {
        const data = await taoswap.getIdentities();
        const identities = data.results;

        if (address) {
          const resolved = data.access_map[address] ?? address;
          const identity = identities[resolved];
          if (!identity) {
            return errorResult(
              `No on-chain identity found for ${address}. This address may not have registered an identity.`,
            );
          }
          return {
            content: [
              { type: "text" as const, text: JSON.stringify(identity) },
            ],
          };
        }

        const all = Object.values(identities).filter(
          (id) => id.name && id.name !== "-",
        );
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                count: all.length,
                identities: all,
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
