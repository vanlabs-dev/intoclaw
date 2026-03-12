# Bittensor Python SDK — Reference

Sources:
- https://docs.learnbittensor.org/sdk
- https://docs.learnbittensor.org/sdk/subtensor-api
- https://github.com/opentensor/bittensor

Install: `pip install bittensor` (SDK v10+ current)
Docs: https://docs.learnbittensor.org/sdk

---

## Core Setup

```python
import bittensor as bt

# Connect to network
sub = bt.Subtensor(network="finney")  # or "test", or ws://...

# Load wallet
wallet = bt.Wallet(name="mywallet", hotkey="default")
# Wallet path default: ~/.bittensor/wallets/
```

---

## Wallet Operations

```python
# Create new wallet (programmatic)
wallet = bt.Wallet(name="new_wallet")
wallet.create_if_non_existent()          # Creates coldkey + hotkey if missing
wallet.create_new_coldkey(use_password=True)
wallet.create_new_hotkey(use_password=False)

# Access keys
wallet.coldkeypub.ss58_address           # Coldkey SS58 address
wallet.hotkey.ss58_address               # Hotkey SS58 address

# Check balance
balance = sub.get_balance(wallet.coldkeypub.ss58_address)
print(f"Balance: {balance} TAO")

# Transfer
sub.transfer(wallet=wallet, dest="<ss58_address>", amount=bt.Balance.from_tao(10))
```

---

## Metagraph

The metagraph is a snapshot of a subnet's full state.

```python
mg = sub.metagraph(netuid=1)

# Key attributes
mg.uids           # np.array of all UIDs
mg.stake          # np.array of stake per UID
mg.trust          # np.array of trust scores
mg.consensus      # np.array of consensus scores
mg.incentive      # np.array of incentive (miner score)
mg.dividends      # np.array of dividends (validator score)
mg.emission       # np.array of emission per UID per block
mg.weights        # weight matrix (validators × miners)
mg.bonds          # bond matrix
mg.axons          # list of AxonInfo (ip, port, hotkey, coldkey per UID)
mg.hotkeys        # list of SS58 hotkey addresses per UID
mg.coldkeys       # list of SS58 coldkey addresses per UID
mg.n              # number of registered UIDs
mg.netuid         # subnet ID

# Sync to latest
mg.sync(subtensor=sub)

# Find your UID
my_uid = mg.hotkeys.index(wallet.hotkey.ss58_address)
```

---

## Staking

```python
# Stake TAO to a validator hotkey on a subnet
result = sub.add_stake(
    wallet=wallet,
    hotkey_ss58=validator_hotkey_ss58,
    amount=bt.Balance.from_tao(10),
    netuid=1
)

# Unstake
result = sub.unstake(
    wallet=wallet,
    hotkey_ss58=validator_hotkey_ss58,
    amount=bt.Balance.from_tao(5),
    netuid=1
)

# Move stake between validators
result = sub.move_stake(
    wallet=wallet,
    origin_hotkey_ss58=old_validator_hk,
    destination_hotkey_ss58=new_validator_hk,
    amount=bt.Balance.from_tao(5),
    origin_netuid=1,
    destination_netuid=1
)

# Get stake info
stake_info = sub.get_stake_info_for_coldkey(coldkey_ss58=wallet.coldkeypub.ss58_address)
```

---

## Weight Setting (Validators)

```python
import torch

# Set weights for miners on a subnet
uids = torch.tensor([0, 1, 2, 3])
weights = torch.tensor([0.4, 0.3, 0.2, 0.1])  # Must sum to 1.0

result = sub.set_weights(
    wallet=wallet,
    netuid=1,
    uids=uids,
    weights=weights,
    wait_for_inclusion=True,
    wait_for_finalization=False,
)
```

---

## Registration

```python
# Check registration status
is_registered = sub.is_hotkey_registered(
    netuid=1,
    hotkey_ss58=wallet.hotkey.ss58_address
)

# Register (burns TAO)
result = sub.register(
    wallet=wallet,
    netuid=1,
    wait_for_inclusion=True,
    wait_for_finalization=True,
)

# Get current registration burn cost
burn_cost = sub.recycle(netuid=1)
print(f"Registration cost: {burn_cost} TAO")
```

---

## Subnet Queries

```python
# List all subnets
subnets = sub.get_all_subnet_dynamic_info()

# Get subnet info
info = sub.get_subnet_info(netuid=1)

# Get hyperparameters
hyperparams = sub.get_subnet_hyperparameters(netuid=1)

# Get neurons (full neuron list with all attributes)
neurons = sub.neurons(netuid=1)
neuron = sub.neuron_for_uid(uid=0, netuid=1)
```

---

## Axon & Dendrite (Mining/Validation)

```python
# Axon — serve your miner/validator
axon = bt.Axon(wallet=wallet, port=8091)
axon.attach(
    forward_fn=my_forward_function,
    blacklist_fn=my_blacklist_function,
    priority_fn=my_priority_function,
)
axon.start()

# Register axon on-chain
sub.serve_axon(netuid=1, axon=axon)

# Dendrite — query miners
dendrite = bt.Dendrite(wallet=wallet)
responses = await dendrite.forward(
    axons=mg.axons[target_uids],
    synapse=MySynapse(data="query"),
    timeout=10
)
```

---

## Synapse (Message Protocol)

```python
# Define custom synapse (extends bt.Synapse)
class MySynapse(bt.Synapse):
    prompt: str = ""
    response: str = ""

# Validators send synapses to miners
# Miners receive and respond via axon forward function
```

---

## Environment Variables

```bash
BT_WALLET_NAME=default
BT_WALLET_PATH=~/.bittensor/wallets
BT_WALLET_HOTKEY=default
BT_SUBTENSOR_NETWORK=finney
BT_SUBTENSOR_CHAIN_ENDPOINT=wss://entrypoint-finney.opentensor.ai:443
```

---

## SDK v10 Migration Notes

v10 introduced breaking changes. Key differences:
- Async-first: many calls now `async`/`await`
- `AsyncSubtensor` preferred over `Subtensor` for production
- Improved connection management
- See migration guide: https://docs.learnbittensor.org/sdk/v10-migration

---

## Working with Proxies (SDK)

```python
# Execute calls through a proxy (keeps coldkey offline)
from bittensor.core.extrinsics import GenericCall

result = sub.proxy_call(
    wallet=wallet,           # Proxy wallet
    real_address=real_ss58,  # Real coldkey address
    call=GenericCall(...)    # The wrapped call
)
```

---

## Key Sources

- Full SDK reference: https://docs.learnbittensor.org/sdk/subtensor-api
- GitHub: https://github.com/opentensor/bittensor
- PyPI: `pip install bittensor`
