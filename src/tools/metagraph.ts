import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { taoswap, TaoSwapApiError } from "../backends/taoswap.js";
import type { TaoSwapMetagraphNeuron } from "../types/taoswap.js";

function formatNeuron(n: TaoSwapMetagraphNeuron) {
  return {
    uid: n.uid,
    hotkey: n.hotkey,
    coldkey: n.coldkey,
    type: n.type,
    status: n.status,
    stake: n.stake,
    vtrust: n.vtrust,
    consensus: n.consensus,
    incentive: n.incentive,
    dividends: n.dividends,
    emission: n.emission,
    daily_rewards: n.daily_rewards,
    is_validator: n.is_validator,
    delegate_take: n.delegate_take,
    updated_at_block: n.updated_at_block,
  };
}

function errorResult(msg: string) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify({ error: msg }) }],
    isError: true,
  };
}

function handleApiError(err: unknown) {
  if (err instanceof TaoSwapApiError) {
    return errorResult(err.message);
  }
  return errorResult(
    "An unexpected error occurred. Try again in a moment.",
  );
}

export function registerMetagraphTools(server: McpServer): void {
  server.registerTool(
    "tao_metagraph",
    {
      description:
        "Get the full metagraph for a Bittensor subnet showing all registered neurons. Returns UIDs with their stakes, trust scores, consensus weights, and emission shares. Example queries: 'show metagraph for subnet 1', 'who mines on SN18', 'subnet 50 neurons'",
      inputSchema: {
        netuid: z
          .number()
          .describe("The subnet ID to get the metagraph for"),
      },
    },
    async ({ netuid }) => {
      try {
        const meta = await taoswap.getMetagraph(netuid);
        const result = {
          netuid: meta.subnet.id,
          subnet_name: meta.subnet.name,
          symbol: meta.subnet.symbol,
          alpha_price_tao: meta.subnet.price,
          neuron_count: meta.count,
          neurons: meta.neurons.map(formatNeuron),
        };
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(result) },
          ],
        };
      } catch (err) {
        return handleApiError(err);
      }
    },
  );
}
