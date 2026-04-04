import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  getExplanation,
  AgcliNotInstalledError,
  AgcliExecutionError,
} from "../backends/agcli.js";
import { findGroundTruth } from "../lib/ground-truth.js";

function errorResult(msg: string) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify({ error: msg }) }],
    isError: true,
  };
}

export function registerExplainTools(server: McpServer): void {
  server.registerTool(
    "tao_explain",
    {
      description:
        "Explain a Bittensor concept using built-in knowledge from the Bittensor CLI. Covers 32 topics including tempo, consensus, staking, emissions, subnets, and more. Example queries: 'what is tempo', 'explain Yuma consensus', 'how do emissions work', 'what is dTAO'",
      inputSchema: {
        topic: z
          .string()
          .describe(
            "The Bittensor concept to explain, e.g. tempo, yuma, emission, dtao, subnets, weights, delegation, amm",
          ),
      },
    },
    async ({ topic }) => {
      const groundTruth = findGroundTruth(topic);
      let agcliContent: string | null = null;

      try {
        const result = await getExplanation(topic);
        agcliContent = result.content;
      } catch (err) {
        if (err instanceof AgcliNotInstalledError) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  topic,
                  source: "ground-truth",
                  explanation: groundTruth,
                  note: "agcli is not available. Showing verified reference content only.",
                }),
              },
            ],
          };
        }
        if (err instanceof AgcliExecutionError) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  topic,
                  source: "ground-truth",
                  explanation: groundTruth,
                  note: `agcli does not have a topic named "${topic}". Showing verified reference content instead. Use agcli explain topics: tempo, yuma, emission, amm, delegation, subnets, validators, miners, alpha, registration, weights, and more.`,
                }),
              },
            ],
          };
        }
        return errorResult("An unexpected error occurred. Try again in a moment.");
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              topic,
              source: "agcli + ground-truth",
              explanation: agcliContent,
              verified_facts: groundTruth,
            }),
          },
        ],
      };
    },
  );
}
