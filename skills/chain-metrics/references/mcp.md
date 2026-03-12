# TaoStats MCP — Reference

MCP URL: `https://mcp.taostats.io?tools=data,docs,api`  
Auth: `Authorization: YOUR_TAOSTATS_KEY` (same key as REST API)

---

## What the MCP gives you (vs. REST API)

| Need | Use |
|---|---|
| Raw numbers: price, APY, stake, flows | REST API via taostats.sh / taostats_client.py |
| Subnet rich identity: name, description, tags, Discord | MCP `data` tools |
| Validator profiles + social context | MCP `data` tools |
| Docs Q&A ("how does emission work?") | MCP `docs` tools |
| API spec exploration | MCP `api` tools |

MCP is best when you want context-enriched data that the raw REST API doesn't provide (descriptions, Discord links, summaries, human-readable explanations).

---

## Tool Sets

The MCP is configured with three tool sets: `data`, `docs`, `api`.

### `data` tools
Live chain data with richer identity/context than raw REST:
- Subnet lookup with name, description, tags, Discord, website
- Validator profiles with social context
- Staking history with human-readable summaries
- Portfolio overview

### `docs` tools
Docs Q&A — ask questions about Bittensor mechanics, emissions, YC, etc. and get answers grounded in TaoStats documentation.

### `api` tools
API spec and endpoint discovery — useful when exploring what's available or debugging endpoint behavior.

---

## Installation

**OpenClaw / Claude Code:**
```bash
claude mcp add taostats --transport http "https://mcp.taostats.io?tools=data,docs,api" \
  --header "Authorization: YOUR_TAOSTATS_KEY"
```

**Claude Desktop** (add to `claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "taostats": {
      "url": "https://mcp.taostats.io?tools=data,docs,api&apikey=YOUR_TAOSTATS_KEY"
    }
  }
}
```

---

## Recommended: MCP + REST Combination

For subnet research, combine both:

1. **MCP** → get subnet identity, description, Discord, tags
2. **REST** → get pool data (root_prop, price, APY), net flows, metagraph
3. **Desearch** → X/Twitter sentiment and news

This gives: full picture — identity + on-chain numbers + social signal.

---

## Notes

- MCP is HTTP transport (not stdio) — requires OpenClaw gateway to be running
- Same API key as REST — no separate credential needed
- Rate limits apply equally to MCP and REST calls
