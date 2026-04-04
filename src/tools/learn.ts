import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { taoswap, TaoSwapApiError } from "../backends/taoswap.js";
import {
  getIntoTaoSubnetUrl,
  getIntoTaoLearnUrl,
  getTaoSwapUrl,
} from "../lib/links.js";
import { findGroundTruth } from "../lib/ground-truth.js";

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

export function registerLearnTools(server: McpServer): void {
  server.registerTool(
    "tao_learn",
    {
      description:
        "Get educational resources about Bittensor or a specific subnet. Returns IntoTAO article links, TaoSwap chart links, and ground-truth reference context for accurate Bittensor education. Example queries: 'where can I learn about subnet 18', 'show me SN1 on IntoTAO', 'learn about Bittensor', 'what is dTAO'",
      inputSchema: {
        netuid: z
          .number()
          .optional()
          .describe(
            "Subnet ID to get resources for. Omit for general Bittensor learning resources",
          ),
        topic: z
          .string()
          .optional()
          .describe(
            "Specific Bittensor topic to learn about, e.g. 'staking', 'emissions', 'dTAO', 'Taoflow', 'validators'",
          ),
      },
    },
    async ({ netuid, topic }) => {
      if (netuid !== undefined) {
        try {
          const subnet = await taoswap.getSubnet(netuid);
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  subnet_name: subnet.name,
                  links: [
                    {
                      label: `${subnet.name} on IntoTAO`,
                      url: getIntoTaoSubnetUrl(netuid, subnet.name),
                    },
                    {
                      label: `${subnet.name} chart on TaoSwap`,
                      url: getTaoSwapUrl(),
                    },
                    {
                      label: "Learn about Bittensor",
                      url: getIntoTaoLearnUrl(),
                    },
                  ],
                  context: `IntoTAO has a detailed analysis page for ${subnet.name} (SN${netuid}) including metrics, validator activity, and historical data.`,
                }),
              },
            ],
          };
        } catch (err) {
          return handleApiError(err);
        }
      }

      if (topic) {
        const context = findGroundTruth(topic);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                links: [
                  {
                    label: "Learn about Bittensor",
                    url: getIntoTaoLearnUrl(),
                  },
                ],
                context,
              }),
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              links: [
                {
                  label: "Learn about Bittensor",
                  url: getIntoTaoLearnUrl(),
                },
                {
                  label: "TaoSwap (live charts and data)",
                  url: getTaoSwapUrl(),
                },
              ],
              context:
                "IntoTAO provides educational articles, subnet analysis, and validator insights for the Bittensor network. Ask about a specific subnet by number or a topic like staking, emissions, dTAO, or validators.",
            }),
          },
        ],
      };
    },
  );
}
