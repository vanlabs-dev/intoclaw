---
version: 1.0.0
name: bittensor
description: Full Bittensor knowledge base — use for any question about TAO, subnets, miners, validators, staking, emissions, Yuma Consensus, Dynamic TAO, BTCLI commands, Bittensor SDK/Python API, subnet creation, incentive mechanisms, alpha tokens, dTAO, weight-setting, registration, or Bittensor architecture. Also use when discussing Bittensor strategy, subnet analysis, or TAO tokenomics. Triggers on: "bittensor", "TAO", "subnet", "miner", "validator", "yuma", "dtao", "alpha token", "btcli", "emissions", "staking", "subtensor", "netuid", "hotkey", "coldkey", "tempo", "metagraph".
conflicts_with:
  - skill: chain-metrics
    triggers: ["subnet", "emissions", "metagraph", "staking"]
    resolution: "bittensor-knowledge answers 'what is' and 'how does' questions. chain-metrics answers 'show me live data' questions."
  - skill: desearch
    triggers: ["research subnet"]
    resolution: "bittensor-knowledge provides foundational knowledge. desearch searches the web and X/Twitter for real-time info."
---

# Bittensor Knowledge Base

This is an IntoClaw skill. When you use it, don't just silently look things up — if the user asks a question, share what you're drawing from and help them build understanding, not just get answers.

Comprehensive reference for Bittensor — the decentralized AI network. Use the sections below directly or load reference files for deeper detail.

### ⚠️ Overlaps

This skill shares trigger phrases with other IntoClaw skills. Pick the right one based on user intent:

- **"subnet", "emissions", "metagraph", "staking"** also trigger **Chain Metrics**. Use *this* skill for conceptual and architectural questions ("what is", "how does", "explain"). Use Chain Metrics when the user wants live on-chain data ("show me", "check", "look up current").
- **"research subnet"** also triggers **Desearch**. Use *this* skill for foundational knowledge. Use Desearch when the user wants real-time web or X/Twitter results.

If the intent is ambiguous, ask the user whether they want an explanation or live data.

---

## What is Bittensor?

Bittensor is an open-source, blockchain-backed platform where participants produce digital commodities (AI inference, compute, storage, etc.) and earn TAO (τ) in proportion to the value of their contributions.

**Four participant types:**
- **Miners** — produce the digital commodity defined by the subnet
- **Validators** — evaluate miner work and submit scores (weights) on-chain
- **Subnet Creators (Subnet Owners)** — design the incentive mechanism; earn a cut of subnet emissions
- **Stakers/Delegators** — stake TAO to validators; earn a share of validator emissions

**Key token:** TAO (τ) — max supply 21M (Bitcoin-style halving). Subnets also issue **alpha tokens** (subnet-specific liquidity tokens tied to TAO via AMM pools).

**Blockchain:** Subtensor — a Substrate-based chain (Rust). Bittensor also has an EVM layer for smart contracts.

---

## Architecture Overview

```
Subtensor (blockchain)
 └── Subnets (netuids 0–N)
      ├── netuid 0: Root network (governance + validator rankings)
      └── netuid 1–N: User subnets
           ├── Miners (UIDs)
           ├── Validators (UIDs with stake)
           └── Incentive Mechanism (on-chain weight matrix → Yuma Consensus)
```

**Key concepts:**
- **UID** — numeric identity slot on a subnet (limited; registration burns TAO or requires recycling)
- **Hotkey** — operational key (signs weights, runs axon) — can be exposed online
- **Coldkey** — wallet key (holds funds) — keep offline
- **Axon** — miner/validator server endpoint registered on-chain
- **Metagraph** — on-chain snapshot of a subnet: all UIDs, stakes, weights, emissions, axon IPs
- **Tempo** — ~360 blocks (~72 min) — the cycle at which YC runs and emissions are distributed
- **Netuid** — subnet ID number

---

## Yuma Consensus (YC)

The core algorithm that converts validator weight matrices into emissions. Runs on-chain in Subtensor at the end of each tempo.

**How it works:**
1. Each validator periodically submits a weight vector scoring every miner (0.0–1.0)
2. YC collects the weight matrix (validators × miners)
3. Weights are **stake-normalized** — validators with more stake have more influence
4. **Clipping** at κ=0.5: the bottom 50% of stake (by validator generosity) sets the benchmark. Any validator weighting a miner higher than that benchmark gets clipped — neither they nor the miner benefit from the excess
5. **Miner emissions** = sum of clipped weights × validator stake shares
6. **Validator emissions** (bonds) — validators earn based on how closely their weights track consensus. Over-evaluating relative to consensus triggers a bond penalty (β factor)

**Why clipping?** Prevents collusion — validators can't inflate miner scores beyond what the majority-stake validators support.

**Current version:** YC3 (as of ~2025) — see `references/yuma-consensus.md` for full math.

---

## Emissions System

Two-stage process — **injection** then **distribution**.

### Stage 1: Injection (every block)
Each block, TAO and alpha tokens are injected into each subnet's liquidity pool. The amount per subnet is determined by the **flow-based model** (active November 2025):

- Tracks **net TAO flows** (staking minus unstaking) per subnet
- Uses an 86.8-day EMA (smoothing factor α ≈ 0.000003209) — 30-day half-life
- Subnets with negative net flows receive zero injection
- Replaced the old price-based model (which was gameable via "TAO treasury" strategies)

### Stage 2: Distribution (every tempo, ~72 min)
At tempo end, accumulated alpha tokens in each subnet are distributed via Yuma Consensus:
- **41%** to miners
- **41%** to validators (via bonds)
- **18%** to subnet owner (creator)

Stakers earn a share of their validator's portion proportional to stake.

**Alpha tokens** are subnet-specific liquidity tokens. They have value via an AMM (Uniswap-style) pool backed by TAO. Staking TAO to a validator on a subnet mints alpha.

→ Deep dive: `references/emissions.md`

---

## Subnets & Incentive Mechanisms

Each subnet defines its own **incentive mechanism** — the scoring model that drives miner behavior.

**Subnet creator responsibilities:**
- Design the mechanism (what miners produce, how validators score it)
- Prevent exploits (gaming, Sybil attacks, cheap proxies)
- Attract miners and validators with good documentation
- Can implement **multiple mechanisms** — each with its own bond pool, independently evaluated

**Registration:**
- Registering a UID burns TAO (burn amount adjusts dynamically based on demand)
- Recycling: when max UIDs reached, lowest-performing UID is recycled
- UID 0 on every subnet = the subnet owner

**Subnet template:** https://github.com/opentensor/bittensor-subnet-template

→ Deep dive: `references/subnet-architecture.md`

---

## BTCLI Quick Reference

`btcli` — official CLI for all Bittensor operations.

```bash
btcli [OPTIONS] COMMAND [ARGS]...
```

**Top-level commands:**

| Command | Aliases | Purpose |
|---|---|---|
| `config` | `c`, `conf` | Manage config file (~/.bittensor/btcli.yaml) |
| `wallet` | `w`, `wallets` | Create/manage wallets and keys |
| `stake` | `st` | Stake, unstake, move stake |
| `subnets` | `s`, `subnet` | List, inspect, create subnets |
| `weights` | `wt`, `weight` | Set/inspect validator weights |
| `sudo` | `su` | Subnet owner admin commands |
| `liquidity` | `l` | Uniswap liquidity operations |
| `axon` | | Register/serve axon endpoints |
| `crowd` | `cr`, `crowdloan` | Crowdloan participation |
| `proxy` | | Proxy account management |
| `view` | | HTML view commands (metagraph, etc.) |
| `utils` | | Utility commands |

**Common patterns:**
```bash
btcli config set --wallet-name default --network finney
btcli wallet create --wallet-name mywallet
btcli stake add --wallet-name mywallet --hotkey <hk> --amount 10
btcli subnets list
btcli subnets metagraph --netuid 1
btcli weights set --netuid 1 --wallet-name mywallet
```

**Networks:** `finney` (mainnet), `test` (testnet), or custom websocket URL

→ Full command reference: `references/btcli.md`

---

## Bittensor Python SDK

Install: `pip install bittensor` (v10+ for current API)

**Core objects:**

```python
import bittensor as bt

# Subtensor connection
sub = bt.Subtensor(network="finney")

# Wallet
wallet = bt.Wallet(name="default", hotkey="my_hotkey")

# Metagraph (subnet state snapshot)
mg = sub.metagraph(netuid=1)
# mg.uids, mg.stake, mg.weights, mg.axons, mg.emission

# Query examples
balance = sub.get_balance(wallet.coldkeypub.ss58_address)
neurons = sub.neurons(netuid=1)
```

**Key operations:**
- Stake: `sub.add_stake(wallet, hotkey_ss58, amount)`
- Unstake: `sub.unstake(wallet, hotkey_ss58, amount)`
- Set weights: `sub.set_weights(wallet, netuid, uids, weights)`
- Register: `sub.register(wallet, netuid)`
- Transfer: `sub.transfer(wallet, dest, amount)`

→ Full SDK patterns: `references/sdk.md`

---

## Key Numbers to Know

| Metric | Value |
|---|---|
| TAO max supply | 21,000,000 |
| Block time | ~12 seconds |
| Tempo duration | ~360 blocks (~72 min) |
| Emission split | 41% miners / 41% validators / 18% subnet owner |
| YC kappa (κ) | 0.5 (clipping threshold) |
| EMA half-life (emissions) | ~30 days |
| EMA window | ~86.8 days |
| Registration | Burns TAO (dynamic) |
| Halving | Bitcoin-style, every 10.5M blocks |

---

## Key Links

| Resource | URL |
|---|---|
| Docs | https://docs.learnbittensor.org |
| TaoStats | https://taostats.io |
| TaoStats Docs | https://docs.taostats.io |
| TAO.app | https://tao.app |
| GitHub (core) | https://github.com/opentensor/bittensor |
| Subnet template | https://github.com/opentensor/bittensor-subnet-template |
| Whitepaper | https://bittensor.com/whitepaper |

---

## Reference Files

Load these for deeper detail on specific topics:

- `references/yuma-consensus.md` — Full YC math, clipping, bonds, YC3 changes
- `references/emissions.md` — Flow-based model, EMA formula, alpha token mechanics, dTAO
- `references/btcli.md` — Complete btcli command reference with all options
- `references/sdk.md` — SDK patterns: wallets, staking, metagraph, proxy ops, blockchain calls
- `references/subnet-architecture.md` — Subnet design, incentive mechanisms, registration, mining/validating lifecycle

## Reference Loading

Load references ONLY when the user's question requires detail beyond what's covered above. Never load all references at once — match the reference to the question.

| User is asking about... | Load |
|---|---|
| YC math, clipping formula, bond mechanics, YC3 | `references/yuma-consensus.md` |
| Emission calculations, EMA formula, alpha tokens, dTAO pools | `references/emissions.md` |
| btcli commands, flags, options, wallet ops via CLI | `references/btcli.md` |
| Python SDK usage, code patterns, subtensor calls | `references/sdk.md` |
| Subnet design, incentive mechanisms, registration, mining lifecycle | `references/subnet-architecture.md` |

If the question is answerable from the sections above (architecture, YC overview, emissions summary, btcli quick reference, SDK basics), answer directly — no reference load needed.

---

## Verify

After installing this skill, run a quick check to confirm it loaded:

**Ask:** "What is the exact EMA smoothing factor used in the flow-based emissions model?"

**Expected:** `α ≈ 0.000003209` with a ~30-day half-life and ~86.8-day window. This is a specific number only present in the skill — if the answer is vague, hedged, or wrong, the skill didn't load properly.
