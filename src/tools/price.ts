import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { taoswap, TaoSwapApiError } from "../backends/taoswap.js";

function formatPrice(price: number): string {
  if (price < 1) return price.toFixed(5);
  return price.toFixed(2);
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

export function registerPriceTools(server: McpServer): void {
  server.registerTool(
    "tao_price",
    {
      description:
        "Get TAO price history or subnet alpha token OHLCV price data. If no netuid is provided, returns TAO/USD price history. If a netuid is provided, returns that subnet's alpha token price candles. Example queries: 'what is TAO price', 'TAO price last 30 days', 'SN18 price chart', 'subnet 1 alpha price hourly'",
      inputSchema: {
        netuid: z
          .number()
          .optional()
          .describe(
            "Subnet ID for alpha token price. Omit for TAO price",
          ),
        currency: z
          .string()
          .optional()
          .describe("Currency for TAO price: usd or eur. Defaults to usd"),
        resolution: z
          .string()
          .optional()
          .describe(
            "Candle resolution for subnet prices: 1, 5, 15, 30, 60, 240, D, W. Defaults to D",
          ),
        from: z
          .string()
          .optional()
          .describe("Start date for subnet prices. ISO 8601 format"),
        to: z
          .string()
          .optional()
          .describe("End date for subnet prices. ISO 8601 format"),
        limit: z
          .number()
          .optional()
          .describe("Maximum number of data points to return"),
      },
    },
    async ({ netuid, currency, resolution, from, to, limit }) => {
      try {
        if (netuid !== undefined) {
          const data = await taoswap.getSubnetPriceHistory(
            netuid,
            resolution ?? "D",
            limit ?? 30,
            from,
            to,
          );
          const result = {
            netuid: data.netuid,
            resolution: data.resolution,
            data_points: data.count,
            candles: data.results.map((c) => ({
              time: c.time,
              open: formatPrice(c.open),
              high: formatPrice(c.high),
              low: formatPrice(c.low),
              close: formatPrice(c.close),
              volume: c.volume,
            })),
          };
          return {
            content: [
              { type: "text" as const, text: JSON.stringify(result) },
            ],
          };
        }

        const data = await taoswap.getPriceHistory(
          currency ?? "usd",
          limit ?? 30,
        );
        const result = {
          currency: data.currency,
          data_points: data.results.length,
          prices: data.results.map((p) => ({
            date: p.date,
            price_usd: formatPrice(p.price),
            volume: p.volume,
          })),
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
