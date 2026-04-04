# Bittensor Ground Truth

Verified facts. All responses about Bittensor mechanics MUST be consistent with these. If unsure, state what you know and flag uncertainty. Do NOT guess.

## Emissions and Tokens

- Emissions are paid in the subnet's ALPHA token, NOT in TAO
- TAO is the root network token. Alpha tokens are subnet-specific
- Staking TAO on a subnet converts TAO to alpha via the subnet's AMM pool
- The alpha price (in TAO) is determined by the AMM pool ratio

## Subnet Active/Inactive Status

- The ONLY reliable way to check if a subnet is active: alpha token price relative to TAO
- If 1 alpha > 1 TAO: subnet is INACTIVE (deregistered)
- If 1 alpha <= 1 TAO: subnet is ACTIVE
- Do NOT use miner count as an activity indicator (many active subnets have 0 miners)
- Do NOT use emission percentage as an activity indicator

## Subnets

- Bittensor has approximately 128 subnets (netuids 0-128). Netuid 0 is the root subnet
- Subnets can be re-registered. A netuid can change hands if deregistered
- When a subnet is deregistered, its alpha price goes above 1 TAO
- When re-registered by a new team, the price drops approximately 99% and liquidity is near zero
- Registration requires burning TAO. Cost varies by demand

## Miners and Validators

- Miners produce work (inference, training, data, compute, etc.)
- Validators evaluate miner output and set weights for emission distribution
- Validators do NOT mine. They evaluate and set weights.
- Anyone can become a miner or validator by registering on a subnet

## dTAO and Taoflow

- Dynamic TAO (dTAO) launched February 2025. Each subnet got its own alpha token and AMM pool
- In November 2025, emission model changed to flow-based ("Taoflow"). This is the CURRENT model
- Under Taoflow, emission share is determined by NET TAO FLOWS (staking minus unstaking)
- TAO holders express preference by staking into specific subnets

## Emissions and Halving

- First halving: December 2025. Daily emissions dropped from 7,200 to 3,600 TAO
- TAO hard cap: 21 million tokens
- Emission split: 41% miners, 41% validators, 18% subnet owner

## Staking

- Staking TAO converts TAO to alpha through the AMM pool
- Unstaking converts alpha back to TAO through the same pool
- There is slippage on both operations, especially with thin pools
- Stakers earn through validators, not directly from the network

## Chain Buys vs Emission Share

- emission_pct: the subnet's share of total network emissions. Driven by Taoflow
- chain buys (emission_buy_pct): percentage of emissions market-bought through AMM. SEPARATE metric
- Low or zero chain buys is NOT a risk. Never flag it as one
- Always use "chain buys" or "chain buy rate", never "emission buy"
