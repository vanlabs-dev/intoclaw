# Changelog

All notable changes to IntoClaw will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

<!-- Add changes here during development. Rename to [x.y.z] - date when PRing to main. -->

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
