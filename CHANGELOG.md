# Changelog

All notable changes to IntoClaw will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **subnet-research**: Styled header card PNG (1200×300, dark theme, SN number, subnet name, key stats) via Pillow — replaces ASCII art banner
- **subnet-research**: Pre-formatted `telegram` messages in JSON output — 4 ready-to-send strings with emoji anchors, domain escaping, and Telegram character limit compliance
- **subnet-research**: `header_path` field in JSON output for the header card image

### Fixed

- **subnet-research**: Removed TaoStats slippage simulation — endpoint returns wildly inaccurate values vs actual on-chain swaps. Liquidity risk now assessed via pool metrics (liquidity/market_cap ratio + volume)
- **subnet-research**: Fixed emission display — was using raw on-chain `emission` int, now uses `projected_emission` fraction
- **subnet-research**: Removed validator concentration signal entirely — it's the norm across the ecosystem, flagging it on every subnet is noise

### Changed

- **subnet-research**: Replaced pyfiglet with Pillow for header card generation
- **subnet-research**: Domain names in reports auto-escaped (tao(dot)com) to prevent link preview embeds
- **INSTALL.md**: Bots now check existing .env files before prompting for keys

### Removed

- **subnet-research**: `ascii_header` field removed from JSON output (replaced by `header_path` + `telegram`)
- **subnet-research**: pyfiglet dependency removed

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
