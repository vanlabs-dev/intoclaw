import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  listWallets,
  buildWalletCreateArgs,
  isAgcliAvailable,
  AgcliNotInstalledError,
  AgcliExecutionError,
} from "../backends/agcli.js";
import { createPreview } from "../lib/confirmation.js";

const HOSTED_PLATFORM_WARNING =
  "WARNING: Your recovery phrase will exist only on this server instance. " +
  "If this instance is reset, deleted, or migrated, your wallet and any TAO in it will be permanently lost. " +
  "Before sending any TAO to this wallet, make sure you can access and securely back up your recovery phrase. " +
  "If you cannot access the server filesystem, consider creating a wallet through TaoSwap.org or a dedicated wallet application.";

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
        if (err instanceof AgcliNotInstalledError) return errorResult(err.message);
        if (err instanceof AgcliExecutionError) return errorResult(err.message);
        return errorResult("An unexpected error occurred. Try again in a moment.");
      }
    },
  );

  server.registerTool(
    "tao_wallet_create",
    {
      description:
        "Create a new Bittensor wallet with coldkey and hotkey. Returns a preview with important warnings about recovery phrase security that must be acknowledged before creation. Example queries: 'create a wallet', 'set up a new Bittensor wallet'",
      inputSchema: {
        name: z.string().describe("Name for the new wallet"),
      },
    },
    async ({ name }) => {
      try {
        if (!(await isAgcliAvailable())) {
          return errorResult(new AgcliNotInstalledError().message);
        }
        const agcliArgs = buildWalletCreateArgs(name);
        const result = await createPreview({
          tool: "tao_wallet_create",
          params: { name },
          agcliArgs,
        });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                status: "preview",
                needs_confirmation: true,
                operation_id: result.operationId,
                wallet_name: name,
                warning: HOSTED_PLATFORM_WARNING,
                message:
                  "Confirm to create the wallet. By confirming, you acknowledge the warning above.",
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
