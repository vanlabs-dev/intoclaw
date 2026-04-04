import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerSubnetTools } from "./tools/subnet.js";
import { registerMetagraphTools } from "./tools/metagraph.js";
import { registerValidatorTools } from "./tools/validator.js";
import { registerPriceTools } from "./tools/price.js";
import { registerNetworkTools } from "./tools/network.js";
import { registerIdentityTools } from "./tools/identity.js";
import { registerEventTools } from "./tools/events.js";
import { registerSearchTools } from "./tools/search-chain.js";
import { registerPortfolioTools } from "./tools/portfolio.js";
import { registerLearnTools } from "./tools/learn.js";

export function registerTools(server: McpServer): void {
  registerSubnetTools(server);
  registerMetagraphTools(server);
  registerValidatorTools(server);
  registerPriceTools(server);
  registerNetworkTools(server);
  registerIdentityTools(server);
  registerEventTools(server);
  registerSearchTools(server);
  registerPortfolioTools(server);
  registerLearnTools(server);
}
