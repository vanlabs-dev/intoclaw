#!/bin/bash
# TaoStats API Helper Functions
# Source this file: source ~/.openclaw/workspace/skills/chain-metrics/scripts/taostats.sh

# Resolve script and skill directories regardless of caller's working directory
TAOSTATS_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TAOSTATS_SKILL_DIR="$(dirname "$TAOSTATS_SCRIPT_DIR")"

# Load .env file — skill dir first, then workspace root, then fall back to env
_taostats_load_dotenv() {
    local envfile="$1"
    if [ -f "$envfile" ]; then
        while IFS= read -r line || [ -n "$line" ]; do
            line="${line%%#*}"       # strip comments
            line="${line#"${line%%[![:space:]]*}"}"  # trim leading whitespace
            line="${line%"${line##*[![:space:]]}"}"  # trim trailing whitespace
            [ -z "$line" ] && continue
            case "$line" in *=*) ;; *) continue ;; esac
            local key="${line%%=*}"
            local value="${line#*=}"
            key="${key#"${key%%[![:space:]]*}"}"
            key="${key%"${key##*[![:space:]]}"}"
            value="${value#"${value%%[![:space:]]*}"}"
            value="${value%"${value##*[![:space:]]}"}"
            value="${value#\"}" ; value="${value%\"}"
            value="${value#\'}" ; value="${value%\'}"
            # Only set if not already in environment
            if [ -z "${!key+x}" ]; then
                export "$key=$value"
            fi
        done < "$envfile"
    fi
}

_taostats_load_dotenv "$TAOSTATS_SKILL_DIR/.env"
_taostats_load_dotenv "$TAOSTATS_SKILL_DIR/../../.env"

# Load API key from .env or environment variable
_load_taostats_key() {
    if [ -n "$TAOSTATS_API_KEY" ]; then
        export TAOSTATS_API_KEY
        return 0
    fi
    echo "TAOSTATS_API_KEY not set. Create a .env file in $TAOSTATS_SKILL_DIR or set the variable in your environment." >&2
    return 1
}

_load_taostats_key 2>/dev/null

TAOSTATS_BASE_URL="https://api.taostats.io"

# Internal GET with retry and rate-limit handling
# Respects Retry-After header from 429 responses (official pattern from taostat/apibase.py)
_taostats_get() {
    local endpoint="$1"
    local max_retries=3
    local retry_delay=60
    local attempt=0

    while [ $attempt -lt $max_retries ]; do
        local response
        response=$(curl -s "${TAOSTATS_BASE_URL}${endpoint}" \
            -H "Authorization: ${TAOSTATS_API_KEY}" \
            -H "accept: application/json" \
            -w "\n__HTTP_CODE__%{http_code}" 2>&1)

        local http_code
        http_code=$(echo "$response" | grep -o '__HTTP_CODE__[0-9]*' | cut -d_ -f5)
        local body
        body=$(echo "$response" | sed 's/__HTTP_CODE__[0-9]*$//')

        if [ "$http_code" = "429" ]; then
            attempt=$((attempt + 1))
            if [ $attempt -lt $max_retries ]; then
                echo "  Rate limited. Waiting ${retry_delay}s... (retry $attempt/$max_retries)" >&2
                sleep $retry_delay
                continue
            else
                echo "Error: Rate limit exceeded after $max_retries retries" >&2
                return 1
            fi
        fi

        if [ "$http_code" != "200" ]; then
            echo "API error (HTTP $http_code): $body" >&2
            return 1
        fi

        echo "$body"
        return 0
    done
}

# ── dTAO Pool ──────────────────────────────────────────────────────────────

# Full pool data: price, root_prop, fear_and_greed, volume, 7-day history
# Usage: taostats_pool <netuid>
taostats_pool() {
    local netuid="$1"
    [ -z "$netuid" ] && { echo "Usage: taostats_pool <netuid>" >&2; return 1; }
    _taostats_get "/api/dtao/pool/latest/v1?netuid=${netuid}"
}

# Historical pool snapshots
# Usage: taostats_pool_history <netuid> [limit]
taostats_pool_history() {
    local netuid="$1" limit="${2:-100}"
    [ -z "$netuid" ] && { echo "Usage: taostats_pool_history <netuid> [limit]" >&2; return 1; }
    _taostats_get "/api/dtao/pool/history/v1?netuid=${netuid}&limit=${limit}"
}

# Validator APYs — 1h/1d/7d/30d + epoch participation
# Usage: taostats_validator_yield <netuid>
taostats_validator_yield() {
    local netuid="$1"
    [ -z "$netuid" ] && { echo "Usage: taostats_validator_yield <netuid>" >&2; return 1; }
    _taostats_get "/api/dtao/validator/yield/latest/v1?netuid=${netuid}"
}

# All stake positions for a coldkey across all subnets
# ⚠️  balance_as_tao is in RAO — divide by 1e9
# Usage: taostats_stake_balance <coldkey>
taostats_stake_balance() {
    local coldkey="$1"
    [ -z "$coldkey" ] && { echo "Usage: taostats_stake_balance <coldkey>" >&2; return 1; }
    _taostats_get "/api/dtao/stake_balance/latest/v1?coldkey=${coldkey}"
}

# Slippage estimate for a trade
# direction: tao_to_alpha or alpha_to_tao
# Usage: taostats_slippage <netuid> <amount_rao> <direction>
taostats_slippage() {
    local netuid="$1" amount="$2" direction="$3"
    [ -z "$netuid" ] || [ -z "$amount" ] || [ -z "$direction" ] && {
        echo "Usage: taostats_slippage <netuid> <amount_rao> <direction>" >&2
        echo "  direction: tao_to_alpha | alpha_to_tao" >&2
        return 1
    }
    _taostats_get "/api/dtao/slippage/v1?netuid=${netuid}&input_tokens=${amount}&direction=${direction}"
}

# ── Subnet ─────────────────────────────────────────────────────────────────

# Full subnet params: emission, net flows, hyperparams, registration
# Usage: taostats_subnet_info [netuid]  (omit for all subnets)
taostats_subnet_info() {
    local netuid="$1"
    if [ -n "$netuid" ]; then
        _taostats_get "/api/subnet/latest/v1?netuid=${netuid}"
    else
        _taostats_get "/api/subnet/latest/v1"
    fi
}

# Subnet registration details (owner, cost, timestamp)
# Usage: taostats_subnet_registration <netuid>
taostats_subnet_registration() {
    local netuid="$1"
    [ -z "$netuid" ] && { echo "Usage: taostats_subnet_registration <netuid>" >&2; return 1; }
    _taostats_get "/api/subnet/registration/v1?netuid=${netuid}"
}

# Pruning/deregistration risk for all subnets
taostats_pruning() {
    _taostats_get "/api/subnet/pruning/latest/v1"
}

# GitHub dev activity for all subnets
taostats_dev_activity() {
    _taostats_get "/api/dev_activity/latest/v1"
}

# ── Validator ──────────────────────────────────────────────────────────────

# Current validator state: APR, nominator returns, stake changes
# Usage: taostats_validator_info <netuid>
taostats_validator_info() {
    local netuid="$1"
    [ -z "$netuid" ] && { echo "Usage: taostats_validator_info <netuid>" >&2; return 1; }
    _taostats_get "/api/validator/latest/v1?netuid=${netuid}"
}

# Historical validator performance (daily)
# Usage: taostats_validator_history <netuid> <hotkey> [limit]
taostats_validator_history() {
    local netuid="$1" hotkey="$2" limit="${3:-100}"
    [ -z "$netuid" ] || [ -z "$hotkey" ] && {
        echo "Usage: taostats_validator_history <netuid> <hotkey> [limit]" >&2; return 1
    }
    _taostats_get "/api/validator/history/v1?netuid=${netuid}&hotkey=${hotkey}&limit=${limit}"
}

# ── Metagraph / Neurons ────────────────────────────────────────────────────

# Full neuron state for a subnet
# Usage: taostats_metagraph <netuid> [limit]
taostats_metagraph() {
    local netuid="$1" limit="${2:-256}"
    [ -z "$netuid" ] && { echo "Usage: taostats_metagraph <netuid> [limit]" >&2; return 1; }
    _taostats_get "/api/metagraph/latest/v1?netuid=${netuid}&limit=${limit}"
}

# ── Wallet / Transactions ──────────────────────────────────────────────────

# Free TAO balance (not staked)
# Usage: taostats_coldkey_balance <coldkey>
taostats_coldkey_balance() {
    local coldkey="$1"
    [ -z "$coldkey" ] && { echo "Usage: taostats_coldkey_balance <coldkey>" >&2; return 1; }
    _taostats_get "/api/wallet/coldkey/balance/latest/v2?coldkey=${coldkey}"
}

# Stake/unstake transaction history
# Usage: taostats_delegation_history <coldkey> [limit]
taostats_delegation_history() {
    local coldkey="$1" limit="${2:-50}"
    [ -z "$coldkey" ] && { echo "Usage: taostats_delegation_history <coldkey> [limit]" >&2; return 1; }
    _taostats_get "/api/delegation/v1?nominator=${coldkey}&action=all&page=1&limit=${limit}"
}

# TAO transfer history (non-staking)
# Usage: taostats_transfer_history <coldkey> [limit]
taostats_transfer_history() {
    local coldkey="$1" limit="${2:-50}"
    [ -z "$coldkey" ] && { echo "Usage: taostats_transfer_history <coldkey> [limit]" >&2; return 1; }
    _taostats_get "/api/transfer/v1?from=${coldkey}&limit=${limit}"
}

# ── Compound Helpers ───────────────────────────────────────────────────────

# Entry validation: root_prop + price + fear & greed
# Usage: taostats_entry_check <netuid> [threshold]
taostats_entry_check() {
    local netuid="$1" threshold="${2:-0.30}"
    [ -z "$netuid" ] && { echo "Usage: taostats_entry_check <netuid> [threshold]" >&2; return 1; }

    local pool
    pool=$(taostats_pool "$netuid") || return 1
    local root_prop price sentiment
    root_prop=$(echo "$pool" | jq -r '.data[0].root_prop')
    price=$(echo "$pool" | jq -r '.data[0].price')
    sentiment=$(echo "$pool" | jq -r '.data[0].fear_and_greed_sentiment')

    if (( $(echo "$root_prop < $threshold" | bc -l) )); then
        echo "✅ SN${netuid}: GOOD entry | price: ${price} | root_prop: ${root_prop} | sentiment: ${sentiment}"
        return 0
    else
        echo "⚠️  SN${netuid}: CAUTION | price: ${price} | root_prop: ${root_prop} (>${threshold}) | sentiment: ${sentiment}"
        return 1
    fi
}

# Get top N validators by 7-day APY for a subnet
# Usage: taostats_top_validators <netuid> [n]
taostats_top_validators() {
    local netuid="$1" n="${2:-5}"
    [ -z "$netuid" ] && { echo "Usage: taostats_top_validators <netuid> [n]" >&2; return 1; }
    taostats_validator_yield "$netuid" | jq -r --arg n "$n" \
        '.data | sort_by(-.seven_day_apy) | .[:($n | tonumber)] | .[] |
        "\(.name // .hotkey.ss58): \(.seven_day_apy * 100 | . * 10 | round / 10)% APY (7d) | participation: \(.seven_day_epoch_participation)"'
}

# Get fear & greed index
# Usage: taostats_sentiment <netuid>
taostats_sentiment() {
    local netuid="$1"
    [ -z "$netuid" ] && { echo "Usage: taostats_sentiment <netuid>" >&2; return 1; }
    taostats_pool "$netuid" | jq -r '.data[0] | "Index: \(.fear_and_greed_index) | Sentiment: \(.fear_and_greed_sentiment)"'
}

# Price changes across timeframes
# Usage: taostats_price_change <netuid>
taostats_price_change() {
    local netuid="$1"
    [ -z "$netuid" ] && { echo "Usage: taostats_price_change <netuid>" >&2; return 1; }
    taostats_pool "$netuid" | jq -r '.data[0] |
        "1h: \((.price_change_1_hour // 0) * 100 | . * 10 | round / 10)% | 1d: \((.price_change_1_day // 0) * 100 | . * 10 | round / 10)% | 1w: \((.price_change_1_week // 0) * 100 | . * 10 | round / 10)% | 1m: \((.price_change_1_month // 0) * 100 | . * 10 | round / 10)%"'
}

# Total staked TAO for a coldkey (across all subnets)
# Usage: taostats_total_staked <coldkey>
taostats_total_staked() {
    local coldkey="$1"
    [ -z "$coldkey" ] && { echo "Usage: taostats_total_staked <coldkey>" >&2; return 1; }
    taostats_stake_balance "$coldkey" | jq -r \
        '[.data[].balance_as_tao | tonumber] | add / 1000000000 | "\(. | . * 1000 | round / 1000) TAO"'
}

# Net flow summary for a subnet
# Usage: taostats_flow <netuid>
taostats_flow() {
    local netuid="$1"
    [ -z "$netuid" ] && { echo "Usage: taostats_flow <netuid>" >&2; return 1; }
    taostats_subnet_info "$netuid" | jq -r '.data[0] |
        "SN\(.netuid) net flows → 1d: \(.net_flow_1_day) | 7d: \(.net_flow_7_days) | 30d: \(.net_flow_30_days) | ema_tao_flow: \(.ema_tao_flow)"'
}

# Batch APY check for multiple subnets
# Usage: taostats_batch_apy 1 19 33 64
taostats_batch_apy() {
    for netuid in "$@"; do
        local max_apy
        max_apy=$(taostats_validator_yield "$netuid" 2>/dev/null |
            jq -r '.data | max_by(.seven_day_apy) | .seven_day_apy * 100' 2>/dev/null || echo "N/A")
        printf "SN%-4s %s%%\n" "$netuid" "$max_apy"
        sleep 0.3
    done
}

# ── Unit Conversion ────────────────────────────────────────────────────────

rao_to_tao() { echo "scale=9; ${1} / 1000000000" | bc -l; }
tao_to_rao() { echo "${1} * 1000000000" | bc | cut -d. -f1; }

# ── Export ─────────────────────────────────────────────────────────────────

export -f _taostats_get
export -f taostats_pool taostats_pool_history
export -f taostats_validator_yield taostats_validator_info taostats_validator_history
export -f taostats_stake_balance taostats_slippage
export -f taostats_subnet_info taostats_subnet_registration taostats_pruning taostats_dev_activity
export -f taostats_metagraph
export -f taostats_coldkey_balance taostats_delegation_history taostats_transfer_history
export -f taostats_entry_check taostats_top_validators taostats_sentiment
export -f taostats_price_change taostats_total_staked taostats_flow taostats_batch_apy
export -f rao_to_tao tao_to_rao

echo "✅ TaoStats helpers loaded. Functions: taostats_pool, taostats_validator_yield, taostats_stake_balance, taostats_entry_check, ..."
