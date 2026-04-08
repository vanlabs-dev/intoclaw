# IntoClaw

Bittensor-native MCP server for AI agents. Query subnets, check portfolios, stake TAO, and search the decentralized web.

## What it does

- **31 tools** for Bittensor: subnets, validators, prices, portfolio, staking, transfers, search
- **Staking safety system**: blocks dangerous operations (inactive subnets, extreme slippage)
- **Confirmation flow**: all chain writes require preview and explicit confirmation
- **Ground-truth references**: prevents outdated Bittensor information
- **Zero auth for reads**: TaoSwap API provides all read data without API keys

## Install

```bash
npm install -g @intoclaw/mcp-server
```

## Configure

### Claude Desktop

Add to your Claude Desktop MCP config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS, `%APPDATA%\Claude\claude_desktop_config.json` on Windows):

```json
{
  "mcpServers": {
    "intoclaw": {
      "command": "intoclaw"
    }
  }
}
```

### OpenClaw

OpenClaw skill install is coming in Phase 4.

### Environment variables

Copy `.env.example` to `.env.local` and configure:

```bash
# Required for chain write operations
AGCLI_PASSWORD=your-wallet-password

# Required for Desearch search tools
DESEARCH_API_KEY=your-desearch-key
```

## Tools

### Network reads

| Tool | Description | Backend |
|------|-------------|---------|
| `tao_subnet_list` | List all subnets with metrics | TaoSwap |
| `tao_subnet_info` | Detailed info for a subnet | TaoSwap |
| `tao_subnet_history` | Daily historical stats for a subnet | TaoSwap |
| `tao_metagraph` | Full metagraph with all neurons | TaoSwap |
| `tao_validator_list` | List all validators | TaoSwap |
| `tao_validator_info` | Detailed validator info and history | TaoSwap |
| `tao_price` | TAO/USD price or subnet alpha OHLCV | TaoSwap |
| `tao_network_stats` | Network overview and halving status | TaoSwap |
| `tao_identity` | On-chain identity lookup | TaoSwap |
| `tao_events` | Query chain events by block or method | TaoSwap |
| `tao_extrinsics` | Query chain transactions | TaoSwap |
| `tao_search` | Search addresses, subnets, validators | TaoSwap |
| `tao_balance` | Check TAO balance for an address | agcli |

### Portfolio

| Tool | Description | Backend |
|------|-------------|---------|
| `tao_portfolio_balance` | Daily balance history | TaoSwap |
| `tao_portfolio_apy` | Estimated APY by subnet | TaoSwap |
| `tao_account_transactions` | Recent transaction history | TaoSwap |
| `tao_idle_stakes` | Find non-earning stake positions | TaoSwap |

### Chain operations

| Tool | Description | Backend |
|------|-------------|---------|
| `tao_stake_list` | View current staking positions | agcli |
| `tao_stake_add` | Stake TAO on a subnet (with safety checks) | agcli |
| `tao_stake_remove` | Unstake TAO from a subnet | agcli |
| `tao_stake_move` | Move stake between subnets | agcli |
| `tao_transfer` | Send TAO to an address | agcli |
| `tao_wallet_list` | List wallets on this machine | agcli |
| `tao_wallet_create` | Create a new wallet | agcli |
| `tao_swap_simulate` | Simulate a swap without executing | agcli |
| `tao_confirm` | Confirm and execute a previewed operation | agcli |

### Search

| Tool | Description | Backend |
|------|-------------|---------|
| `tao_search_web` | Search the web via Desearch (SN22) | Desearch |
| `tao_search_twitter` | Search X/Twitter via Desearch (SN22) | Desearch |

### Education and config

| Tool | Description | Backend |
|------|-------------|---------|
| `tao_learn` | Educational resources and ground-truth refs | TaoSwap |
| `tao_explain` | Explain Bittensor concepts (32 topics) | agcli |
| `tao_config` | View or update configuration | agcli |

## Requirements

- Node.js 22+
- Desearch API key (optional, for search tools): https://desearch.ai

### agcli (optional, for chain operations)

Pre-built binaries (fastest):
```bash
curl -fsSL https://raw.githubusercontent.com/vanlabs-dev/intoclaw/v2/scripts/install-agcli.sh | bash
```

Or compile from source:
```bash
cargo install --git https://github.com/unarbos/agcli
```

## Safety

- Staking operations check subnet activity (alpha price) and estimate slippage before allowing execution
- Inactive subnets (alpha > 1 TAO) are blocked
- Extreme slippage (> 25%) is blocked
- All write operations go through preview -> confirm flow
- Wallet passwords are never logged or included in responses

## Links

- [IntoTAO](https://intotao.app) -- Bittensor education and subnet research
- [TaoSwap](https://taoswap.org) -- Bittensor DEX and analytics
- [agcli](https://github.com/unarbos/agcli) -- Bittensor CLI for agents

## License

MIT
