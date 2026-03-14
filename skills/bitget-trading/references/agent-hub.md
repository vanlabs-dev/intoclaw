# Bitget Agent Hub & GetClaw Integration

## Overview

Bitget launched their AI Agent Hub in February 2026 with Model Context Protocol (MCP) support. In March 2026, they upgraded it with two major additions: a **Skills mechanism** and a **CLI tool (`bgc`)**, both designed for AI trading agents — specifically OpenClaw and Claude Code.

The platform exposes **9 capability modules** and **58 tools**, claimed to be the broadest functional coverage among major exchange platforms.

---

## Agent Hub Architecture

### Skills Mechanism

The Skills mechanism allows AI agents to:
- Interpret user trading intent from natural language
- Translate intent into standardized JSON operations
- Execute trading actions through Bitget's API

This is what makes OpenClaw integration possible — the agent parses "buy 0.1 BTC at market" and maps it to the correct API call.

### CLI Tool: `bgc`

The `bgc` command-line interface exposes Bitget's full API suite for:
- Scripts and automation pipelines
- Data ingestion workflows
- System-level agent integrations

Think of it as the Bitget equivalent of `btcli` for Bittensor — a shell-level interface to the entire platform.

### OpenClaw Integration

Bitget claims a "three-step configuration process" to connect OpenClaw agents:
1. Configure API credentials
2. Link to OpenClaw workspace
3. Agent gains access to: real-time market data, spot and futures trading, account management

The integration grants AI agents access to live market execution.

---

## When to Use Agent Hub vs Direct API

| Scenario | Recommended Approach |
|----------|---------------------|
| Quick setup, standard operations | Agent Hub / `bgc` CLI |
| Custom trading logic, full control | Direct REST API via bash helpers |
| Data pipelines, batch operations | `bgc` CLI or REST API |
| Copy trading management | REST API (full endpoint coverage) |
| Earn/savings products | REST API (Agent Hub coverage unclear) |

The Agent Hub is newer and its full tool coverage hasn't been publicly documented in detail. The REST API (V2/V3) is fully documented with 300+ endpoints and is the safer bet for comprehensive coverage.

---

## Current Limitations

As of March 2026:
- The Agent Hub launched recently and detailed documentation of all 58 tools is limited
- `bgc` CLI installation and usage docs are primarily on bitget.com (which may require browser access)
- The relationship between GetClaw (the product name) and the Agent Hub (the platform) isn't fully clarified in public sources
- No public SDK for the Skills mechanism — it appears to be an API-level integration

---

## Resources

- Bitget Agent Hub: accessible through Bitget's developer portal
- `bgc` CLI: available through Bitget's developer tools
- OpenClaw integration: configured through the Agent Hub settings
- API docs: https://bitgetlimited.github.io/apidoc/en/spot/
- Node.js SDK: https://www.npmjs.com/package/bitget-api
