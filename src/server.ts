import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerTools(server: McpServer): void {
  server.registerTool("tao_ping", { description: "Check if IntoClaw is running" }, async () => {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            status: "ok",
            message: "IntoClaw v2 is running",
          }),
        },
      ],
    };
  });
}
