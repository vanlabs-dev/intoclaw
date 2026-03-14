# Trading Safety Patterns

Trading through an AI agent carries real financial risk. This reference defines the safety patterns that the bitget-trading skill enforces.

---

## Core Principle

**Every action that moves money requires explicit user confirmation.** The agent narrates what it's about to do, shows the parameters, and waits for a clear "yes" before executing.

---

## Confirmation Tiers

### Tier 1: No Confirmation Needed (Read-Only)
- Checking prices, tickers, candles
- Viewing balances and positions
- Checking order history and fills
- Viewing funding rates, open interest
- Listing available contracts or coins

### Tier 2: Single Confirmation (Reversible Trading)
- Placing limit orders (can be cancelled before fill)
- Placing plan/trigger orders
- Modifying existing orders (TP/SL, price, size)
- Cancelling orders
- Setting leverage or margin mode
- Following/unfollowing copy traders
- Subscribing to savings products

Before executing, show:
```
I'm about to place a LIMIT BUY order:
  Symbol:  BTCUSDT
  Size:    0.001 BTC
  Price:   $50,000
  Total:   ~$50 USDT

Confirm? (yes/no)
```

### Tier 3: Double Confirmation (Irreversible or High-Risk)
- Placing market orders (instant execution, no take-backs)
- Flash-closing all positions
- Withdrawals
- Large orders (>5% of account balance)
- First trade on a new symbol
- Futures orders with leverage >10x

First confirmation shows the order details. Second confirmation adds a warning:
```
This is a MARKET order — it will execute immediately at the current price.
Are you sure? (yes/no)
```

---

## Size Guardrails

Before any order, check these conditions:

1. **Balance check**: Does the account have enough to cover the order?
2. **Position check**: For futures, what's the current position? Would this add to it or reverse it?
3. **Leverage check**: What's the current leverage setting? Flag if >10x.
4. **Existing orders**: Are there open orders on the same symbol that might interact?

If any check raises a concern, narrate it before asking for confirmation.

---

## Error Handling

### Common Error Codes

| Code | Meaning | Action |
|------|---------|--------|
| `00000` | Success | Proceed |
| `40018` | Invalid API key | Check .env credentials |
| `40019` | Invalid passphrase | Passphrase is wrong or changed |
| `40102` | Timestamp too far from server | Sync system clock |
| `43011` | Insufficient balance | Show balance and order cost |
| `43012` | Order size below minimum | Show minimum size for the symbol |
| `45110` | Rate limit exceeded | Wait and retry |
| `40034` | Symbol not found | Check symbol name format |

### On Error

1. Show the error code and message to the user
2. Explain what it means in plain language
3. Suggest a fix
4. Never retry automatically on financial operations — always ask the user

---

## What the Agent Must Never Do

- Place orders without showing the user what's about to happen
- Increase position size without explicit instruction
- Change leverage without explicit instruction
- Execute withdrawals to addresses the user hasn't verified
- Retry failed trading operations automatically
- Hide or minimize error messages from the exchange
- Make assumptions about the user's risk tolerance
- Use funds from accounts the user didn't specify

---

## Narration Pattern

Every trading action follows this flow:

1. **State the intent**: "You want to buy 0.1 BTC at market price."
2. **Show the details**: Symbol, side, type, size, price (or estimated), total cost
3. **Flag any concerns**: High leverage, large size relative to balance, first trade on symbol
4. **Ask for confirmation**: Clear yes/no, with the appropriate tier
5. **Execute and report**: Show the order ID, filled price, status
6. **Follow up if needed**: For limit orders, mention they can check status later

---

## Position Management Best Practices

When the user asks to manage positions:

- Always show current positions before suggesting changes
- When closing, show the P&L impact
- When adding to a position, show the new average entry and total size
- When setting TP/SL, calculate the dollar amounts, not just percentages
- For copy trading, show the trader's recent performance before following
