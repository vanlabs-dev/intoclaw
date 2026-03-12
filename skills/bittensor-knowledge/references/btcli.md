# BTCLI — Complete Command Reference

Source: https://docs.learnbittensor.org/btcli (updated Feb 03, 2026)

Install: `pip install bittensor` (btcli is bundled) or `pip install bittensor-cli`
Config file: `~/.bittensor/btcli.yaml`

---

## Global Options

```
btcli [OPTIONS] COMMAND [ARGS]...
  --version              Show BTCLI version
  --commands             Show all commands
  --debug                Save debug log from last command
  --install-completion   Install shell completion
  --show-completion      Show shell completion script
  --help                 Show help
```

---

## btcli config

Manage config file defaults.

```bash
btcli config set                          # Interactive mode
btcli config set --wallet-name default --network finney
btcli config set --safe-staking --rate-tolerance 0.1
btcli config get                          # View current config
btcli config clear                        # Reset to None
```

**Key config options:**
- `--wallet-name` / `--wallet-path` / `--hotkey`
- `--network` — `finney` (mainnet), `test`, or websocket URL
- `--cache` / `--no-cache` — disable caching for metagraph/stake/subnet views
- `--tolerance` — rate tolerance % for transactions (e.g. 0.1 for 0.1%)
- `--safe-staking` / `--no-safe-staking`

**Proxy management:**
```bash
btcli config add-proxy
btcli config proxies
btcli config remove-proxy
btcli config update-proxy
btcli config clear-proxy
```

---

## btcli wallet

Create and manage wallets.

```bash
btcli wallet create --wallet-name mywallet
btcli wallet new-hotkey --wallet-name mywallet --hotkey validator1
btcli wallet new-coldkey --wallet-name mywallet
btcli wallet list
btcli wallet balance --wallet-name mywallet
btcli wallet transfer --wallet-name mywallet --dest <ss58> --amount 10
btcli wallet regen-coldkey --mnemonic "word1 word2 ..."
btcli wallet regen-hotkey --mnemonic "word1 word2 ..."
btcli wallet faucet                       # Testnet only
```

**Security model:**
- Coldkey = funds, keep offline. Generated + stored encrypted locally.
- Hotkey = operational, can be online. Signs weight-sets, axon registration.

---

## btcli stake

Stake TAO to validators (earns alpha tokens and emissions share).

```bash
btcli stake add --wallet-name mywallet --hotkey <validator_hotkey_ss58> --amount 10 --netuid 1
btcli stake remove --wallet-name mywallet --hotkey <validator_hotkey_ss58> --amount 5 --netuid 1
btcli stake show --wallet-name mywallet
btcli stake list --netuid 1
btcli stake move --wallet-name mywallet --origin-hotkey <hk> --dest-hotkey <hk> --amount 5
btcli stake transfer --wallet-name mywallet --dest-coldkey <ck> --amount 5
```

**Safe staking:** `--safe` flag checks rate tolerance before executing. Configure with `btcli config set --safe-staking --tolerance 0.1`

---

## btcli subnets

Inspect and manage subnets.

```bash
btcli subnets list                        # All subnets
btcli subnets metagraph --netuid 1        # Full metagraph for subnet 1
btcli subnets create --wallet-name mywallet  # Register a new subnet (burns TAO)
btcli subnets register --wallet-name mywallet --hotkey <hk> --netuid 1  # Register UID on subnet
btcli subnets pow-register               # PoW-based registration
btcli subnets info --netuid 1
```

---

## btcli weights

Set and inspect validator weights.

```bash
btcli weights set --netuid 1 --wallet-name mywallet --hotkey <hk> --uids 0,1,2 --weights 0.5,0.3,0.2
btcli weights reveal --netuid 1
btcli weights commit --netuid 1
```

Note: weight-setting costs TAO in transaction fees. Validators should set weights at a rate appropriate to tempo (no more than 1x per tempo = once per ~72 min).

---

## btcli sudo

Subnet owner admin commands (requires subnet owner coldkey).

```bash
btcli sudo set --netuid 1 --param <param_name> --value <value>
btcli sudo get --netuid 1
```

**Configurable subnet hyperparameters (examples):**
- `tempo` — blocks per tempo
- `max_allowed_uids` — max UIDs on subnet
- `min_allowed_weights` — minimum weight per UID
- `max_weight_limit` — max weight value
- `immunity_period` — new UID protection period
- `kappa` — YC clipping threshold
- `emission_values` — per-mechanism emission splits

---

## btcli liquidity

Uniswap-style liquidity operations for subnet alpha tokens.

```bash
btcli liquidity add --netuid 1 --wallet-name mywallet --tao-amount 10
btcli liquidity remove --netuid 1 --wallet-name mywallet --amount <lp_amount>
btcli liquidity list --netuid 1
```

---

## btcli axon

Register/manage your axon (server endpoint for miners/validators).

```bash
btcli axon serve --wallet-name mywallet --hotkey <hk> --netuid 1 --ip <ip> --port 8091
```

---

## btcli proxy

Delegate coldkey permissions to proxy accounts (keeps coldkey offline).

```bash
btcli proxy add --wallet-name mywallet
btcli proxy remove --wallet-name mywallet
btcli proxy execute --wallet-name mywallet --call <call>
```

---

## btcli crowd (Crowdloan)

Participate in subnet crowdloans.

```bash
btcli crowd contribute --netuid 1 --amount 5 --wallet-name mywallet
btcli crowd list
btcli crowd claim --netuid 1 --wallet-name mywallet
```

---

## btcli view

Generate HTML views of network state (opens in browser).

```bash
btcli view metagraph --netuid 1
btcli view stake
btcli view subnets
```

---

## Common Workflows

### New validator setup
```bash
btcli wallet create --wallet-name validator
btcli wallet new-hotkey --wallet-name validator --hotkey default
btcli subnets register --wallet-name validator --hotkey default --netuid 1
# Fund coldkey, then:
btcli stake add --wallet-name validator --hotkey default --amount 100 --netuid 1
```

### Check your position
```bash
btcli wallet balance --wallet-name mywallet
btcli stake show --wallet-name mywallet
btcli subnets metagraph --netuid 1
```

### Subnet owner: update hyperparameter
```bash
btcli sudo set --netuid <your_netuid> --param tempo --value 360
```

---

## Notes

- **Transaction fees:** Most operations cost TAO. See: https://docs.learnbittensor.org/transaction-fees
- **Rate limits:** Subtensor has rate limits. Avoid hammering queries. See: https://docs.learnbittensor.org/rate-limits
- **Networks:** Always specify `--network finney` for mainnet, `--network test` for testnet
- **Security:** Only use links/commands from official docs — phishing attempts exist in the ecosystem
