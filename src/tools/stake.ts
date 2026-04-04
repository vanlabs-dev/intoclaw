import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  listStakes,
  buildStakeAddArgs,
  buildStakeRemoveArgs,
  buildStakeMoveArgs,
  isAgcliAvailable,
  AgcliNotInstalledError,
  AgcliExecutionError,
} from "../backends/agcli.js";
import { createPreview } from "../lib/confirmation.js";

function errorResult(msg: string) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify({ error: msg }) }],
    isError: true,
  };
}

function handleError(err: unknown) {
  if (err instanceof AgcliNotInstalledError) return errorResult(err.message);
  if (err instanceof AgcliExecutionError) return errorResult(err.message);
  if (err instanceof Error) return errorResult(err.message);
  return errorResult("An unexpected error occurred. Try again in a moment.");
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
        return handleError(err);
      }
    },
  );

  server.registerTool(
    "tao_stake_add",
    {
      description:
        "Stake TAO on a Bittensor subnet. Runs safety checks on the subnet before allowing the operation. Returns a preview that must be confirmed before execution. Example queries: 'stake 10 TAO on subnet 18', 'add stake to SN1'",
      inputSchema: {
        amount: z.number().positive().describe("Amount of TAO to stake"),
        netuid: z
          .number()
          .int()
          .nonnegative()
          .describe("Subnet ID to stake on"),
        max_slippage: z
          .number()
          .optional()
          .describe("Maximum acceptable slippage percentage"),
      },
    },
    async ({ amount, netuid, max_slippage }) => {
      try {
        if (!(await isAgcliAvailable())) {
          return errorResult(new AgcliNotInstalledError().message);
        }
        const agcliArgs = buildStakeAddArgs(amount, netuid, max_slippage);
        const result = await createPreview({
          tool: "tao_stake_add",
          params: { amount, netuid, max_slippage },
          agcliArgs,
          safetyNetuid: netuid,
          safetyAmount: amount,
          dryRunArgs: ["--dry-run", ...agcliArgs],
        });

        if (result.status === "blocked") {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  status: "blocked",
                  reason: result.preview.summary,
                  safety: result.preview.safetyAssessment,
                }),
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                status: "preview",
                needs_confirmation: true,
                operation_id: result.operationId,
                summary: result.preview.summary,
                safety: result.preview.safetyAssessment,
                dry_run: result.preview.dryRunOutput ?? null,
                message: "Confirm this operation to proceed.",
              }),
            },
          ],
        };
      } catch (err) {
        return handleError(err);
      }
    },
  );

  server.registerTool(
    "tao_stake_remove",
    {
      description:
        "Unstake TAO from a Bittensor subnet. Returns a preview that must be confirmed before execution. Example queries: 'unstake 5 TAO from subnet 18', 'remove my SN1 stake'",
      inputSchema: {
        amount: z.number().positive().describe("Amount to unstake"),
        netuid: z
          .number()
          .int()
          .nonnegative()
          .describe("Subnet ID to unstake from"),
      },
    },
    async ({ amount, netuid }) => {
      try {
        if (!(await isAgcliAvailable())) {
          return errorResult(new AgcliNotInstalledError().message);
        }
        const agcliArgs = buildStakeRemoveArgs(amount, netuid);
        const result = await createPreview({
          tool: "tao_stake_remove",
          params: { amount, netuid },
          agcliArgs,
          dryRunArgs: ["--dry-run", ...agcliArgs],
        });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                status: "preview",
                needs_confirmation: true,
                operation_id: result.operationId,
                summary: result.preview.summary,
                dry_run: result.preview.dryRunOutput ?? null,
                message: "Confirm this operation to proceed.",
              }),
            },
          ],
        };
      } catch (err) {
        return handleError(err);
      }
    },
  );

  server.registerTool(
    "tao_stake_move",
    {
      description:
        "Move staked alpha tokens from one subnet to another. Runs safety checks on the destination subnet. Returns a preview that must be confirmed. Example queries: 'move stake from SN1 to SN18', 'transfer my SN3 position to SN18'",
      inputSchema: {
        amount: z.number().positive().describe("Amount to move"),
        from: z
          .number()
          .int()
          .nonnegative()
          .describe("Source subnet ID"),
        to: z
          .number()
          .int()
          .nonnegative()
          .describe("Destination subnet ID"),
      },
    },
    async ({ amount, from, to }) => {
      try {
        if (!(await isAgcliAvailable())) {
          return errorResult(new AgcliNotInstalledError().message);
        }
        const agcliArgs = buildStakeMoveArgs(amount, from, to);
        const result = await createPreview({
          tool: "tao_stake_move",
          params: { amount, from, to },
          agcliArgs,
          safetyNetuid: to,
          safetyAmount: amount,
          dryRunArgs: ["--dry-run", ...agcliArgs],
        });

        if (result.status === "blocked") {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  status: "blocked",
                  reason: result.preview.summary,
                  safety: result.preview.safetyAssessment,
                }),
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                status: "preview",
                needs_confirmation: true,
                operation_id: result.operationId,
                summary: result.preview.summary,
                safety: result.preview.safetyAssessment,
                dry_run: result.preview.dryRunOutput ?? null,
                message: "Confirm this operation to proceed.",
              }),
            },
          ],
        };
      } catch (err) {
        return handleError(err);
      }
    },
  );
}
