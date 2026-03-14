#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────
# Bitget API shell helpers for OpenClaw agents
# Source this file: source ~/.openclaw/workspace/skills/bitget-trading/scripts/bitget.sh
# ──────────────────────────────────────────────────────────────

# ── Resolve script directory and load .env ──────────────────
_BITGET_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

_bitget_load_env() {
  local env_file=""
  if [[ -f "$_BITGET_SCRIPT_DIR/.env" ]]; then
    env_file="$_BITGET_SCRIPT_DIR/.env"
  elif [[ -f "${WORKSPACE_ROOT:-.}/.env" ]]; then
    env_file="${WORKSPACE_ROOT:-.}/.env"
  fi
  if [[ -n "$env_file" ]]; then
    set -a
    source "$env_file"
    set +a
  fi
}
_bitget_load_env

# ── Signature generation ────────────────────────────────────
# Bitget uses HMAC-SHA256 signatures with ACCESS-* headers.
# Signature string: timestamp + METHOD + requestPath + body
_bitget_sign() {
  local timestamp="$1"
  local method="$2"
  local path="$3"
  local body="${4:-}"
  local message="${timestamp}${method}${path}${body}"
  echo -n "$message" | openssl dgst -sha256 -hmac "$BITGET_API_SECRET" -binary | openssl base64
}

_bitget_timestamp() {
  # Milliseconds since epoch
  python3 -c "import time; print(int(time.time() * 1000))" 2>/dev/null \
    || python -c "import time; print(int(time.time() * 1000))" 2>/dev/null \
    || echo "$(date +%s)000"
}

# ── Core request functions ──────────────────────────────────
bitget_public() {
  # Public endpoint — no auth needed
  # Usage: bitget_public GET "/api/v2/spot/market/tickers?symbol=BTCUSDT"
  local method="${1:-GET}"
  local path="$2"
  curl -s "https://api.bitget.com${path}" \
    -X "$method" \
    -H "Content-Type: application/json" \
    -H "locale: en-US"
}

bitget_private() {
  # Authenticated endpoint
  # Usage: bitget_private GET "/api/v2/spot/account/assets"
  # Usage: bitget_private POST "/api/v2/spot/trade/place-order" '{"symbol":"BTCUSDT",...}'
  local method="${1:-GET}"
  local path="$2"
  local body="${3:-}"

  if [[ -z "$BITGET_API_KEY" || -z "$BITGET_API_SECRET" || -z "$BITGET_API_PASSPHRASE" ]]; then
    echo '{"error": "Missing BITGET_API_KEY, BITGET_API_SECRET, or BITGET_API_PASSPHRASE. Check your .env file."}' >&2
    return 1
  fi

  local timestamp
  timestamp=$(_bitget_timestamp)
  local sign
  sign=$(_bitget_sign "$timestamp" "$method" "$path" "$body")

  local curl_args=(
    -s "https://api.bitget.com${path}"
    -X "$method"
    -H "Content-Type: application/json"
    -H "locale: en-US"
    -H "ACCESS-KEY: $BITGET_API_KEY"
    -H "ACCESS-SIGN: $sign"
    -H "ACCESS-TIMESTAMP: $timestamp"
    -H "ACCESS-PASSPHRASE: $BITGET_API_PASSPHRASE"
  )

  if [[ -n "$body" ]]; then
    curl_args+=(-d "$body")
  fi

  curl "${curl_args[@]}"
}

# ── Market Data (public, no auth) ───────────────────────────
bitget_ticker() {
  # Get ticker for a symbol. Usage: bitget_ticker BTCUSDT
  local symbol="${1:?Usage: bitget_ticker SYMBOL}"
  bitget_public GET "/api/v2/spot/market/tickers?symbol=${symbol}"
}

bitget_all_tickers() {
  # Get all spot tickers
  bitget_public GET "/api/v2/spot/market/tickers"
}

bitget_futures_ticker() {
  # Get futures ticker. Usage: bitget_futures_ticker BTCUSDT
  local symbol="${1:?Usage: bitget_futures_ticker SYMBOL}"
  local product="${2:-USDT-FUTURES}"
  bitget_public GET "/api/v2/mix/market/ticker?symbol=${symbol}&productType=${product}"
}

bitget_orderbook() {
  # Get order book. Usage: bitget_orderbook BTCUSDT [limit]
  local symbol="${1:?Usage: bitget_orderbook SYMBOL [limit]}"
  local limit="${2:-20}"
  bitget_public GET "/api/v2/spot/market/orderbook?symbol=${symbol}&limit=${limit}"
}

bitget_candles() {
  # Get candles. Usage: bitget_candles BTCUSDT [granularity] [limit]
  # Granularity: 1min,5min,15min,30min,1h,4h,12h,1day,1week
  local symbol="${1:?Usage: bitget_candles SYMBOL [granularity] [limit]}"
  local gran="${2:-1h}"
  local limit="${3:-100}"
  bitget_public GET "/api/v2/spot/market/candles?symbol=${symbol}&granularity=${gran}&limit=${limit}"
}

bitget_funding_rate() {
  # Get current funding rate. Usage: bitget_funding_rate BTCUSDT
  local symbol="${1:?Usage: bitget_funding_rate SYMBOL}"
  bitget_public GET "/api/v2/mix/market/current-fund-rate?symbol=${symbol}&productType=USDT-FUTURES"
}

bitget_open_interest() {
  # Get open interest. Usage: bitget_open_interest BTCUSDT
  local symbol="${1:?Usage: bitget_open_interest SYMBOL}"
  bitget_public GET "/api/v2/mix/market/open-interest?symbol=${symbol}&productType=USDT-FUTURES"
}

bitget_contracts() {
  # List available futures contracts
  local product="${1:-USDT-FUTURES}"
  bitget_public GET "/api/v2/mix/market/contracts?productType=${product}"
}

# ── Account & Balance (auth required) ───────────────────────
bitget_spot_assets() {
  # Get spot account assets
  bitget_private GET "/api/v2/spot/account/assets"
}

bitget_futures_assets() {
  # Get futures account assets
  local product="${1:-USDT-FUTURES}"
  bitget_private GET "/api/v2/mix/account/accounts?productType=${product}"
}

bitget_all_balances() {
  # Get all account balances across spot, futures, funding
  bitget_private GET "/api/v2/account/all-account-balance"
}

bitget_fee_rate() {
  # Get trade fee rate for a symbol
  local symbol="${1:?Usage: bitget_fee_rate SYMBOL}"
  local business="${2:-spot}"
  bitget_private GET "/api/v2/common/trade-rate?symbol=${symbol}&businessType=${business}"
}

# ── Spot Trading (auth required) ────────────────────────────
bitget_spot_order() {
  # Place a spot order
  # Usage: bitget_spot_order BTCUSDT buy limit 0.001 50000 [GTC]
  # Usage: bitget_spot_order BTCUSDT buy market 0.001
  # Force: GTC (default), IOC, FOK, POST_ONLY
  local symbol="${1:?Usage: bitget_spot_order SYMBOL SIDE TYPE SIZE [PRICE] [FORCE]}"
  local side="${2:?Side required: buy or sell}"
  local order_type="${3:?Type required: limit or market}"
  local size="${4:?Size required}"
  local price="${5:-}"
  local force="${6:-GTC}"

  local body="{\"symbol\":\"${symbol}\",\"side\":\"${side}\",\"orderType\":\"${order_type}\",\"size\":\"${size}\",\"force\":\"${force}\""
  if [[ -n "$price" ]]; then
    body+=",\"price\":\"${price}\""
  fi
  body+="}"

  bitget_private POST "/api/v2/spot/trade/place-order" "$body"
}

bitget_spot_cancel() {
  # Cancel a spot order. Usage: bitget_spot_cancel BTCUSDT ORDER_ID
  local symbol="${1:?Usage: bitget_spot_cancel SYMBOL ORDER_ID}"
  local order_id="$2"
  bitget_private POST "/api/v2/spot/trade/cancel-order" \
    "{\"symbol\":\"${symbol}\",\"orderId\":\"${order_id}\"}"
}

bitget_spot_open_orders() {
  # Get open spot orders
  local symbol="${1:-}"
  local path="/api/v2/spot/trade/unfilled-orders"
  if [[ -n "$symbol" ]]; then
    path+="?symbol=${symbol}"
  fi
  bitget_private GET "$path"
}

bitget_spot_history() {
  # Get spot order history
  local symbol="${1:-}"
  local path="/api/v2/spot/trade/history-orders"
  if [[ -n "$symbol" ]]; then
    path+="?symbol=${symbol}"
  fi
  bitget_private GET "$path"
}

bitget_spot_fills() {
  # Get spot fill/trade history (different from order history — shows actual executions)
  local symbol="${1:-}"
  local path="/api/v2/spot/trade/fills"
  if [[ -n "$symbol" ]]; then
    path+="?symbol=${symbol}"
  fi
  bitget_private GET "$path"
}

# ── Futures Trading (auth required) ─────────────────────────
bitget_futures_order() {
  # Place a futures order
  # Usage: bitget_futures_order BTCUSDT buy open limit 0.01 50000
  # Usage: bitget_futures_order BTCUSDT sell close market 0.01
  local symbol="${1:?Usage: bitget_futures_order SYMBOL SIDE TRADE_SIDE TYPE SIZE [PRICE]}"
  local side="${2:?Side: buy or sell}"
  local trade_side="${3:?Trade side: open or close}"
  local order_type="${4:?Type: limit or market}"
  local size="${5:?Size required}"
  local price="${6:-}"
  local product="${7:-USDT-FUTURES}"

  local body="{\"symbol\":\"${symbol}\",\"productType\":\"${product}\",\"side\":\"${side}\",\"tradeSide\":\"${trade_side}\",\"orderType\":\"${order_type}\",\"size\":\"${size}\""
  if [[ -n "$price" ]]; then
    body+=",\"price\":\"${price}\""
  fi
  body+="}"

  bitget_private POST "/api/v2/mix/order/place-order" "$body"
}

bitget_futures_cancel() {
  # Cancel a futures order
  local symbol="${1:?Usage: bitget_futures_cancel SYMBOL ORDER_ID}"
  local order_id="$2"
  local product="${3:-USDT-FUTURES}"
  bitget_private POST "/api/v2/mix/order/cancel-order" \
    "{\"symbol\":\"${symbol}\",\"productType\":\"${product}\",\"orderId\":\"${order_id}\"}"
}

bitget_futures_positions() {
  # Get all open futures positions
  local product="${1:-USDT-FUTURES}"
  bitget_private GET "/api/v2/mix/position/all-position?productType=${product}"
}

bitget_futures_open_orders() {
  # Get open futures orders
  local product="${1:-USDT-FUTURES}"
  bitget_private GET "/api/v2/mix/order/orders-pending?productType=${product}"
}

bitget_set_leverage() {
  # Set futures leverage
  # Usage: bitget_set_leverage BTCUSDT 10 [USDT] [USDT-FUTURES]
  local symbol="${1:?Usage: bitget_set_leverage SYMBOL LEVERAGE [MARGIN_COIN] [PRODUCT_TYPE]}"
  local leverage="${2:?Leverage required}"
  local margin_coin="${3:-USDT}"
  local product="${4:-USDT-FUTURES}"
  bitget_private POST "/api/v2/mix/account/set-leverage" \
    "{\"symbol\":\"${symbol}\",\"productType\":\"${product}\",\"marginCoin\":\"${margin_coin}\",\"leverage\":\"${leverage}\"}"
}

bitget_set_margin_mode() {
  # Set margin mode (crossed or fixed/isolated)
  # Usage: bitget_set_margin_mode BTCUSDT crossed [USDT] [USDT-FUTURES]
  local symbol="${1:?Usage: bitget_set_margin_mode SYMBOL MODE [MARGIN_COIN] [PRODUCT_TYPE]}"
  local margin_mode="${2:?Mode required: crossed or fixed}"
  local margin_coin="${3:-USDT}"
  local product="${4:-USDT-FUTURES}"
  bitget_private POST "/api/v2/mix/account/set-margin-mode" \
    "{\"symbol\":\"${symbol}\",\"productType\":\"${product}\",\"marginCoin\":\"${margin_coin}\",\"marginMode\":\"${margin_mode}\"}"
}

bitget_set_tpsl() {
  # Place a TP/SL order on a futures position
  # Usage: bitget_set_tpsl BTCUSDT USDT-FUTURES 52000 48000
  # Either TP or SL can be empty string "" to set only one side
  local symbol="${1:?Usage: bitget_set_tpsl SYMBOL PRODUCT_TYPE TP_PRICE SL_PRICE}"
  local product="${2:-USDT-FUTURES}"
  local tp_price="${3:-}"
  local sl_price="${4:-}"
  local margin_coin="${5:-USDT}"

  # TP and SL are separate API calls
  if [[ -n "$tp_price" ]]; then
    bitget_private POST "/api/v2/mix/order/place-tpsl-order" \
      "{\"symbol\":\"${symbol}\",\"productType\":\"${product}\",\"marginCoin\":\"${margin_coin}\",\"planType\":\"profit_plan\",\"triggerPrice\":\"${tp_price}\",\"triggerType\":\"mark_price\"}"
  fi
  if [[ -n "$sl_price" ]]; then
    bitget_private POST "/api/v2/mix/order/place-tpsl-order" \
      "{\"symbol\":\"${symbol}\",\"productType\":\"${product}\",\"marginCoin\":\"${margin_coin}\",\"planType\":\"loss_plan\",\"triggerPrice\":\"${sl_price}\",\"triggerType\":\"mark_price\"}"
  fi
}

bitget_close_all() {
  # Flash close all positions for a product type
  local product="${1:-USDT-FUTURES}"
  bitget_private POST "/api/v2/mix/order/close-positions" \
    "{\"productType\":\"${product}\"}"
}

# ── Copy Trading (auth required) ────────────────────────────
bitget_copy_traders() {
  # Get followed traders (as a follower)
  bitget_private GET "/api/v2/copy/mix-follower/query-traders"
}

bitget_copy_current_orders() {
  # Get current copy trading orders (as a follower)
  bitget_private GET "/api/v2/copy/mix-follower/query-current-orders"
}

bitget_copy_history() {
  # Get copy trading order history (as a follower)
  bitget_private GET "/api/v2/copy/mix-follower/query-history-orders"
}

# ── Wallet & Transfers (auth required) ──────────────────────
bitget_deposit_address() {
  # Get deposit address for a coin
  local coin="${1:?Usage: bitget_deposit_address COIN [CHAIN]}"
  local chain="${2:-}"
  local path="/api/v2/spot/wallet/deposit-address?coin=${coin}"
  if [[ -n "$chain" ]]; then
    path+="&chain=${chain}"
  fi
  bitget_private GET "$path"
}

bitget_withdrawals() {
  # Get withdrawal history
  bitget_private GET "/api/v2/spot/wallet/withdrawal-records"
}

bitget_deposits() {
  # Get deposit history
  bitget_private GET "/api/v2/spot/wallet/deposit-records"
}

# ── Utility ─────────────────────────────────────────────────
bitget_server_time() {
  bitget_public GET "/api/v2/public/time"
}

bitget_coin_info() {
  # Get coin info (networks, deposit/withdrawal status)
  local coin="${1:-}"
  local path="/api/v2/spot/public/coins"
  if [[ -n "$coin" ]]; then
    path+="?coin=${coin}"
  fi
  bitget_public GET "$path"
}

# ── Pretty output helper ───────────────────────────────────
bitget_pretty() {
  # Pipe any bitget_* output through this for readable JSON
  # Usage: bitget_ticker BTCUSDT | bitget_pretty
  python3 -m json.tool 2>/dev/null \
    || python -m json.tool 2>/dev/null \
    || cat
}
