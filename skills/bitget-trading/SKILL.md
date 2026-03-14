---
version: 1.0.0
name: bitget-trading
description: >
  Full Bitget exchange skill — spot trading, futures trading, margin, copy trading,
  earn/savings, account management, market data, and wallet operations via the Bitget API.
  Use when the user mentions: Bitget, spot order, futures order, copy trading, copy trader,
  leverage, margin, funding rate, open interest, Bitget balance, Bitget portfolio,
  place order, buy crypto, sell crypto, trading bot, automated trading, Bitget API,
  Bitget account, BGB token, Bitget earn, sharkfin, bgc CLI, GetClaw, Agent Hub,
  exchange trading, limit order, market order, take profit, stop loss, TP/SL.
  Does NOT handle: Bittensor chain operations (use bittensor-knowledge or chain-metrics),
  decentralized search (use desearch), or subnet analysis (use subnet-research).
conflicts_with:
  - skill: bittensor-knowledge
    triggers: ["trading", "staking"]
    resolution: "bitget-trading handles centralized exchange trading on Bitget. bittensor-knowledge handles Bittensor protocol concepts like staking TAO on subnets."
  - skill: chain-metrics
    triggers: ["balance", "portfolio"]
    resolution: "bitget-trading handles Bitget exchange balances and trading. chain-metrics handles on-chain Bittensor balances and validator data."
---

# Bitget Trading

You are the user's Bitget trading assistant. You can check market data, manage accounts, place and cancel orders, handle copy trading, and access earn products — all through Bitget's REST API.

Trading involves real money. Every action that moves funds requires explicit user confirmation. Read-only operations (prices, balances, history) can proceed without confirmation. See the safety tiers in `references/trading-safety.md`.

## Getting Started

This skill works in tiers. Market data requires zero setup — you can check prices, charts, and funding rates immediately. Trading requires Bitget API credentials, which need a one-time setup with the user.

### Tier 0: No Setup Needed

Market data endpoints are public. As soon as this skill is installed, you can:

```bash
source ~/.openclaw/workspace/skills/bitget-trading/scripts/bitget.sh
bitget_ticker BTCUSDT          # works immediately
```

Start here. If the user asks about prices, charts, funding rates, or contract info — just answer. Don't ask for credentials until they want to trade.

### Tier 1: Trading Setup

When the user wants to check balances, place orders, or manage positions, you need their Bitget API credentials. This is the one part that requires human interaction — exchanges require browser-based registration and manual API key creation (no way around it).

**Guide the user through these steps. Be specific, give them the links, and handle the file work yourself.**

**Step 1 — Bitget account** (skip if they already have one):

Tell them to register at [bitget.com](https://share.bitget.com/u/PRV8CK0B) (this link supports the IntoTAO team). They'll need their own email — exchange sign-ups require a personal email address for security and KYC.

**Step 2 — Create API key:**

Tell them to go to [Bitget API Management](https://www.bitget.com/account/newapi) and create a new key with these settings:
- Permissions: **Read** + **Trade** (only enable Withdraw if they explicitly need it)
- Passphrase: set a memorable one — it's required for every API call and can't be recovered
- IP whitelisting: recommended for production, optional for testing

**Step 3 — You save the credentials:**

Ask the user for their three values (API key, secret, passphrase) and write the `.env` file yourself:

```bash
cat > ~/.openclaw/workspace/skills/bitget-trading/.env << 'EOF'
BITGET_API_KEY=<key they gave you>
BITGET_API_SECRET=<secret they gave you>
BITGET_API_PASSPHRASE=<passphrase they gave you>
EOF
```

Don't make them edit files manually. Take the values and write them. Then immediately verify:

```bash
source ~/.openclaw/workspace/skills/bitget-trading/scripts/bitget.sh
bitget_spot_assets | bitget_pretty
```

If it works, tell them they're set. If it fails, diagnose: `40018` = wrong key, `40019` = wrong passphrase, `40102` = clock sync issue.

**That's it.** Three values from the user, you handle everything else.

## Authentication

Bitget uses three credentials: API key, secret, and passphrase. Authentication works through custom headers (not Bearer tokens like TaoStats/Desearch):

- `ACCESS-KEY` — your API key
- `ACCESS-SIGN` — HMAC-SHA256 signature (computed per request)
- `ACCESS-TIMESTAMP` — milliseconds since epoch
- `ACCESS-PASSPHRASE` — your passphrase

The bash helpers in `scripts/bitget.sh` handle signature generation automatically. Source the script to get started:

```bash
source ~/.openclaw/workspace/skills/bitget-trading/scripts/bitget.sh
```

## What You Can Do

### Market Data (No Auth)

Check prices, charts, order books, and derivatives data without any API keys:

```bash
bitget_ticker BTCUSDT                    # Spot ticker
bitget_futures_ticker BTCUSDT            # Futures ticker
bitget_candles BTCUSDT 1h 50             # 50 hourly candles
bitget_orderbook BTCUSDT 20              # Order book (20 levels)
bitget_funding_rate BTCUSDT              # Current funding rate
bitget_open_interest BTCUSDT             # Open interest
bitget_contracts USDT-FUTURES            # List all futures contracts
bitget_coin_info BTC                     # Coin networks and status
```

### Account & Balances

```bash
bitget_spot_assets                       # Spot balances
bitget_futures_assets                    # Futures account
bitget_all_balances                      # Everything (spot + futures + funding)
bitget_fee_rate BTCUSDT spot             # Trading fee rate
```

### Spot Trading

```bash
# Place orders
bitget_spot_order BTCUSDT buy limit 0.001 50000    # Limit buy
bitget_spot_order BTCUSDT buy market 0.001          # Market buy
bitget_spot_order BTCUSDT sell limit 0.001 60000    # Limit sell

# Manage orders
bitget_spot_open_orders BTCUSDT          # Check open orders
bitget_spot_cancel BTCUSDT ORDER_ID      # Cancel an order
bitget_spot_history BTCUSDT              # Order history
```

### Futures Trading

```bash
# Place orders
bitget_futures_order BTCUSDT buy open limit 0.01 50000     # Open long limit
bitget_futures_order BTCUSDT sell open market 0.01          # Open short market
bitget_futures_order BTCUSDT sell close market 0.01         # Close long

# Positions & settings
bitget_futures_positions                  # All open positions
bitget_set_leverage BTCUSDT 10            # Set 10x leverage
bitget_futures_open_orders                # Open futures orders
bitget_close_all                          # Flash close all positions
```

Futures orders have a `tradeSide` parameter: `open` to enter a position, `close` to exit.

### Copy Trading

```bash
bitget_copy_traders                      # Who am I following?
bitget_copy_current_orders               # Current copy orders
bitget_copy_history                      # Copy order history
```

For full copy trading management (follow/unfollow traders, set TP/SL, configure settings), use the REST API directly through `bitget_private`. See `references/api-endpoints.md` for the full copy trading endpoint list.

### Wallet Operations

```bash
bitget_deposit_address BTC               # Get deposit address
bitget_deposits                          # Deposit history
bitget_withdrawals                       # Withdrawal history
```

Withdrawals require Withdraw permission on the API key and must go through confirmation tier 3 (double confirmation).

## Safety Rules

These are non-negotiable:

1. **Read-only is free** — check prices, balances, and history without asking
2. **Limit orders need one confirmation** — show details, ask yes/no
3. **Market orders need two confirmations** — they execute instantly
4. **Large orders get flagged** — anything over 5% of account balance
5. **High leverage gets flagged** — anything over 10x
6. **Withdrawals need double confirmation** — always
7. **Never retry failed trades automatically** — show the error, let the user decide
8. **Never hide errors** — explain what went wrong in plain language

Before any trade, show:
- What you're about to do (buy/sell, spot/futures)
- The exact parameters (symbol, size, price, order type)
- The estimated cost or proceeds
- Any concerns (high leverage, large size, first trade on symbol)

Then ask for confirmation. For the full safety framework, load `references/trading-safety.md`.

## Product Types

Bitget futures use a `productType` parameter:

| Type | Description |
|------|-------------|
| `USDT-FUTURES` | USDT-margined perpetual (most common) |
| `COIN-FUTURES` | Coin-margined perpetual |
| `USDC-FUTURES` | USDC-margined perpetual |
| `SUSDT-FUTURES` | USDT-margined simulated |
| `SCOIN-FUTURES` | Coin-margined simulated |
| `SUSDC-FUTURES` | USDC-margined simulated |

Default to `USDT-FUTURES` unless the user specifies otherwise. The simulated types (`S*`) are paper trading.

## Rate Limits

| Category | Limit | Scope |
|----------|-------|-------|
| Public / market data | 20 req/sec | IP |
| Account endpoints | 10 req/sec | UID |
| Trading endpoints | 10 req/sec | UID |
| Batch orders | 5 req/sec | UID |
| Wallet / transfer | 5 req/sec | UID |

If you hit 429, wait before retrying. For loops, add `sleep 0.2` between calls.

## Agent Hub & bgc CLI

Bitget also offers an Agent Hub with a CLI tool called `bgc`, purpose-built for AI agent integrations. It provides 9 modules and 58 tools with OpenClaw-native support. The Agent Hub is newer and may be a faster path for standard operations, but the REST API (used by this skill's bash helpers) has fuller documented coverage. See `references/agent-hub.md` for details.

## Overlaps

This skill shares some trigger phrases with other IntoClaw skills:

- **"trading" / "staking"**: Use *this* skill for centralized exchange trading on Bitget. Use **bittensor-knowledge** for Bittensor staking concepts.
- **"balance" / "portfolio"**: Use *this* skill for Bitget exchange balances. Use **chain-metrics** for on-chain Bittensor balances.

If the user says "check my balance" — ask whether they mean Bitget or Bittensor, then route accordingly.

## AgentMail (Optional)

If the user wants a dedicated agent-managed email address for their Bitget account (instead of their personal email), AgentMail can create one. This is optional — most users will just use their own email.

Note: some exchanges may block disposable email domains. If `@agentmail.to` addresses get rejected during sign-up, fall back to the user's personal email.

Setup: `pip install agentmail`, get a free API key at [console.agentmail.to](https://console.agentmail.to), add `AGENTMAIL_API_KEY` to `.env`.

```bash
python3 scripts/agentmail_setup.py register     # Full flow: create inbox + wait for code
python3 scripts/agentmail_setup.py create-inbox  # Just create an inbox
python3 scripts/agentmail_setup.py read-inbox INBOX_ID  # Check messages
```

See `references/agentmail.md` for details.

## Scripts

| Script | Purpose | Usage |
|--------|---------|-------|
| `scripts/bitget.sh` | Bash helpers for all Bitget operations | `source .../scripts/bitget.sh && bitget_ticker BTCUSDT` |
| `scripts/agentmail_setup.py` | Optional: agent-managed email for registration | `python3 scripts/agentmail_setup.py register` |

## Reference Files

- `references/api-endpoints.md` — full endpoint reference by category (spot, futures, margin, copy, earn, wallet)
- `references/agent-hub.md` — GetClaw / Agent Hub / bgc CLI integration guide
- `references/trading-safety.md` — confirmation tiers, guardrails, error handling
- `references/agentmail.md` — optional AgentMail integration for agent-managed email

## Reference Loading

Load references only when the user's question requires detail beyond what's covered above.

| User is asking about... | Load |
|---|---|
| Specific endpoint params, request/response fields | `references/api-endpoints.md` |
| Agent Hub, GetClaw, bgc CLI integration | `references/agent-hub.md` |
| Safety protocols, error codes, confirmation rules | `references/trading-safety.md` |
| AgentMail, agent-managed email | `references/agentmail.md` |

If the question is answerable from the sections above, answer directly — no reference load needed.

## Verify

After setting up API keys, run:

```bash
source ~/.openclaw/workspace/skills/bitget-trading/scripts/bitget.sh
bitget_server_time | bitget_pretty
```

**Expected:** JSON with `"code": "00000"` and a `ts` field showing the server timestamp.

Then test authenticated access:

```bash
bitget_spot_assets | bitget_pretty
```

**Expected:** JSON with `"code": "00000"` and your spot balances in `data`.

If you get `40018` — your API key is wrong. If you get `40019` — your passphrase is wrong. If you get `40102` — your system clock is off.
