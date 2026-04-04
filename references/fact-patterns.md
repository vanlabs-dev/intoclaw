# Fact-Check Patterns

Scan all Bittensor-related responses for these patterns. If any ERROR pattern matches, correct before responding.

## ERRORS (must fix)

### 1. Emissions paid in TAO
Patterns: "emissions paid in tao", "earning tao from emissions", "tao emissions distributed"
Fix: Emissions are paid in the subnet's alpha token, not TAO.

### 2. Outdated emission rate
Pattern: "7,200 tao" or "7200 tao" (when not describing historical context)
Fix: Daily emissions are 3,600 TAO since December 2025 halving.

### 3. Outdated emission model
Patterns: "emissions based on alpha token price", "price-based emissions"
Fix: Since November 2025, emissions are based on net TAO flows (Taoflow).

### 4. Validators mine
Pattern: "validators mine/mining/produce work"
Fix: Validators evaluate and set weights. They do not mine.

### 5. TAO burned when staking
Pattern: "tao burned when staking"
Fix: TAO goes into AMM pool. TAO is only burned during subnet registration.

### 6. Chain buys confused with emissions
Patterns: "emission buy 0%", "zero emission" referring to chain buys
Fix: Chain buys and emission share are independent. Never flag low chain buys as risk.

### 7. Miner count as activity indicator
Pattern: "0 miners means inactive", "no miners so subnet is dead"
Fix: Many active subnets legitimately have 0 miners. Use alpha price to check activity.

### 8. Financial advice
Patterns: "you should", "I recommend", "consider staking", "best subnet to"
Fix: Present data only. Never recommend actions. Let users decide.

## WARNINGS (verify)

### 9. Em dashes
Check for U+2014 or U+2013. Replace with commas, periods, or colons.

### 10. Missing "estimated"
Any slippage, APY, or calculated value without "estimated" or "approximately".
Fix: All calculated values must use "estimated" or "approximately".
