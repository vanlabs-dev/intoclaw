import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerSubnetTools } from "./tools/subnet.js";
import { registerMetagraphTools } from "./tools/metagraph.js";
import { registerValidatorTools } from "./tools/validator.js";
import { registerPriceTools } from "./tools/price.js";
import { registerNetworkTools } from "./tools/network.js";

export function registerTools(server: McpServer): void {
  registerSubnetTools(server);
  registerMetagraphTools(server);
  registerValidatorTools(server);
  registerPriceTools(server);
  registerNetworkTools(server);
}
