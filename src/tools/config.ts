import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  getConfigAll,
  setConfig,
  AgcliNotInstalledError,
  AgcliExecutionError,
} from "../backends/agcli.js";

function errorResult(msg: string) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify({ error: msg }) }],
    isError: true,
  };
}

export function registerConfigTools(server: McpServer): void {
  server.registerTool(
    "tao_config",
    {
      description:
        "View or update IntoClaw and agcli configuration. Can check spending limits, network settings, and wallet defaults. Example queries: 'show my config', 'set spending limit to 50 TAO', 'what are my spending limits'",
      inputSchema: {
        key: z
          .string()
          .optional()
          .describe(
            "Configuration key to get or set. For spending limits use: spending_limit (global) or spending_limit.18 (per-subnet)",
          ),
        value: z
          .string()
          .optional()
          .describe("Value to set. Omit to read the current value"),
      },
    },
    async ({ key, value }) => {
      try {
        if (key && value !== undefined) {
          const result = await setConfig(key, value);
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  action: "set",
                  key,
                  value,
                  result,
                }),
              },
            ],
          };
        }

        const config = await getConfigAll();
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ config }),
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
