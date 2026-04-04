#!/usr/bin/env node
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerTools } from "./server.js";
import { isAgcliAvailable, getAgcliVersion, isWalletPasswordConfigured } from "./backends/agcli.js";
import { isDesearchAvailable } from "./backends/desearch.js";

const VERSION = "0.1.0";

async function logStartup(): Promise<void> {
  const log = (msg: string) => console.error(`[intoclaw] ${msg}`);

  log(`starting v${VERSION}`);

  let taoswapStatus = "available (https://api.taoswap.org)";
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await globalThis.fetch("https://api.taoswap.org/home-stats/", {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) taoswapStatus = "unreachable";
  } catch {
    taoswapStatus = "unreachable";
  }
  log(`TaoSwap API: ${taoswapStatus}`);

  const agcliAvailable = await isAgcliAvailable();
  if (agcliAvailable) {
    const version = await getAgcliVersion();
    log(`agcli: installed (${version ?? "unknown version"})`);
    log(`agcli wallet: ${isWalletPasswordConfigured() ? "configured" : "not configured"}`);
  } else {
    log("agcli: not installed");
    log("agcli wallet: n/a (agcli not installed)");
  }

  log(`Desearch: ${isDesearchAvailable() ? "configured" : "not configured"}`);
  log("tools: 31 registered (17 read, 8 chain, 4 portfolio, 2 search, 1 education, tao_confirm)");
  log("ready");
}

await logStartup();

const server = new McpServer({
  name: "intoclaw",
  version: VERSION,
});

registerTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
