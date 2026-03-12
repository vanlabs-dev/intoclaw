# Emissions — Deep Reference

Sources:
- https://docs.learnbittensor.org/learn/emissions
- https://docs.taostats.io/docs/tao-emission

---

## Overview

Emissions = the economic heartbeat of Bittensor. Every block, new liquidity flows into the network. Every tempo (~72 min), it's distributed to participants based on performance.

Two stages:
1. **Injection** — TAO and alpha tokens flow into subnet liquidity pools every block
2. **Distribution** — accumulated alpha is distributed to miners, validators, stakers, and subnet owner every tempo via Yuma Consensus

---

## Stage 1: Injection

Every block, each subnet receives a TAO injection into its reserve pool. The injection amount is determined by the subnet's emission share.

### Flow-Based Model (Active as of November 2025)

Replaced the price-based model. Now based on **net TAO flows** — staking minus unstaking activity.

**Formula:**

Track net flow each block:
```
net_flow_i = Σ TAO_staked − Σ TAO_unstaked
```

Update 86.8-day EMA (smoothing factor α ≈ 0.000003209):
```
S_i = (1 − α) × S_{i-1} + α × net_flow_i
```

- α is tiny (~0.0000032%) — 99.9999968% of the EMA comes from the prior value
- Half-life: ~30 days (takes 30 days for EMA to move halfway toward a new sustained flow level)
- Window: ~86.8 days

Apply offset and clip:
- Subnets with negative net flow (more unstaking than staking) → zero injection
- Positive-flow subnets compete for the total emission budget proportionally

**Why flow-based?** The previous price-based model was gameable — established subnets maintained high emissions via "TAO treasury" strategies even when users were leaving. Flow-based rewards genuine engagement.

### Alpha Token Injection

Alongside TAO:
- Alpha is injected into the subnet's alpha reserve (maintains price stability)
- Alpha is allocated to "alpha outstanding" — the pool to be distributed to participants

---

## Stage 2: Distribution (every tempo, ~360 blocks, ~72 min)

At each tempo end, Yuma Consensus runs and distributes accumulated alpha:

| Recipient | Share |
|---|---|
| Miners | 41% |
| Validators (via bonds) | 41% |
| Subnet Owner | 18% |

**Stakers** earn via their validator: when a validator earns alpha, their stakers receive a proportional share (after the validator's take).

---

## Alpha Tokens & Dynamic TAO (dTAO)

Each subnet has its own **alpha token** (α_subnet). These are:
- Minted when TAO is staked to a validator on that subnet
- Burned when TAO is unstaked
- Priced via an AMM (Uniswap-style) pool: TAO ↔ alpha

**Why alpha?** Decouples subnet-level incentives from global TAO. Each subnet has its own token economy. Strong subnets accumulate more TAO in their pools → higher alpha price → more attractive to stake.

**Dynamic TAO (dTAO):** The broader system where subnet token prices/flows dynamically drive TAO emission distribution across subnets — replacing the old root-network-controlled allocation model. Market-driven rather than governance-driven.

---

## EMA & Exponential Moving Averages

Used extensively in Bittensor for smoothing volatile signals:

- Emission distribution: 86.8-day EMA of net TAO flows
- Subnet token prices: EMA-smoothed for stability
- Validator trust scores: EMA of past performance

General formula:
```
EMA_t = (1 − α) × EMA_{t-1} + α × value_t
```

Where α controls the smoothing window (smaller α = longer memory).

---

## TAO Supply & Halving

- Max supply: 21,000,000 TAO (Bitcoin-mirrored)
- Halvings: every 10.5M blocks (~4 years)
- Current emission rate: declines over time as halvings occur
- Block time: ~12 seconds

---

## Previous Price-Based Model (Historical)

Pre-November 2025:
- Subnet emission share ∝ smoothed alpha token price
- Created "price inertia" — established subnets kept high emissions even during mass unstaking
- Vulnerable to "TAO treasury" gaming: buying alpha to boost price without genuine user activity
- Replaced by flow-based model

---

## Sources

- https://docs.learnbittensor.org/learn/emissions
- https://docs.taostats.io/docs/tao-emission
- Dynamic TAO Whitepaper (linked from learnbittensor.org)
