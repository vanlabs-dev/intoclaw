import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { taoswap, TaoSwapApiError } from "../backends/taoswap.js";
import type { TaoSwapSubnet, TaoSwapSubnetDetail } from "../types/taoswap.js";
import { getIntoTaoSubnetUrl, getTaoSwapUrl } from "../lib/links.js";

function formatPrice(price: number): string {
  if (price < 1) return price.toFixed(5);
  return price.toFixed(2);
}

function formatSubnetSummary(s: TaoSwapSubnet) {
  return {
    netuid: s.id,
    name: s.name,
    symbol: s.symbol,
    alpha_price_tao: formatPrice(s.price),
    price_change_24h_pct: s.price_evolution_h_24,
    price_change_7d_pct: s.price_evolution_d_7,
    market_cap_tao: Math.round(s.market_cap),
    emission_pct: s.emission_percent,
    emission_ema_pct: s.emission_ema_percent,
    root_in_pool: s.root_in_pool ? Math.round(s.root_in_pool) : null,
    active_miners: s.active_miners,
    holders_count: s.holders_count,
    registration_cost_tao: formatPrice(s.registration_cost),
  };
}

function formatSubnetDetail(s: TaoSwapSubnetDetail) {
  return {
    netuid: s.id,
    name: s.name,
    symbol: s.symbol,
    owner: s.owner,
    description: s.identity?.description ?? null,
    website: s.identity?.url ?? null,
    github: s.identity?.github ?? null,
    discord: s.identity?.discord ?? null,
    alpha_price_tao: formatPrice(s.price),
    moving_price_tao: formatPrice(s.moving_price),
    price_change_1h_pct: s.price_evolution_h_1,
    price_change_24h_pct: s.price_evolution_h_24,
    price_change_7d_pct: s.price_evolution_d_7,
    price_change_30d_pct: s.price_evolution_d_30,
    price_change_90d_pct: s.price_evolution_d_90,
    market_cap_tao: Math.round(s.market_cap),
    total_supply: Math.round(s.total_supply),
    emission_pct: s.emission_percent,
    emission_ema_pct: s.emission_ema_percent,
    chain_buys: s.emission_chain_buys,
    chain_buys_pct: s.emission_chain_buys_percent,
    emission_miner_burn_pct: s.emission_miner_burn,
    tao_in_emission: s.tao_in_emission,
    alpha_in_emission: s.alpha_in_emission,
    alpha_out_emission: s.alpha_out_emission,
    inflow: s.inflow,
    outflow: s.outflow,
    root_in_pool: s.root_in_pool ? Math.round(s.root_in_pool) : null,
    alpha_in_pool: s.alpha_in_pool ? Math.round(s.alpha_in_pool) : null,
    alpha_stake: Math.round(s.alpha_stake),
    active_miners: s.active_miners,
    total_neurons: s.neurons?.length ?? null,
    holders_count: s.holders_count,
    tempo: s.tempo,
    registration_cost_tao: formatPrice(s.registration_cost),
    registration_allowed: s.hyperparameters?.registration_allowed ?? null,
    max_validators: s.hyperparameters?.max_validators ?? null,
    max_neurons: s.hyperparameters?.max_n ?? null,
    links: {
      intotao: getIntoTaoSubnetUrl(s.id, s.name),
      taoswap: getTaoSwapUrl(),
    },
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

export function registerSubnetTools(server: McpServer): void {
  server.registerTool(
    "tao_subnet_list",
    {
      description:
        "List all Bittensor subnets with current metrics. Returns subnet ID, name, alpha price, emission share, pool depth, miner count, and holder count. Example queries: 'show me all subnets', 'list subnets', 'what subnets exist'",
    },
    async () => {
      try {
        const subnets = await taoswap.getSubnets();
        const formatted = subnets.map(formatSubnetSummary);
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(formatted) },
          ],
        };
      } catch (err) {
        return handleApiError(err);
      }
    },
  );

  server.registerTool(
    "tao_subnet_info",
    {
      description:
        "Get detailed information about a specific Bittensor subnet. Returns full metrics, owner, identity info, links, and pricing data. Example queries: 'tell me about subnet 18', 'what is SN1', 'subnet 18 details'",
      inputSchema: {
        netuid: z
          .number()
          .describe("The subnet ID (netuid) to look up, e.g. 1, 18, 50"),
      },
    },
    async ({ netuid }) => {
      try {
        const subnet = await taoswap.getSubnet(netuid);
        const formatted = formatSubnetDetail(subnet);
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(formatted) },
          ],
        };
      } catch (err) {
        return handleApiError(err);
      }
    },
  );

  server.registerTool(
    "tao_subnet_history",
    {
      description:
        "Get daily historical stats for a subnet over time. Returns emission, miner count, holder count, and other metrics per day. Example queries: 'how has subnet 18 performed', 'SN3 history last 30 days', 'subnet 1 trend'",
      inputSchema: {
        netuid: z
          .number()
          .describe("The subnet ID to get history for"),
        days: z
          .number()
          .optional()
          .describe(
            "Number of days of history to fetch. Defaults to 30 if not specified",
          ),
      },
    },
    async ({ netuid, days }) => {
      try {
        const history = await taoswap.getSubnetHistory(netuid, days ?? 30);
        const result = {
          netuid: history.netuid,
          days_requested: days ?? 30,
          data_points: history.count,
          history: history.results,
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
