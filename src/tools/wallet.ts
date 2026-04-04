import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  listWallets,
  AgcliNotInstalledError,
  AgcliExecutionError,
} from "../backends/agcli.js";

function errorResult(msg: string) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify({ error: msg }) }],
    isError: true,
  };
}

export function registerWalletTools(server: McpServer): void {
  server.registerTool(
    "tao_wallet_list",
    {
      description:
        "List all Bittensor wallets configured on this server. Shows wallet names and their coldkey addresses. Example queries: 'show my wallets', 'what wallets do I have', 'list wallets'",
    },
    async () => {
      try {
        const wallets = await listWallets();
        if (Array.isArray(wallets) && wallets.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  wallets: [],
                  message:
                    "No wallets found on this machine. Create one with agcli or btcli.",
                }),
              },
            ],
          };
        }
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ wallets }),
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
