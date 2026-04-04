import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { executeConfirmed } from "../lib/confirmation.js";

function errorResult(msg: string) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify({ error: msg }) }],
    isError: true,
  };
}

export function registerConfirmTools(server: McpServer): void {
  server.registerTool(
    "tao_confirm",
    {
      description:
        "Confirm and execute a previously previewed operation. Every write operation (stake, transfer, wallet create) first returns a preview with an operation_id. Pass that operation_id here to execute. Example queries: 'confirm operation abc123', 'yes proceed', 'execute that'",
      inputSchema: {
        operation_id: z
          .string()
          .describe(
            "The operation_id returned from the preview step",
          ),
      },
    },
    async ({ operation_id }) => {
      const result = await executeConfirmed(operation_id);

      if (result.status === "not_found") {
        return errorResult(
          "Operation not found. It may have expired (operations expire after 5 minutes) or already been executed. Please start the operation again.",
        );
      }

      if (result.status === "error") {
        return errorResult(
          result.error ?? "Execution failed. Try the operation again.",
        );
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              status: "executed",
              result: result.result,
            }),
          },
        ],
      };
    },
  );
}
