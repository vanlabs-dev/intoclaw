# Changelog

All notable changes to IntoClaw will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- **subnet-research**: Removed TaoStats slippage simulation — endpoint returns wildly inaccurate values vs actual on-chain swaps. Liquidity risk now assessed via pool metrics (liquidity/market_cap ratio + volume)
- **subnet-research**: Fixed emission display — was using raw on-chain `emission` int, now uses `projected_emission` fraction
- **subnet-research**: Removed validator concentration signal entirely — it's the norm across the ecosystem, flagging it on every subnet is noise

### Changed

- **subnet-research**: Reports split across multiple Telegram messages (4,096 char limit) — banner+overview, validators+social, chart, findings+risks
- **subnet-research**: Mobile-friendly report format — no markdown tables (renders as code blocks on Telegram/Discord), use bold key-value pairs instead
- **subnet-research**: ASCII banner must be plain text (not code block) in reports
- **subnet-research**: Domain names in reports must be escaped (tao(dot)com) to prevent link preview embeds
- **INSTALL.md**: Bots now check existing .env files before prompting for keys

## [1.1.0] - 2026-03-13

### Added

- **subnet-research** skill — Multi-phase subnet research combining live chain data (TaoStats), social sentiment (Desearch/X), and Bittensor domain knowledge into structured reports with signal analysis. Features: inactive subnet detection (price > 1 TAO), liquidity/slippage risk assessment, root_prop evaluation, net flow tracking, fear & greed analysis, dev activity checks, and social concentration detection. Supports comparative mode for side-by-side subnet analysis.

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
