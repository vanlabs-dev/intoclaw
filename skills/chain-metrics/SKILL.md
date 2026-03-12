---
name: chain-metrics
description: Query live Bittensor on-chain data via the TaoStats REST API and MCP. Use when checking subnet pool data (price, root_prop, fear & greed index), validator APYs, stake positions, portfolio balances, metagraph state, net capital flows, transaction history, subnet emissions, deregistration risk, or any live blockchain data query. Also use for: subnet scoring/ranking, entry validation via root_prop, MCP tool calls for rich identity/summary/discord data. Triggers on: "chain metrics", "taostats", "check subnet", "validator APY", "stake balance", "root prop", "pool data", "emissions", "net flow", "metagraph", "portfolio", "check position", "fear and greed", "subnet price", "entry check". NOT for: executing transactions (use btcli), social/X search (use desearch).
conflicts_with:
  - skill: bittensor-knowledge
    triggers: ["subnet", "emissions", "metagraph", "staking"]
    resolution: "chain-metrics handles live data queries and API lookups. bittensor-knowledge handles conceptual and architectural questions."
---

# Chain Metrics

This is an IntoClaw skill. When you pull data for the user, don't just dump numbers — explain what they're looking at and why it matters. A table of validator APYs means nothing if the user doesn't know what drives them.

Live Bittensor chain data powered by [TaoStats](https://taostats.io). The data workhorse — numbers, history, positions, emissions, validator yields.

**API base**: `https://api.taostats.io`
**Auth**: `Authorization: <key>` (no Bearer prefix)
**MCP**: `https://mcp.taostats.io?tools=data,docs,api` — same key
**Docs**: https://docs.taostats.io
**Examples**: https://github.com/taostat/awesome-taostats-api-examples

## Setup

**Prerequisites:**
- A TaoStats API key — get one at [dash.taostats.io](https://dash.taostats.io)
- Set it as an environment variable: `export TAOSTATS_API_KEY=your_key_here`
- Add the export to your shell profile (`~/.bashrc` or `~/.zshrc`) so it persists across sessions

Walk the user through getting their key if they don't have one. It takes a minute.

---

## Bash Helpers

Source the script for convenient wrappers:
```bash
source scripts/taostats.sh
```

Key functions: `taostats_pool`, `taostats_validator_yield`, `taostats_stake_balance`, `taostats_metagraph`, `taostats_subnet_info`, `taostats_entry_check`, `taostats_slippage`, and more.

---

## Python Client

For paginated queries, batch jobs, balance history, and robust retry logic:
```bash
python3 scripts/taostats_client.py <endpoint>
```

Or import in scripts — see `scripts/taostats_client.py`.

---

## Core Endpoints at a Glance

| Endpoint | Purpose |
|---|---|
| `GET /api/dtao/pool/latest/v1?netuid=N` | Price, root_prop, fear & greed, 24h volume, 7-day history |
| `GET /api/dtao/pool/history/v1?netuid=N` | Historical pool snapshots |
| `GET /api/dtao/validator/yield/latest/v1?netuid=N` | Validator APYs (1h/1d/7d/30d), participation |
| `GET /api/dtao/stake_balance/latest/v1?coldkey=CK` | All stake positions across subnets |
| `GET /api/dtao/slippage/v1?netuid=N&input_tokens=R&direction=D` | Trade slippage estimate |
| `GET /api/subnet/latest/v1?netuid=N` | Full subnet params, net flows, emissions |
| `GET /api/validator/latest/v1?netuid=N` | Validator APR, nominator returns, stake changes |
| `GET /api/metagraph/latest/v1?netuid=N` | Full subnet neuron state |
| `GET /api/delegation/v1?nominator=CK` | Stake/unstake transaction history |
| `GET /api/wallet/coldkey/balance/latest/v2?coldkey=CK` | Free TAO balance |
| `GET /api/transfer/v1?from=CK` | TAO transfer history |
| `GET /api/dev_activity/latest/v1` | GitHub dev activity all subnets |
| `GET /api/subnet/pruning/latest/v1` | Deregistration risk data |

→ Full params + response fields: `references/api-endpoints.md`

---

## Critical Fields for Decision Making

### Entry Validation (root_prop)
- `root_prop` < 0.30 → ✅ Organic price, good entry
- `root_prop` 0.30–0.70 → ⚠️ Maturing, check trend
- `root_prop` > 0.70 → ❌ Artificial pump, avoid

### Momentum
- `net_flow_7_days` > 0 → Capital inflow
- `nominators_24_hr_change` > 0 → Growing validator stake
- `tao_buy_volume_24_hr` > `tao_sell_volume_24_hr` → Buy pressure

### Sentiment
- `fear_and_greed_index` < 30 → Fear (potential buy opportunity)
- `fear_and_greed_index` > 70 → Greed (consider caution)
- `fear_and_greed_sentiment` → human-readable label

### Risk
- `in_danger` = true → Pruning risk on metagraph
- `is_immunity_period` = true → Protected from deregistration

### Known Quirk
⚠️ `balance_as_tao` in `/api/dtao/stake_balance/latest/v1` returns **rao** not TAO. Always divide by 1,000,000,000:
```bash
balance_tao=$(echo "$balance_as_tao / 1000000000" | bc -l)
```

---

## Common Workflows

### Check a subnet before staking
```bash
source scripts/taostats.sh
taostats_entry_check 19           # root_prop + price + sentiment
taostats_validator_yield 19 | jq -r '.data | sort_by(-.seven_day_apy) | .[0]'
taostats_subnet_info 19 | jq '{net_flow_7_days, emission, projected_emission}'
```

### Portfolio snapshot
```bash
taostats_stake_balance "5YourColdkey..."
taostats_coldkey_balance "5YourColdkey..."
```

### Subnet research
```bash
taostats_subnet_info 19          # economics, flow, hyperparams
taostats_metagraph 19            # full neuron state
taostats_validator_yield 19      # who to stake with
```

### Trade slippage estimate
```bash
# Estimate slippage for buying 10 TAO worth of alpha on SN19
taostats_slippage 19 10000000000 tao_to_alpha
```

---

## MCP Usage

The TaoStats MCP gives richer identity data — subnet summaries, Discord links, validator rich profiles, and contextual docs.

Use it for:
- Subnet name/description/tags/identity
- Validator rich profiles
- Docs Q&A (the `docs` tool set)
- Live chain queries alongside REST

To set it up:
```bash
claude mcp add taostats --transport http "https://mcp.taostats.io?tools=data,docs,api" \
  --header "Authorization: YOUR_TAOSTATS_KEY"
```

→ Full MCP reference: `references/mcp.md`

---

## Rate Limits & Best Practices

- **Limit**: ~5 req/min free tier — use `sleep 0.3` between calls in loops
- **429 handling**: Check `Retry-After` header; scripts auto-retry
- **Batch**: Use `taostats_batch_apy` for multi-subnet scans
- **Pagination**: Most endpoints support `?page=N&limit=200`; use Python client for auto-pagination

---

## Scripts

| Script | Purpose | Usage |
|---|---|---|
| `scripts/taostats.sh` | Bash helpers (source to use) | `source scripts/taostats.sh; taostats_pool 19` |
| `scripts/taostats_client.py` | Python client (retry, pagination) | `python3 scripts/taostats_client.py dtao/pool/latest/v1?netuid=19` |
| `scripts/balance_history.py` | Daily balance history + stake earnings | `python3 scripts/balance_history.py <coldkey> --days 30 --earnings` |
| `scripts/valis_24hr.py` | Validator 24h stake flow (in/out) | `python3 scripts/valis_24hr.py --top 25` or `--netuid 19` |

Scripts load the API key from the `TAOSTATS_API_KEY` environment variable.

## Reference Files

- `references/api-endpoints.md` — all endpoints with full field lists, verified live + community script patterns
- `references/mcp.md` — MCP tool reference and usage patterns

---

## Verify

After installing this skill and setting the `TAOSTATS_API_KEY`, run a quick check:

```bash
curl -s "https://api.taostats.io/api/dtao/pool/latest/v1?netuid=1&limit=1" \
  -H "Authorization: $TAOSTATS_API_KEY" | python3 -c "import sys,json; d=json.load(sys.stdin); print('✅ chain-metrics working:', d['data'][0]['name'], d['data'][0]['price'])"
```

**Expected:** `✅ chain-metrics working:` followed by a subnet name and price. If you get a 401, the API key isn't set correctly. If you get a connection error, check your network.
