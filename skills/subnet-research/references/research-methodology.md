# Research Methodology — Subnet Research Skill

## Why Three Phases?

This skill uses an iterative research approach inspired by autonomous experimentation frameworks: **scan broadly, identify what's interesting, then dig into what matters**. This prevents two common failure modes:

1. **Data dumping** — pulling everything and overwhelming the user with raw numbers. The three-phase approach ensures the bot interprets the data and highlights what's notable.
2. **Tunnel vision** — checking one metric and missing the bigger picture. The broad scan ensures we see the full landscape before focusing.

## Signal Threshold Rationale

### Inactive Subnet Detection

**Threshold**: Price consistently > 1 TAO

On Bittensor, each subnet has an alpha token paired with TAO in a liquidity pool. When a subnet is actively used — miners producing, validators staking, community participating — market forces typically keep the alpha price below or near 1 TAO through supply and demand dynamics.

When a subnet is inactive (no real activity, no staking interest), the pool dynamics break down. Protocol-injected TAO accumulates without corresponding organic activity, which paradoxically pushes the price above 1 TAO. This is the inverse of what you'd expect — higher price actually signals *less* activity.

**Cross-reference**: Combine with volume. An inactive subnet will typically show:
- Price > 1 TAO
- Near-zero 24h volume
- No buy/sell activity
- Low or declining validator count

### Liquidity & Slippage Risk

**Thresholds**:
- Slippage > 5% on 10 TAO buy → medium risk
- Slippage > 10% on 10 TAO buy → high risk
- Liquidity < 5% of market cap → thin pool flag

Liquidity matters because Bittensor subnet tokens trade in AMM pools (automated market makers). In a thin pool:
- A 10 TAO purchase might move the price 5-15%
- Exit at scale becomes very expensive (selling drives price down)
- Price metrics become less meaningful (easily manipulated by small trades)

**Slippage estimate approach**: The script simulates a 10 TAO buy via the TaoStats slippage endpoint. This represents a modest trade — if a small trade already causes significant slippage, larger positions are impractical.

In deep dive mode, the script also checks slippage at 1 TAO and 50 TAO to give a slippage curve.

### Root Prop Thresholds

| Range | Assessment | Meaning |
|---|---|---|
| < 0.30 | Good entry | Price is mostly driven by organic demand |
| 0.30 – 0.50 | Caution | Significant protocol influence, but organic component exists |
| 0.50 – 0.70 | Warning | More than half the price is artificial |
| > 0.70 | Avoid | Price is dominated by protocol injection — a pump |

Root prop (root proportion) measures what fraction of a subnet's TAO pool comes from protocol emissions vs organic user staking. A subnet with root_prop of 0.80 means 80% of its price support comes from the protocol, not real demand.

### Net Flow Thresholds

| 7-day flow | Assessment |
|---|---|
| > +50 TAO | Healthy inflow |
| -50 to +50 TAO | Neutral/stable |
| -50 to -100 TAO | Mild outflow |
| < -100 TAO | Significant outflow |

30-day flows provide trend context. A 7-day outflow during a 30-day inflow may just be a temporary dip. Both negative = sustained exodus.

### Fear & Greed Index

| Range | Label | Implication |
|---|---|---|
| 0–29 | Extreme Fear / Fear | Potential buy opportunity if fundamentals are sound |
| 30–69 | Neutral | Normal market conditions |
| 70–100 | Greed / Extreme Greed | Overheated — caution advised |

This is a composite sentiment indicator from TaoStats. It's most useful as a contrarian signal — extreme readings in either direction often precede reversals.

## Combined Signal Patterns

Individual signals tell a story. Combined signals tell a louder one.

| Combination | Interpretation |
|---|---|
| Price > 1 TAO + near-zero volume | Inactive subnet — not worth researching further |
| High root_prop + negative net flows | Artificial price propped up while smart money exits. Strong avoid. |
| Low liquidity + high root_prop | Trap — price looks stable but there's no real market. Exit would be catastrophic. |
| Extreme fear + positive net flows | Contrarian opportunity — sentiment is negative but capital is flowing in. Worth deep dive. |
| Strong dev activity + low price | Early-stage or undervalued. Check social sentiment for catalysts. |
| No dev activity + declining validators | Dying subnet. Risk of deregistration. |
| High slippage + high volume | Market is active but pool is small. Growing interest in a shallow market. |

## Customizing Research Depth

### Quick Check (Phase 1 only)
```bash
python3 scripts/subnet_research.py --netuid 19 --phase broad
```
Returns raw data without signal analysis. Use when you just need the numbers and can interpret them yourself.

### Standard Research (Phases 1 + 2)
```bash
python3 scripts/subnet_research.py --netuid 19
```
Broad scan + signal identification. The default — good for most research queries.

### Full Deep Dive (All 3 Phases)
```bash
python3 scripts/subnet_research.py --netuid 19 --deep
```
Includes conditional deep dives on all flagged signals. Use for thorough due diligence before staking.

### Comparison Mode
```bash
python3 scripts/subnet_research.py --netuid 19 --compare 1,33,64
```
Runs research on multiple subnets for side-by-side analysis. Be mindful of rate limits — each subnet adds ~6 API calls.

## Rate Limit Budget

Each research run makes approximately:
- **4 TaoStats calls** per subnet (pool, subnet_info, validator_yield, slippage) + 1 global (dev_activity)
- **2 Desearch calls** per subnet (twitter search, AI web research)
- **Deep dive adds**: 2-5 additional calls depending on signals

For comparison mode with 3 subnets:
- Phase 1+2: ~18 TaoStats calls + ~6 Desearch calls
- With sleep spacing: ~30-45 seconds total

TaoStats free tier allows ~5 req/min. The script uses `sleep 0.3` between calls and `sleep 1` between subnets to stay within limits. If you hit 429s, the script retries automatically.
