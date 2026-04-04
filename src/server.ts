import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerSubnetTools } from "./tools/subnet.js";

export function registerTools(server: McpServer): void {
  registerSubnetTools(server);
}
