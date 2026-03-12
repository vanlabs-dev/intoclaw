# Yuma Consensus — Deep Reference

Source: https://docs.learnbittensor.org/learn/yuma-consensus
Current version: YC3 (migrated ~2025)

---

## Overview

Yuma Consensus (YC) is the on-chain algorithm that converts validator weight matrices into emissions for miners and validators. It runs within Subtensor at the end of each tempo (~360 blocks, ~72 min).

**Purpose:** Resolve a matrix of subjective validator rankings into fair, collusion-resistant emissions.

---

## Inputs

- Weight matrix **W** where W_ij = weight validator i assigns to miner j (0.0–1.0)
- Stake vector **S** where S_i = stake of validator i
- Hyperparameter κ (default 0.5) — clipping threshold

---

## Step 1: Clipping (anti-collusion)

For each miner j, compute the **benchmark weight** W̄_j:

> W̄_j = max w such that validators holding ≥ κ total stake all set W_ij ≥ w

In plain English: sort validators by how generously they scored miner j. The benchmark is the weight at which at least κ (50%) of total stake supports that score or lower. The "more generous" half gets clipped down.

**Clip each weight:**
```
W̄_ij = min(W_ij, W̄_j)
```

**Why:** If the bottom 50% of stake (by generosity) all score miner j at most x, the top 50% gets clipped to x. Validators can't inflate miner scores beyond what the majority-stake consensus supports. Protects against coordinated over-scoring.

---

## Step 2: Miner Emissions

Each miner j's aggregate ranking:
```
R_j = Σ (S_i × W̄_ij)   for all validators i
```

Miner j's share of the subnet's miner-emissions pool (41% of total subnet emissions):
```
M_j = R_j / Σ R_k   (over all miners k)
```

---

## Step 3: Validator Bonds & Emissions

Validators earn via **bonds** — a measure of how accurately they evaluate miners.

**Bond-weight calculation** (penalizes over-consensus evaluation):

If a validator's original weight W_ij exceeds the consensus benchmark W̄_j, its bond-weight is penalized by factor β:
```
W̃_ij = (1 − β) × W_ij + β × W̄_ij
```

Where β is a configurable hyperparameter. Validators that over-score miners get reduced bond-weight, reducing their validator emissions.

**Why bonds?** Validators are incentivized to track consensus accurately — neither over-scoring (penalized by bonds) nor under-scoring (loses stake-weighted influence). This creates a Nash equilibrium toward honest evaluation.

---

## YC3 Changes (vs. prior versions)

YC3 addresses the **weight copying problem** — validators were copying other validators' weights rather than doing independent work, because independent evaluation was costly and copying was near-free.

YC3 introduces:
- **Bonds that decay toward consensus** — copying validators gradually lose bond share to validators doing genuine independent work
- **Lag-based advantage** — validators who evaluate miners early (before others copy) accumulate stronger bonds
- This makes genuine evaluation the economically rational strategy

**Result:** Validators are incentivized to:
1. Evaluate miners independently and early
2. Predict what consensus will eventually be (not just copy current consensus)

---

## Key Hyperparameters

| Parameter | Symbol | Default | Purpose |
|---|---|---|---|
| Kappa | κ | 0.5 | Clipping threshold (fraction of stake) |
| Beta | β | configurable | Bond penalty for out-of-consensus weights |
| Tempo | — | 360 blocks | How often YC runs |

---

## Multiple Incentive Mechanisms

Subnets can run multiple incentive mechanisms simultaneously. Each mechanism:
- Has its own weight matrix
- Has its own independent bond pool
- YC runs separately for each mechanism
- Emissions are split across mechanisms as configured by the subnet owner

---

## Sources

- https://docs.learnbittensor.org/learn/yuma-consensus
- https://docs.learnbittensor.org/learn/anatomy-of-incentive-mechanism
- Bittensor Whitepaper: https://bittensor.com/whitepaper
