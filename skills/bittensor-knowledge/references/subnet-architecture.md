# Subnet Architecture — Deep Reference

Sources:
- https://docs.learnbittensor.org/learn/anatomy-of-incentive-mechanism
- https://github.com/opentensor/bittensor-subnet-template
- https://docs.learnbittensor.org/

---

## What is a Subnet?

A subnet is an **independent AI marketplace** on Bittensor. Each subnet:
- Has a unique `netuid` (integer ID)
- Defines its own digital commodity (what miners produce)
- Defines its own incentive mechanism (how validators score miners)
- Has its own token pool (alpha token ↔ TAO AMM)
- Competes for TAO emissions based on net TAO flows

Bittensor currently supports up to 64 simultaneous subnets (governed by root).

---

## Participant Roles

### Miners
- Register a UID on the subnet
- Run an axon (HTTP server) serving the subnet's task
- Respond to validator queries
- Earn TAO based on their aggregate validator score (Yuma Consensus)
- Optimize for the incentive mechanism to maximize emissions

### Validators
- Register a UID on the subnet with significant stake
- Query miners continuously to evaluate their output quality
- Submit weight vectors on-chain (periodically, per tempo)
- Weights = their rankings of each miner's performance
- Earn via bonds (proportional to consensus accuracy)

### Subnet Owner
- Registers the subnet (costs TAO, one-time burn)
- Designs and maintains the incentive mechanism code
- Earns 18% of subnet emissions (passively)
- Can update subnet hyperparameters via `btcli sudo`
- Responsible for documentation, miner/validator onboarding, exploit prevention

### Stakers
- Not registered on subnet
- Stake TAO to validator hotkeys → receive alpha tokens
- Earn proportional share of validator's dividends
- Can stake to any validator on any subnet

---

## Incentive Mechanism Design

The incentive mechanism defines:
1. **The task** — what miners must produce (e.g., LLM inference, image generation, storage proof)
2. **The scoring function** — how validators evaluate miner output
3. **The weight-setting logic** — how validator scores map to weights (0.0–1.0 per miner)

**Design goals:**
- Make the desired output the dominant strategy for miners
- Make accurate evaluation the dominant strategy for validators
- Prevent cheap exploits (e.g., returning cached responses, weight copying, Sybil attacks)
- Ensure validators can't be gamed (scoring must be verifiable or difficult to fake)

**Multiple mechanisms:** A subnet can implement multiple independent incentive mechanisms. Each has its own bond pool. YC runs separately per mechanism. Allows subnets to incentivize different task types simultaneously.

---

## Subnet Lifecycle

### Creating a Subnet
```bash
btcli subnets create --wallet-name owner_wallet
```
- Burns TAO (dynamic cost, can be expensive — check current price first)
- Owner's hotkey gets UID 0
- Owner can set hyperparameters immediately

### UID Registration
```bash
btcli subnets register --wallet-name miner_wallet --hotkey miner_hk --netuid <netuid>
```
- Burns TAO (dynamic, cheaper than subnet creation)
- Burns recycled when max UIDs reached → lowest-performer UID is pruned
- Immunity period: new UIDs protected from pruning for ~N blocks (configurable)

### Running a Miner
1. Register UID
2. Start axon server (serves synapse requests from validators)
3. Register axon on-chain (IP + port)
4. Keep running — validators query continuously
5. Weights set by validators every tempo → emissions received

### Running a Validator
1. Register UID
2. Accumulate stake (more stake = more influence on consensus)
3. Query miners continuously, score their responses
4. Set weights on-chain every tempo (too frequent = fees; too rare = miss emissions)
5. Earn bonds-based dividends every tempo

---

## Subnet Hyperparameters

Key parameters (configurable by subnet owner via `btcli sudo set`):

| Parameter | Purpose |
|---|---|
| `tempo` | Blocks per epoch (default: 360) |
| `max_allowed_uids` | Max UIDs (miners + validators) |
| `min_allowed_weights` | Min non-zero weight per UID |
| `max_weight_limit` | Maximum weight value |
| `immunity_period` | New UID grace period (blocks) |
| `kappa` | YC clipping threshold (default: 0.5) |
| `rho` | Activity cutoff for validators |
| `validator_prune_len` | Low-stake validator pruning |
| `weights_rate_limit` | Blocks between weight sets |
| `adjustment_interval` | Registration cost adjustment interval |
| `target_regs_per_interval` | Target registration rate |
| `emission_values` | Per-mechanism emission split |

---

## Subnet Template

Official starting point: https://github.com/opentensor/bittensor-subnet-template

Structure:
```
bittensor-subnet-template/
├── neurons/
│   ├── miner.py      # Miner process
│   └── validator.py  # Validator process
├── template/
│   ├── protocol.py   # Synapse definition
│   ├── forward.py    # Validator forward pass (query + score)
│   ├── reward.py     # Scoring/reward function
│   └── __init__.py
├── scripts/
│   └── run_neuron.sh
└── README.md
```

**Key files to customize:**
- `protocol.py` — define your Synapse (input/output schema)
- `reward.py` — define your scoring function (this is your incentive mechanism)
- `neurons/miner.py` — implement your miner's task handler
- `neurons/validator.py` — implement your validator's query + weight-setting loop

---

## Anti-Exploit Strategies

Common exploits and mitigations:

| Exploit | Mitigation |
|---|---|
| **Caching** — return stored answers | Use random/unpredictable queries |
| **Proxy cheating** — forward to another miner | Query uniqueness, response diversity checks |
| **Weight copying** — copy other validators | YC3 bonds punish lagging consensus followers |
| **Sybil attacks** — register many cheap UIDs | Registration cost + immunity period |
| **Score inflation** — validators collude | YC clipping at κ = 0.5 |

---

## Metagraph Attributes Reference

```python
mg = sub.metagraph(netuid=N)

mg.uids           # [0..n] registered UIDs
mg.stake          # TAO staked per UID
mg.trust          # consensus trust score (0–1)
mg.consensus      # consensus score (Σ stake-weighted weights)
mg.incentive      # miner incentive score (post-YC)
mg.dividends      # validator dividend score (bond-based)
mg.emission       # TAO/alpha emitted per UID per block
mg.active         # bool: axon active recently
mg.axons          # AxonInfo: ip, port, hotkey_ss58, coldkey_ss58
mg.last_update    # block number of last weight update per UID
mg.weights        # weight matrix [n_validators × n_miners]
mg.bonds          # bond matrix [n_validators × n_miners]
```

---

## Key Links

- Subnet template: https://github.com/opentensor/bittensor-subnet-template
- Subnet listings (live): https://tao.app
- Run a miner guide: https://docs.learnbittensor.org/mining
- Run a validator guide: https://docs.learnbittensor.org/validating
- Create a subnet: https://docs.learnbittensor.org/managing-subnets
