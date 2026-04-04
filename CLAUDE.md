# IntoClaw v2

## Project
Bittensor-native MCP server, distributed as OpenClaw skill.

## Architecture
- src/tools/ -- MCP tool handlers, one file per domain
- src/backends/ -- API clients (taoswap.ts, agcli.ts, desearch.ts)
- src/lib/ -- Shared utilities (safety, confirmation, spending, cache, links)
- references/ -- Bittensor ground-truth and fact-check patterns

## Commands
- npm run build -- compile TypeScript
- npm run dev -- watch mode
- npm run lint -- eslint
- npm run test -- vitest
- npm run inspect -- MCP Inspector

## Rules
- No em dashes
- Conventional commits: feat:, fix:, docs:, chore:, test:
- snake_case for tool names, camelCase for TypeScript
- Tool responses are structured JSON, never raw strings
- Passwords and mnemonics never appear in tool output or logs
- Every tool has Zod schema validation with .describe() on all fields
- Prices show 5 decimal places under 1 TAO
- Errors explain what went wrong AND what the user can do
- All calculated values use "estimated" or "approximately"
- No decorative code comments, no ASCII art banners
- Commit messages: short, specific, lowercase, human-sounding

## Financial information rule
IntoClaw presents data and metrics. It NEVER recommends, suggests, or
advises financial actions. No "consider", "you should", "I recommend".
Present facts. Let users decide.
