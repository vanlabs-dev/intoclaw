import { describe, it, expect } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { registerTools } from "../../src/server.js";

describe("tao_ping", () => {
  it("returns ok status", async () => {
    const server = new McpServer({ name: "test", version: "0.0.0" });
    registerTools(server);

    const client = new Client({ name: "test-client", version: "0.0.0" });
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();

    await Promise.all([
      server.connect(serverTransport),
      client.connect(clientTransport),
    ]);

    const result = await client.callTool({ name: "tao_ping" });
    const parsed = JSON.parse(
      (result.content as Array<{ type: string; text: string }>)[0].text,
    );

    expect(parsed.status).toBe("ok");
    expect(parsed.message).toBe("IntoClaw v2 is running");

    await client.close();
    await server.close();
  });
});
