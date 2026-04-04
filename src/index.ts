#!/usr/bin/env node
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerTools } from "./server.js";

console.error(
  `Desearch: ${process.env.DESEARCH_API_KEY ? "configured" : "not configured"}`,
);

const server = new McpServer({
  name: "intoclaw",
  version: "0.1.0",
});

registerTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
