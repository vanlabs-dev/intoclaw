# TaoStats API — Full Endpoint Reference

Base URL: `https://api.taostats.io`  
Auth: `Authorization: <api_key>` (no Bearer prefix)  
Pagination: `?page=N&limit=N` — response includes `.pagination.total_pages`  
Live spec verified: 2026-03-11

---

## dTAO Pool

### GET /api/dtao/pool/latest/v1
**Params**: `netuid` (required)  
**The most important endpoint** — price, entry metrics, sentiment, volume.

**Key fields** (verified from live API):
```
netuid, name, symbol
price                    — current alpha price in TAO
root_prop                — % of price from root TAO injection (CRITICAL: <0.30 = organic)
fear_and_greed_index     — 0–100
fear_and_greed_sentiment — "Extreme Fear" | "Fear" | "Neutral" | "Greed" | "Extreme Greed"
market_cap               — alpha market cap in TAO
liquidity                — pool liquidity in TAO
total_tao                — total TAO in pool
total_alpha              — total alpha in pool
alpha_in_pool            — AMM pool alpha balance
alpha_staked             — alpha held by stakers
rank                     — emission rank
startup_mode             — bool: subnet in startup phase
protocol_provided_tao    — TAO from chain emissions
user_provided_tao        — TAO from user staking
protocol_provided_alpha  — alpha from chain
user_provided_alpha      — alpha from users
enabled_user_liquidity   — Uniswap v3 active
swap_v3_initialized      — Uniswap v3 pool initialized
price_change_1_hour      — decimal (0.05 = 5%)
price_change_1_day
price_change_1_week
price_change_1_month
market_cap_change_1_day
tao_volume_24_hr
tao_buy_volume_24_hr
tao_sell_volume_24_hr
alpha_volume_24_hr
alpha_buy_volume_24_hr
alpha_sell_volume_24_hr
tao_volume_24_hr_change_1_day
buys_24_hr, sells_24_hr
buyers_24_hr, sellers_24_hr
highest_price_24_hr, lowest_price_24_hr, last_price
seven_day_prices         — array of historical price points
block_number, timestamp
```

---

### GET /api/dtao/pool/history/v1
**Params**: `netuid`, `limit`, `page`  
Historical snapshots of the pool. Same fields as latest minus some aggregates.

---

### GET /api/dtao/validator/yield/latest/v1
**Params**: `netuid`, `limit`, `page`  
Validator APYs — primary source for staking decisions.

**Key fields**:
```
hotkey.ss58, hotkey.name
name                         — validator display name
netuid
stake                        — validator stake amount
one_hour_apy
one_day_apy
seven_day_apy                — PRIMARY staking metric
thirty_day_apy
one_day_epoch_participation  — 0–1 reliability score
seven_day_epoch_participation
thirty_day_epoch_participation
block_number, timestamp
```

---

### GET /api/dtao/stake_balance/latest/v1
**Params**: `coldkey`  
All stake positions for a wallet.

**⚠️ Bug**: `balance_as_tao` returns rao (raw units). Divide by 1,000,000,000 for TAO.

**Key fields**:
```
netuid
hotkey.ss58
hotkey_name
balance_as_tao           — ⚠️ IN RAO — divide by 1e9
price
root_prop                — per-position root proportion
price_change_1_day
```

---

### GET /api/dtao/slippage/v1
**Params**: `netuid`, `input_tokens` (rao), `direction` (`tao_to_alpha` | `alpha_to_tao`)  
Estimate slippage before executing a trade.

---

## Subnet

### GET /api/subnet/latest/v1
**Params**: `netuid` (optional — omit for all subnets)  
Full subnet state: economics, hyperparams, flows.

**Key fields** (verified from live API):
```
netuid
owner.ss58, owner_hotkey.ss58
registration_block_number, registration_timestamp
registration_cost        — cost to create this subnet (TAO)
neuron_registration_cost — cost to register a UID
max_neurons
neuron_registrations_this_interval
active_keys, validators, active_validators, active_miners, active_dual
emission                 — fraction of total TAO emissions (e.g. 0.03 = 3%)
projected_emission
ema_tao_flow             — EMA of net TAO flows (basis for flow-based emissions)
tao_flow                 — current block's net TAO flow
excess_tao               — TAO excess due to alpha injection limits
net_flow_1_day           — net capital inflow/outflow last 24h
net_flow_7_days
net_flow_30_days
tempo                    — blocks per epoch (usually 360)
kappa                    — YC clipping threshold (usually 0.5)
immunity_period          — blocks new UIDs are protected
min_allowed_weights, max_weights_limit
weights_rate_limit       — min blocks between weight sets
adjustment_interval
activity_cutoff
max_validators
recycled_lifetime, recycled_24_hours, recycled_since_registration
liquid_alpha_enabled
alpha_high, alpha_low    — liquid alpha bounds
commit_reveal_weights_enabled, commit_reveal_weights_interval
yuma3_on                 — YC3 active
subtoken_enabled
bonds_penalty
mech_count, mech_emission_split  — multiple incentive mechanisms
modality, difficulty, min_difficulty, max_difficulty
blocks_since_last_step, blocks_until_next_epoch, blocks_until_next_adjustment
```

---

### GET /api/subnet/registration/v1
**Params**: `netuid`  
Subnet registration details.

**Key fields**: `owner.ss58`, `registration_cost`, `registration_timestamp`, `netuid`

---

### GET /api/subnet/pruning/latest/v1
Deregistration risk data for all subnets. Includes `is_immune`, `pruning_rank`, `total_validators`.

---

## Validator (Legacy / Detailed)

### GET /api/validator/latest/v1
**Params**: `netuid`  
Detailed validator state with nominator metrics.

**Key fields**:
```
name, hotkey.ss58, coldkey.ss58
apr, apr_7_day_average, apr_30_day_average
nominator_return_per_k   — yield per 1000 TAO staked
nominators, nominators_24_hr_change
stake, stake_24_hr_change
validator_stake, system_stake
take                     — commission (0.18 = 18%)
permits                  — subnet UID permissions
dominance, subnet_dominance
```

---

### GET /api/validator/history/v1
**Params**: `netuid`, `hotkey`, `limit`, `page`  
Daily validator performance history.

---

## Metagraph

### GET /api/metagraph/latest/v1
**Params**: `netuid`, `limit`, `page`  
Full neuron state for every UID on a subnet.

**Key fields** (verified from live API):
```
uid, netuid
hotkey.ss58, coldkey.ss58
stake                    — total stake
alpha_stake, root_stake, root_stake_as_alpha, total_alpha_stake
trust, validator_trust, consensus, incentive, mech_incentive
dividends
emission
rank
active, validator_permit, is_immunity_period, is_child_key, is_owner_hotkey
axon                     — {ip, port, protocol}
root_weight
updated, mech_updated    — last weight/update block
registered_at_block
daily_reward             — total daily reward (TAO equivalent)
daily_mining_alpha, daily_mining_alpha_as_tao, daily_mining_tao
daily_validating_alpha, daily_validating_alpha_as_tao, daily_validating_tao
daily_burned_alpha, daily_burned_alpha_as_tao
daily_owner_alpha, daily_owner_alpha_as_tao
daily_total_rewards_as_tao
```

---

## Wallet / Transactions

### GET /api/wallet/coldkey/balance/latest/v2
**Params**: `coldkey`  
Free (unstaked) TAO balance.

---

### GET /api/delegation/v1
**Params**: `nominator` (coldkey), `action` (`all`|`stake`|`unstake`), `limit`, `page`  
Stake/unstake transaction history.

**Key fields**:
```
action                   — "add" (stake) or "remove" (unstake)
amount                   — alpha amount
tao_amount               — TAO equivalent at time of tx
alpha_amount
rate                     — price at time of tx
fee, slippage
block_number, timestamp
hotkey.ss58, coldkey.ss58
```

---

### GET /api/transfer/v1
**Params**: `from` (coldkey), `limit`, `page`  
TAO transfer history (non-staking).

**Key fields**: `from.ss58`, `to.ss58`, `amount`, `fee`, `block_number`, `timestamp`

---

## Analytics

### GET /api/dev_activity/latest/v1
GitHub dev activity metrics for all subnets.
Fields: `netuid`, `commits_7d`, `commits_30d`, `contributors`, `stars`, `forks`, `last_commit`

---

## Account History

### GET /api/account/history/v1
Daily balance snapshots for a coldkey — free, staked, total, broken down by alpha/root.  
Use for portfolio tracking, tax reporting, stake earnings calculation.

**Params**: `address` (coldkey ss58), `timestamp_start` (unix), `timestamp_end` (unix), `limit`, `page`, `order` (`timestamp_asc` | `timestamp_desc`)

**Key fields** (verified from live API — all balance fields in RAO, divide by 1e9):
```
address.ss58, address.hex
block_number, timestamp
rank                         — global TAO rank at that snapshot
balance_free                 — free (unstaked) TAO, in rao
balance_staked               — total staked (all subnets), in rao
balance_staked_alpha_as_tao  — staked in alpha subnets, TAO-equivalent, in rao
balance_staked_root          — staked via root, in rao
balance_liquidity            — liquidity position value, in rao
balance_total                — total balance (free + staked), in rao
root_claim_type
created_on_date, created_on_network
coldkey_swap                 — if coldkey was swapped, shows old/new coldkey
```

**Stake earnings formula** (from official examples):
```
stake_earnings = Σ(daily_staked_change) - Σ(delegation_in) + Σ(undelegation_out)
```
i.e. How much staked balance grew beyond what you manually staked/unstaked.

**⚠️ Timestamp quirk**: Sometimes includes milliseconds (`2024-07-15T22:01:36.001Z`), sometimes not. Handle both formats when parsing.

---

## Blockchain

### GET /api/block/v1
**Params**: `limit` (default 1 = latest block)  
Get current block number and chain state.

**Key fields**:
```
block_number       — current chain block (useful for computing time windows, e.g. 7200 blocks ≈ 24h)
hash, parent_hash
timestamp
validator          — block validator
events_count, extrinsics_count, calls_count
spec_version
```

**Common use**: Get latest block, then subtract 7200 for 24h ago, 50400 for 7 days ago.

---

### GET /api/delegation/v1 (block range filter)
Beyond nominator-filtered queries, delegation events can be fetched by block range across all validators:

**Params**: `block_start`, `block_end`, `page`, `limit`  
No `nominator` filter = all delegation events in that block window.  
Useful for: tracking all staking activity on a subnet, monitoring validator inflows across the network.

---

## Rate Limits & Pagination

- **Rate limit**: ~5 req/min free tier. On 429, check `Retry-After` header.
- **Pagination response**:
```json
{
  "data": [...],
  "pagination": {
    "current_page": 1,
    "per_page": 50,
    "total_items": 347,
    "total_pages": 7,
    "next_page": 2,
    "prev_page": null
  }
}
```

---

## New / Notable Endpoints (from docs changelog)

- `GET /api/liquidity-distributions` — Uniswap v3 liquidity distribution
- `GET /api/subnet/deregistration/ranking` — Subnet deregistration ranking
- `GET /api/usage` — Check your API token usage

---

## Community Scripts (taostat/awesome-taostats-api-examples)

Key patterns from the official examples repo:

### Stake earnings calculation (`delegation_stake_earnings.py`)
Combine `/api/account/history/v1` (daily balance DOD) and `/api/delegation/v1` (explicit stake/unstake events) to isolate pure yield earned vs capital moves.

### Validator 24h flow (`valis_24hour_change.py`)
1. Get current block via `/api/block/v1`
2. `block_start = current_block - 7200` (≈ 24h)
3. Fetch all delegation events in that range (no nominator filter)
4. Aggregate in/out per validator hotkey

### Tax exports
Official templates in repo (`tax templates/`): CoinLedger, Cointracker, Koinly — import the CSV output from account history scripts.

### TypeScript SDK
`typescript/sdk/` — skeleton. Use the REST API directly; Python scripts are more mature.

---

## Validator Ordering

The `/api/validator/latest/v1` endpoint supports ordering:
- `?order=stake_desc` — top validators by stake
- `?order=apr_desc` — top validators by APR
Combine with `?limit=N` for top-N queries.
