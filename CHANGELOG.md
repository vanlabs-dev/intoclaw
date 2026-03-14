# Changelog

All notable changes to IntoClaw will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **bitget-trading** skill — Full Bitget exchange integration covering spot trading, futures trading, margin, copy trading, earn/savings, wallet operations, and market data. Includes bash helpers with HMAC-SHA256 signature generation, comprehensive endpoint reference, Agent Hub/GetClaw documentation, and trading safety framework with tiered confirmation patterns. Features AgentMail-powered registration flow — agent creates its own email inbox and catches verification codes automatically, minimizing human interaction during account setup.
- **subnet-research**: Pre-formatted `telegram` HTML message in JSON output — ready-to-send string with emoji anchors, domain escaping, and HTML parse_mode formatting
- **Development workflow**: `dev` branch, PR template, CONTRIBUTING.md, GitHub Actions CI (`validate-skill.yml`)

### Fixed

- **subnet-research**: Removed TaoStats slippage simulation — endpoint returns wildly inaccurate values vs actual on-chain swaps. Liquidity risk now assessed via pool metrics (liquidity/market_cap ratio + volume)
- **subnet-research**: Fixed emission display — was using raw on-chain `emission` int, now uses `projected_emission` fraction
- **subnet-research**: Fixed APY display — `seven_day_apy` returns a fraction, now correctly multiplied by 100 for percentage
- **subnet-research**: Removed validator concentration signal — ecosystem-wide norm, flagging it on every subnet is noise

### Changed

- **subnet-research**: Telegram output uses HTML format (`<b>bold</b>`) instead of Markdown — more reliable across Telegram clients
- **subnet-research**: Domain names in reports auto-escaped (tao(dot)com) to prevent link preview embeds
- **INSTALL.md**: Bots now check existing .env files before prompting for keys

### Removed

- **subnet-research**: Image generation removed (header card, charts) — not compatible with Telegram bot flow
- **subnet-research**: pyfiglet, Pillow, matplotlib dependencies removed — only `requests` required

## [1.1.0] - 2026-03-13

### Added

- **subnet-research** skill — Multi-phase subnet research combining live chain data (TaoStats), social sentiment (Desearch/X), and Bittensor domain knowledge into structured reports with signal analysis. Features: inactive subnet detection (price > 1 TAO), liquidity risk assessment, root_prop evaluation, net flow tracking, fear & greed analysis, and social concentration detection. Supports comparative mode for side-by-side subnet analysis.

### Changed

- Updated conflict declarations in bittensor-knowledge, chain-metrics, and desearch skills to include subnet-research overlaps
- Updated README.md skill registry and overlap tables

## [1.0.0] - 2026-03-12

### Added

- **bittensor-knowledge** skill — Bittensor domain knowledge base covering architecture, Yuma Consensus, emissions, subnets, btcli, and SDK
- **chain-metrics** skill — Live on-chain data via TaoStats REST API and MCP (pool data, validator APYs, stake positions, metagraph, net flows)
- **desearch** skill — Decentralized web search and X/Twitter data via Desearch API (Subnet 22)
- **skill-creator** skill — Meta-skill for building and auditing new skills
- Bot-facing onboarding flow (README.md + INSTALL.md)
- CLAUDE.md developer context for Claude Code sessions
- Versioning strategy with semver and per-skill version fields
