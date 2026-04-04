import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  buildTransferArgs,
  isAgcliAvailable,
  AgcliNotInstalledError,
  AgcliExecutionError,
} from "../backends/agcli.js";
import { createPreview } from "../lib/confirmation.js";

function errorResult(msg: string) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify({ error: msg }) }],
    isError: true,
  };
}

export function registerTransferTools(server: McpServer): void {
  server.registerTool(
    "tao_transfer",
    {
      description:
        "Send TAO to another Bittensor address. Returns a preview that must be confirmed before execution. Example queries: 'send 5 TAO to 5FHn...', 'transfer 10 TAO to this address'",
      inputSchema: {
        dest: z.string().describe("Destination SS58 address"),
        amount: z.number().positive().describe("Amount of TAO to send"),
      },
    },
    async ({ dest, amount }) => {
      try {
        const agcliArgs = buildTransferArgs(dest, amount);
        if (!(await isAgcliAvailable())) {
          return errorResult(new AgcliNotInstalledError().message);
        }
        const result = await createPreview({
          tool: "tao_transfer",
          params: { dest, amount },
          agcliArgs,
          dryRunArgs: ["--dry-run", ...agcliArgs],
        });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                status: "preview",
                needs_confirmation: true,
                operation_id: result.operationId,
                summary: result.preview.summary,
                dry_run: result.preview.dryRunOutput ?? null,
                message: "Confirm this operation to proceed.",
              }),
            },
          ],
        };
      } catch (err) {
        if (err instanceof AgcliNotInstalledError) return errorResult(err.message);
        if (err instanceof AgcliExecutionError) return errorResult(err.message);
        if (err instanceof Error) return errorResult(err.message);
        return errorResult("An unexpected error occurred. Try again in a moment.");
      }
    },
  );
}
