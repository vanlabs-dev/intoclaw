import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  searchWeb,
  searchTwitter,
  isDesearchAvailable,
  DesearchNotConfiguredError,
  DesearchApiError,
  DesearchUnavailableError,
} from "../backends/desearch.js";

function errorResult(msg: string) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify({ error: msg }) }],
    isError: true,
  };
}

export function registerWebSearchTools(server: McpServer): void {
  server.registerTool(
    "tao_search_web",
    {
      description:
        "Search the decentralized web for Bittensor-related information using Desearch (Bittensor SN22). Returns web search results with summaries. Requires a Desearch API key to be configured. Example queries: 'search for Bittensor governance proposals', 'find info about subnet 18 Zeus', 'latest Bittensor news'",
      inputSchema: {
        query: z
          .string()
          .describe("Search query. Be specific for better results"),
      },
    },
    async ({ query }) => {
      if (!isDesearchAvailable()) {
        return errorResult(
          "Desearch search requires an API key. Set DESEARCH_API_KEY in your .env.local file. Get a key at desearch.ai",
        );
      }

      try {
        const result = await searchWeb(query);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                summary: result.completion,
                results: result.search.map((r) => ({
                  title: r.title,
                  url: r.link,
                  snippet: r.snippet,
                })),
                result_count: result.search.length,
              }),
            },
          ],
        };
      } catch (err) {
        if (err instanceof DesearchNotConfiguredError)
          return errorResult(err.message);
        if (err instanceof DesearchApiError) return errorResult(err.message);
        if (err instanceof DesearchUnavailableError)
          return errorResult(err.message);
        return errorResult(
          "An unexpected error occurred during web search. Try again in a moment.",
        );
      }
    },
  );

  server.registerTool(
    "tao_search_twitter",
    {
      description:
        "Search X/Twitter for Bittensor-related posts and discussions using Desearch (Bittensor SN22). Returns recent tweets with engagement data. Requires a Desearch API key. Example queries: 'what are people saying about TAO on Twitter', 'latest TAO tweets', 'Bittensor community sentiment'",
      inputSchema: {
        query: z
          .string()
          .describe("Search query for X/Twitter"),
      },
    },
    async ({ query }) => {
      if (!isDesearchAvailable()) {
        return errorResult(
          "Desearch search requires an API key. Set DESEARCH_API_KEY in your .env.local file. Get a key at desearch.ai",
        );
      }

      try {
        const result = await searchTwitter(query);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                summary: result.completion,
                tweets: result.tweets.map((t) => ({
                  username: t.user.username,
                  name: t.user.name,
                  text: t.text,
                  url: t.url,
                  created_at: t.created_at,
                  likes: t.like_count,
                  retweets: t.retweet_count,
                  replies: t.reply_count,
                  views: t.view_count,
                })),
                result_count: result.tweets.length,
              }),
            },
          ],
        };
      } catch (err) {
        if (err instanceof DesearchNotConfiguredError)
          return errorResult(err.message);
        if (err instanceof DesearchApiError) return errorResult(err.message);
        if (err instanceof DesearchUnavailableError)
          return errorResult(err.message);
        return errorResult(
          "An unexpected error occurred during Twitter search. Try again in a moment.",
        );
      }
    },
  );
}
