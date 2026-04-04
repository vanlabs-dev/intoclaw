import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  listStakes,
  AgcliNotInstalledError,
  AgcliExecutionError,
} from "../backends/agcli.js";

function errorResult(msg: string) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify({ error: msg }) }],
    isError: true,
  };
}

export function registerStakeTools(server: McpServer): void {
  server.registerTool(
    "tao_stake_list",
    {
      description:
        "View all current staking positions for a wallet address. Shows which subnets you are staked on and estimated amounts. Example queries: 'show my stakes', 'what am I staked on', 'list my staking positions'",
      inputSchema: {
        address: z
          .string()
          .optional()
          .describe(
            "SS58 address to check stakes for. Uses default wallet if not provided",
          ),
      },
    },
    async ({ address }) => {
      try {
        const stakes = await listStakes(address);
        const formatted = stakes.map((s) => ({
          hotkey: s.hotkey,
          coldkey: s.coldkey,
          netuid: s.netuid,
          estimated_stake_rao: s.stake.rao,
          estimated_stake_tao: s.stake.rao / 1e9,
          estimated_alpha_raw: s.alpha_stake.raw,
        }));
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                address: address ?? "default",
                positions: formatted.length,
                stakes: formatted,
              }),
            },
          ],
        };
      } catch (err) {
        if (err instanceof AgcliNotInstalledError) {
          return errorResult(err.message);
        }
        if (err instanceof AgcliExecutionError) {
          return errorResult(err.message);
        }
        return errorResult(
          "An unexpected error occurred. Try again in a moment.",
        );
      }
    },
  );
}
