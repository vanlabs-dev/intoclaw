---
version: 1.0.0
name: subnet-research
description: >
  Conduct comprehensive, multi-phase research on Bittensor subnets by combining
  live on-chain data (via TaoStats), real-time social sentiment (via Desearch),
  and foundational Bittensor knowledge into a structured research report. Use when
  the user asks to research a subnet, analyze a subnet, compare subnets, evaluate
  a subnet for staking, produce a due diligence report, or assess subnet health.
  Triggers on: "research subnet", "analyze subnet", "compare subnets", "subnet
  due diligence", "subnet health check", "deep dive subnet", "evaluate subnet",
  "subnet report", "should I stake on subnet", "subnet overview", "subnet analysis".
  This skill orchestrates data from multiple sources — it does not replace
  chain-metrics or desearch for single-query lookups.
conflicts_with:
  - skill: bittensor-knowledge
    triggers: ["subnet", "research subnet", "subnet analysis"]
    resolution: "subnet-research produces structured multi-source research reports. bittensor-knowledge answers conceptual questions about how subnets work."
  - skill: chain-metrics
    triggers: ["check subnet", "subnet health", "subnet emissions"]
    resolution: "subnet-research produces full research reports combining multiple data sources. chain-metrics answers specific live data queries (a single endpoint lookup)."
  - skill: desearch
    triggers: ["research subnet", "subnet sentiment"]
    resolution: "subnet-research uses desearch as one input to a structured report. desearch performs standalone web/X searches."
---

# Subnet Research

This is an IntoClaw skill. When you research a subnet for the user, narrate each phase — what you're pulling, why it matters, and what the signals mean. Don't just dump tables. Tell the story.

Multi-phase subnet research combining live chain data (TaoStats), social sentiment (Desearch/X), and Bittensor domain knowledge into a structured report. Inspired by iterative research methodology: broad scan first, identify signals, then deep dive on what matters.

### Overlaps

This skill shares trigger phrases with three other skills:

| Shared triggers | Other skill | How to decide |
|---|---|---|
| "research subnet", "subnet analysis" | Bittensor Knowledge | **"What is a subnet" / "how do emissions work"** → Bittensor Knowledge. **"Research subnet 19" / "analyze this subnet"** → this skill. |
| "check subnet", "subnet health" | Chain Metrics | **"Check subnet 19 price" / specific data lookup** → Chain Metrics. **"Give me the full picture on subnet 19"** → this skill. |
| "research subnet", "subnet sentiment" | Desearch | **"Search X for subnet 19"** → Desearch. **"Research subnet 19" (full report)** → this skill. |

**Rule of thumb**: if the user wants a single data point, use the specialized skill. If they want the full picture, use this skill.

## Prerequisites

This skill requires two API keys. It does **not** introduce new keys — it borrows from existing skills.

| Key | Where to get it | Where to set it |
|---|---|---|
| `TAOSTATS_API_KEY` | [dash.taostats.io](https://dash.taostats.io) | Any `.env` file the script can find (see below) |
| `DESEARCH_API_KEY` | [desearch.ai](https://desearch.ai) | Any `.env` file the script can find (see below) |

**How the script finds keys:** It scans `.env` files in this order — first match wins:
1. This skill's own directory (`skills/subnet-research/.env`)
2. All sibling skill directories (e.g. whatever your TaoStats/Desearch skill dirs are named)
3. Workspace root `.env`
4. Shell environment variables

So if the user already has keys set up for their chain data or search skills, this skill will find them automatically — regardless of what those skill directories are named.

**If the user doesn't have keys yet:** Walk them through getting a TaoStats API key (free at dash.taostats.io) and a Desearch API key (funded account at desearch.ai). They can put both keys in a single `.env` file at the workspace root and all skills will pick them up.

**Python dependencies:** The script needs `requests`, `pyfiglet`, and `matplotlib`. Install from the skill directory:
```bash
pip install -r skills/subnet-research/requirements.txt
```
If `pyfiglet` or `matplotlib` are missing, the script still runs — it just skips the ASCII banner and chart generation.

---

## Research Workflow

The research runs in three phases. Narrate each phase to the user as you go.

### Phase 1 — Broad Scan

**Goal**: Collect the raw data from chain and social sources.

Tell the user: *"Starting the broad scan — pulling live chain data and recent social activity for SN{netuid}."*

Run the research script:
```bash
python3 skills/subnet-research/scripts/subnet_research.py --netuid <N>
```

Adjust the path if the skill is installed elsewhere. The script pulls:
- **Pool data** (TaoStats): price, root_prop, fear & greed, volume, liquidity, market cap
- **Subnet info** (TaoStats): emissions, net flows (7d/30d), hyperparams, startup mode
- **Validator yields** (TaoStats): top validators by 7d APY, participation rates
- **Slippage estimate** (TaoStats): simulated 10 TAO buy to gauge pool depth
- **X/Twitter sentiment** (Desearch): recent posts mentioning the subnet
- **Web research** (Desearch): AI-synthesized overview from web + twitter + reddit

The script outputs structured JSON. Use it to build the report.

For **comparative mode** (multiple subnets):
```bash
python3 skills/subnet-research/scripts/subnet_research.py --netuid 19 --compare 1,33
```

### Phase 2 — Signal Identification

**Goal**: Evaluate the data for notable signals — things that are unusually good, bad, or worth digging into.

Tell the user: *"Analyzing the data for notable signals..."*

The script includes a `signals` section in its output. Key checks:

| Signal | Threshold | Meaning |
|---|---|---|
| **Inactive subnet** | Price consistently > 1 TAO | Likely a zombie subnet — no real market activity, price stays inflated above TAO parity. Flag prominently. |
| **Low liquidity** | Low pool TVL or 24h volume relative to market cap | High slippage risk — large trades cause outsized price swings. Check the slippage estimate in the data. |
| **Root prop elevated** | `root_prop > 0.30` | Price partly driven by protocol injection, not organic demand. Above 0.70 = artificial pump. |
| **Capital outflow** | `net_flow_7_days < 0` or `net_flow_30_days < 0` | Money leaving the subnet. Check if temporary dip or sustained trend. |
| **Extreme sentiment** | `fear_and_greed < 30` or `> 70` | Market extremes. Fear can mean buy opportunity; greed means caution. |
| **Stake concentration** | Top validator holds > 50% of stake | Governance risk — one party controls the subnet. Above 80% = extreme. |
| **Concentrated X chatter** | Few accounts dominating discussion | Organic community vs shill campaign. Note who's talking. |
| **Pruning risk** | `in_danger = true` | Subnet at risk of deregistration. Check immunity period. |

> **Note on dev activity:** The TaoStats dev activity endpoint returns GitHub data keyed by org/owner, not by netuid. Matching to a specific subnet is unreliable, so the script does not flag "no dev activity" as a signal (it would be a false positive for most subnets). The raw dev activity data is still included in the JSON output — the bot can inspect it manually if relevant.

Don't just list signals — interpret them. "Root prop is at 0.45, which means about 45% of this subnet's price comes from protocol TAO injection rather than organic staking. That's in the caution zone."

### Phase 3 — Deep Dive

**Goal**: Follow up on interesting signals from Phase 2.

Tell the user: *"Digging deeper into [specific signal]..."*

This phase is conditional — only run it for signals that warrant more investigation:

| If Phase 2 found... | Deep dive action |
|---|---|
| Validator yields look interesting | Pull full metagraph: `taostats_metagraph <netuid>` — check stake concentration, participation |
| Capital outflow | Check delegation history: is it a few large unstakers or broad exodus? |
| Strong social signals | Run targeted X search for specific concerns or narratives found in Phase 1 |
| Pruning risk flagged | Pull pruning data to confirm severity and timeline |
| Low liquidity flagged | Run slippage estimates at different trade sizes (1, 10, 50 TAO) |

Use the chain-metrics and desearch bash helpers or the Python script's `--deep` flag for targeted pulls.

---

## Report Template

Structure your output like this. Skip sections that don't apply — a short, focused report beats a bloated one.

```markdown
{ascii_header}

# Subnet Research: SN{netuid} — {subnet name}
> Generated: {date} | Data: TaoStats + Desearch

## Overview
What this subnet does, who's behind it, and why it exists.
(Combine bittensor-knowledge context with web research results.)

## On-Chain Health

| Metric | Value | Signal |
|--------|-------|--------|
| Price | {price} TAO | |
| Root Prop | {root_prop} | {Good entry / Caution / Avoid} |
| Fear & Greed | {index} ({sentiment}) | |
| Liquidity | {liquidity} TAO | {Adequate / Thin / Danger} |
| Slippage (10 TAO buy) | {slippage_pct}% | {Acceptable / High / Extreme} |
| Net Flow (7d) | {flow} TAO | {Inflow / Outflow} |
| Net Flow (30d) | {flow} TAO | {Trend direction} |
| Emission | {emission} | |
| Market Cap | {mcap} TAO | |
| Dev Activity | {status} | {Active / Quiet / None} |
| Startup Mode | {yes/no} | |

## Validator Landscape
- Top validators by 7d APY (table)
- Stake concentration — is it spread or whale-dominated?
- Epoch participation rates

## Social Sentiment
- Recent X/Twitter activity summary
- Key voices and narratives
- Community size and engagement level
- Sentiment direction (bullish / bearish / neutral)

## Net Flow Chart
If `chart_path` is present in the output, show the 30-day net flow chart here.
The chart is a PNG file at the path — attach or display it inline.

## Key Findings
1. {Signal} — {interpretation and what it means for the user}
2. {Signal} — {interpretation}
...

## Risk Factors
- {Risk} — {severity: Low/Medium/High/Critical} — {explanation}

## Comparison (if multiple subnets requested)
| Metric | SN{A} | SN{B} | ... |
|--------|-------|-------|-----|
| ... | ... | ... | ... |
```

### Adapting the report

- For a user evaluating staking: emphasize validator yields, root_prop, slippage, and liquidity
- For a developer: emphasize dev activity, emission model, and community engagement
- For a trader: emphasize price action, volume, net flows, and fear/greed
- Always lead with the most important finding, not the most boring metric

---

## Rate Limits

This skill makes multiple API calls per research run. Be mindful:

- **TaoStats**: ~5 req/min on free tier. The script includes `sleep 0.3` between calls.
- **Desearch**: Usage-based billing, generally fast. No hard rate limit but don't spam.
- **Comparison mode**: Each additional subnet multiplies the calls. For 3+ subnets, expect the script to take 30-60 seconds.

If a 429 comes back, the script retries automatically (respects `Retry-After` header).

---

## Scripts

| Script | Purpose | Usage |
|---|---|---|
| `scripts/subnet_research.py` | Multi-phase data collection + signal analysis | `python3 scripts/subnet_research.py --netuid 19` |

The script outputs JSON with these top-level fields:

| Field | Description |
|---|---|
| `ascii_header` | ASCII art banner (e.g. "SN19") — print this at the top of every report. Null if pyfiglet is missing. |
| `chart_path` | File path to a 30-day net flow PNG chart (dark theme, TAO gold line). Show/attach this in the report. Null if matplotlib is missing or generation fails. |
| `pool`, `subnet_info`, `validators`, `slippage` | Raw TaoStats API responses — use for deep inspection if needed. |
| `social`, `web_research` | Raw Desearch API responses. |
| `signals` | Detected signals with severity, value, and plain-English message. |
| `display` | Pre-converted, human-readable values (TAO not rao, percentages not decimals, top validators with correct names and APYs) — narrate directly from it without unit conversion. |

CLI options:
- `--netuid N` (required) — primary subnet to research
- `--compare N,N,N` — additional subnets for side-by-side comparison
- `--phase broad` — run only Phase 1 (skip signal analysis)
- `--deep` — include Phase 3 deep dive data for all flagged signals

## Reference Loading

Load references ONLY when the user's question requires detail beyond what's covered above.

| User is asking about... | Load |
|---|---|
| Research methodology details, signal threshold rationale, liquidity risk framework, customizing research depth | `references/research-methodology.md` |

If the question is answerable from the workflow and signal table above, answer directly — no reference load needed.

---

## Verify

After setting up API keys, test:

```bash
python3 skills/subnet-research/scripts/subnet_research.py --netuid 1 --phase broad
```

**Expected**: JSON output with `pool`, `subnet_info`, `validators`, `slippage`, `social`, `web_research`, and `signals` sections. If you get authentication errors, check that both `TAOSTATS_API_KEY` and `DESEARCH_API_KEY` are set.

Test prompts:
- "Research subnet 19" → full 3-phase report with on-chain data, social sentiment, and key findings
- "Compare subnets 1 and 19" → side-by-side comparison table
- "Is subnet 33 worth staking?" → research report with staking-focused analysis
