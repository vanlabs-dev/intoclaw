# Bitget API Endpoint Reference

Base URL: `https://api.bitget.com`

The API has three generations: V1 (legacy), V2 (current stable), V3 (newest, unified account). This reference covers V2 and V3. Use V2 for maximum coverage; use V3 for the unified account model.

---

## Authentication

Every private endpoint requires these headers:

| Header | Value |
|--------|-------|
| `ACCESS-KEY` | Your API key |
| `ACCESS-SIGN` | Base64(HMAC-SHA256(message, secret)) |
| `ACCESS-TIMESTAMP` | Milliseconds since epoch |
| `ACCESS-PASSPHRASE` | Your passphrase (set during key creation) |
| `Content-Type` | `application/json` |
| `locale` | `en-US` |

**Signature string:** `timestamp + METHOD + requestPath + body`

GET requests must not include a body. Query params are part of `requestPath`.

---

## Rate Limits

| Category | Limit | Scope |
|----------|-------|-------|
| Public / market data | 20 req/sec | IP |
| Account endpoints | 10 req/sec | UID |
| Trading endpoints | 10 req/sec | UID |
| Batch orders | 5 req/sec | UID |
| Wallet / transfer | 5 req/sec | UID |
| Sub-account transfers | 2 req/sec | UID |

Batch orders: up to 10 orders per pair count as 1 request. HTTP 429 on rate limit exceeded.

---

## Response Format

```json
{
  "code": "00000",
  "msg": "success",
  "data": { ... }
}
```

Non-zero `code` indicates an error. Check `msg` for details.

---

## Market Data (Public — No Auth)

### Spot

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v2/spot/market/tickers?symbol=X` | GET | Ticker for one or all spot pairs |
| `/api/v2/spot/market/orderbook?symbol=X&limit=N` | GET | Order book depth |
| `/api/v2/spot/market/candles?symbol=X&granularity=G&limit=N` | GET | Candlestick data |
| `/api/v2/spot/market/history-candles` | GET | Historic candles |
| `/api/v2/spot/market/fills?symbol=X` | GET | Recent trades |
| `/api/v2/spot/market/fills-history` | GET | Historic trades |
| `/api/v2/spot/market/vip-fee-rate` | GET | VIP fee tiers |
| `/api/v2/spot/public/coins?coin=X` | GET | Coin info (networks, status) |
| `/api/v2/spot/public/symbols?symbol=X` | GET | Trading pair info |
| `/api/v2/spot/market/fund-flow` | GET | Spot fund flow |
| `/api/v2/spot/market/fund-net-flow` | GET | Net fund flow |
| `/api/v2/spot/market/whale-net-flow` | GET | Whale net flow data |

### Futures

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v2/mix/market/tickers?productType=X` | GET | All futures tickers |
| `/api/v2/mix/market/ticker?symbol=X&productType=X` | GET | Single futures ticker |
| `/api/v2/mix/market/contracts?productType=X` | GET | Contract specifications |
| `/api/v2/mix/market/merge-depth?symbol=X&productType=X` | GET | Merged order book |
| `/api/v2/mix/market/candles?symbol=X&productType=X&granularity=G` | GET | Futures candles |
| `/api/v2/mix/market/fills?symbol=X&productType=X` | GET | Recent futures trades |
| `/api/v2/mix/market/open-interest?symbol=X&productType=X` | GET | Open interest |
| `/api/v2/mix/market/current-fund-rate?symbol=X&productType=X` | GET | Current funding rate |
| `/api/v2/mix/market/history-fund-rate?symbol=X&productType=X` | GET | Funding rate history |
| `/api/v2/mix/market/funding-time?symbol=X&productType=X` | GET | Next funding time |
| `/api/v2/mix/market/symbol-price?symbol=X&productType=X` | GET | Mark / index price |
| `/api/v2/mix/market/vip-fee-rate` | GET | Futures VIP fee tiers |
| `/api/v2/mix/market/position-long-short` | GET | Long/short position data |
| `/api/v2/mix/market/long-short-ratio` | GET | Long/short ratio |
| `/api/v2/mix/market/taker-buy-sell` | GET | Taker buy/sell volume |

**productType values:** `USDT-FUTURES`, `COIN-FUTURES`, `USDC-FUTURES`, `SUSDT-FUTURES`, `SCOIN-FUTURES`, `SUSDC-FUTURES`

### V3 Unified Market (newer)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v3/market/instruments?instType=X` | GET | Instrument info |
| `/api/v3/market/tickers?instType=X` | GET | Tickers |
| `/api/v3/market/orderbook?instId=X` | GET | Order book |
| `/api/v3/market/fills?instId=X` | GET | Recent fills |
| `/api/v3/market/candles?instId=X&bar=X` | GET | Candles |
| `/api/v3/market/open-interest?instType=X` | GET | Open interest |
| `/api/v3/market/current-fund-rate?instId=X` | GET | Funding rate |
| `/api/v3/market/discount-rate` | GET | Discount rate |
| `/api/v3/market/position-tier?instType=X&instId=X` | GET | Position tiers |

---

## Account & Balance (Auth Required)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v2/spot/account/info` | GET | Spot account info |
| `/api/v2/spot/account/assets?coin=X` | GET | Spot balances |
| `/api/v2/mix/account/account?symbol=X&productType=X` | GET | Single futures account |
| `/api/v2/mix/account/accounts?productType=X` | GET | All futures accounts |
| `/api/v2/account/all-account-balance` | GET | All balances (spot+futures+funding) |
| `/api/v2/account/funding-assets` | GET | Funding account assets |
| `/api/v2/common/trade-rate?symbol=X&businessType=X` | GET | Fee rate |
| `/api/v3/account/assets` | GET | Unified balances (V3) |
| `/api/v3/account/settings` | GET | Account settings (V3) |
| `/api/v3/account/fee-rate?instType=X&instId=X` | GET | Fee rate (V3) |

---

## Spot Trading (Auth Required)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v2/spot/trade/place-order` | POST | Place order |
| `/api/v2/spot/trade/batch-orders` | POST | Batch place (up to 50) |
| `/api/v2/spot/trade/cancel-order` | POST | Cancel order |
| `/api/v2/spot/trade/batch-cancel-order` | POST | Batch cancel |
| `/api/v2/spot/trade/cancel-symbol-order` | POST | Cancel all for symbol |
| `/api/v2/spot/trade/cancel-replace-order` | POST | Cancel and replace |
| `/api/v2/spot/trade/orderInfo?orderId=X` | GET | Order details |
| `/api/v2/spot/trade/unfilled-orders` | GET | Open orders |
| `/api/v2/spot/trade/history-orders` | GET | Order history |
| `/api/v2/spot/trade/fills` | GET | Fill history |

**Place order body:**
```json
{
  "symbol": "BTCUSDT",
  "side": "buy",
  "orderType": "limit",
  "size": "0.001",
  "price": "50000",
  "force": "GTC"
}
```

`force` values: `GTC` (good-til-cancel), `IOC` (immediate-or-cancel), `FOK` (fill-or-kill), `POST_ONLY`

### Spot Plan/Trigger Orders

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v2/spot/trade/place-plan-order` | POST | Place trigger order |
| `/api/v2/spot/trade/modify-plan-order` | POST | Modify trigger order |
| `/api/v2/spot/trade/cancel-plan-order` | POST | Cancel trigger order |
| `/api/v2/spot/trade/current-plan-order` | GET | Current trigger orders |
| `/api/v2/spot/trade/history-plan-order` | GET | Trigger order history |

---

## Futures Trading (Auth Required)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v2/mix/order/place-order` | POST | Place futures order |
| `/api/v2/mix/order/batch-place-order` | POST | Batch place |
| `/api/v2/mix/order/modify-order` | POST | Modify order |
| `/api/v2/mix/order/cancel-order` | POST | Cancel order |
| `/api/v2/mix/order/batch-cancel-orders` | POST | Batch cancel |
| `/api/v2/mix/order/cancel-all-orders` | POST | Cancel all orders |
| `/api/v2/mix/order/close-positions` | POST | Flash close positions |
| `/api/v2/mix/order/click-backhand` | POST | Reverse position |
| `/api/v2/mix/order/detail?orderId=X` | GET | Order details |
| `/api/v2/mix/order/fills` | GET | Current fills |
| `/api/v2/mix/order/fill-history` | GET | Historic fills |
| `/api/v2/mix/order/orders-pending` | GET | Open orders |
| `/api/v2/mix/order/orders-history` | GET | Order history |

**Place futures order body:**
```json
{
  "symbol": "BTCUSDT",
  "productType": "USDT-FUTURES",
  "side": "buy",
  "tradeSide": "open",
  "orderType": "limit",
  "size": "0.01",
  "price": "50000",
  "marginCoin": "USDT"
}
```

`side`: `buy` or `sell`
`tradeSide`: `open` (new position) or `close` (close existing)

### Futures Account Settings

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v2/mix/account/set-leverage` | POST | Set leverage |
| `/api/v2/mix/account/set-margin-mode` | POST | Set margin mode (crossed/fixed) |
| `/api/v2/mix/account/set-position-mode` | POST | Set position mode (one-way/hedge) |
| `/api/v2/mix/account/set-margin` | POST | Adjust position margin |
| `/api/v2/mix/account/set-auto-margin` | POST | Auto-margin toggle |
| `/api/v2/mix/account/max-open` | GET | Max openable quantity |
| `/api/v2/mix/account/liq-price` | GET | Liquidation price |

### Futures Positions

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v2/mix/position/single-position?symbol=X&productType=X` | GET | Single position |
| `/api/v2/mix/position/all-position?productType=X` | GET | All positions |
| `/api/v2/mix/position/history-position` | GET | Position history |

### Futures TP/SL & Plan Orders

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v2/mix/order/place-tpsl-order` | POST | Place TP/SL order |
| `/api/v2/mix/order/place-plan-order` | POST | Place plan/trigger order |
| `/api/v2/mix/order/modify-tpsl-order` | POST | Modify TP/SL |
| `/api/v2/mix/order/modify-plan-order` | POST | Modify plan order |
| `/api/v2/mix/order/cancel-plan-order` | POST | Cancel plan order |
| `/api/v2/mix/order/orders-plan-pending` | GET | Open plan orders |
| `/api/v2/mix/order/orders-plan-history` | GET | Plan order history |

---

## V3 Unified Trading

The V3 API consolidates spot + futures into a single interface for unified margin accounts.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v3/trade/place-order` | POST | Place order (spot or futures) |
| `/api/v3/trade/place-batch` | POST | Batch place |
| `/api/v3/trade/modify-order` | POST | Modify order |
| `/api/v3/trade/cancel-order` | POST | Cancel order |
| `/api/v3/trade/cancel-batch` | POST | Batch cancel |
| `/api/v3/trade/cancel-symbol-order` | POST | Cancel all for symbol |
| `/api/v3/trade/close-positions` | POST | Close all positions |
| `/api/v3/trade/order-info` | GET | Order info |
| `/api/v3/trade/unfilled-orders` | GET | Open orders |
| `/api/v3/trade/history-orders` | GET | Order history |
| `/api/v3/trade/fills` | GET | Fill history |
| `/api/v3/trade/place-strategy-order` | POST | Strategy/trigger orders |
| `/api/v3/position/current-position` | GET | Current positions |
| `/api/v3/position/history-position` | GET | Position history |
| `/api/v3/account/set-leverage` | POST | Set leverage |
| `/api/v3/account/set-hold-mode` | POST | Set hold mode |

---

## Copy Trading (Auth Required)

### As a Futures Trader

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v2/copy/mix-trader/order-current-track` | GET | Current tracked orders |
| `/api/v2/copy/mix-trader/order-history-track` | GET | History tracked orders |
| `/api/v2/copy/mix-trader/order-modify-tpsl` | POST | Modify TP/SL on tracked |
| `/api/v2/copy/mix-trader/order-close-positions` | POST | Close tracked positions |
| `/api/v2/copy/mix-trader/profit-history-summarys` | GET | Profit summaries |
| `/api/v2/copy/mix-trader/profit-details` | GET | Profit share details |
| `/api/v2/copy/mix-trader/config-query-symbols` | GET | Symbol settings |
| `/api/v2/copy/mix-trader/config-setting-symbols` | POST | Update symbol settings |
| `/api/v2/copy/mix-trader/config-query-followers` | GET | List followers |
| `/api/v2/copy/mix-trader/config-remove-follower` | POST | Remove a follower |

### As a Futures Follower

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v2/copy/mix-follower/query-current-orders` | GET | Current copy orders |
| `/api/v2/copy/mix-follower/query-history-orders` | GET | History copy orders |
| `/api/v2/copy/mix-follower/setting-tpsl` | POST | Set TP/SL |
| `/api/v2/copy/mix-follower/settings` | POST | Update follow settings |
| `/api/v2/copy/mix-follower/query-settings` | GET | Get follow settings |
| `/api/v2/copy/mix-follower/close-positions` | POST | Close copy positions |
| `/api/v2/copy/mix-follower/query-traders` | GET | List followed traders |
| `/api/v2/copy/mix-follower/cancel-trader` | POST | Unfollow a trader |

### Spot Copy Trading

Same pattern as futures, under `/api/v2/copy/spot-trader/` and `/api/v2/copy/spot-follower/`.

---

## Margin Trading (Auth Required)

Margin type is parameterized: replace `${marginType}` with `cross` or `isolated`.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v2/margin/${marginType}/account/assets` | GET | Margin account assets |
| `/api/v2/margin/${marginType}/account/borrow` | POST | Borrow |
| `/api/v2/margin/${marginType}/account/repay` | POST | Repay |
| `/api/v2/margin/${marginType}/account/flash-repay` | POST | Flash repay all |
| `/api/v2/margin/${marginType}/account/risk-rate` | GET | Risk rate |
| `/api/v2/margin/${marginType}/account/max-borrowable-amount` | GET | Max borrowable |
| `/api/v2/margin/${marginType}/place-order` | POST | Place margin order |
| `/api/v2/margin/${marginType}/batch-place-order` | POST | Batch margin orders |
| `/api/v2/margin/${marginType}/cancel-order` | POST | Cancel margin order |
| `/api/v2/margin/${marginType}/open-orders` | GET | Open margin orders |
| `/api/v2/margin/${marginType}/history-orders` | GET | Margin order history |
| `/api/v2/margin/currencies` | GET | Margin-supported currencies |

---

## Wallet & Transfers (Auth Required)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v2/spot/wallet/deposit-address?coin=X` | GET | Deposit address |
| `/api/v2/spot/wallet/withdrawal` | POST | Submit withdrawal |
| `/api/v2/spot/wallet/cancel-withdrawal` | POST | Cancel withdrawal |
| `/api/v2/spot/wallet/withdrawal-records` | GET | Withdrawal history |
| `/api/v2/spot/wallet/deposit-records` | GET | Deposit history |
| `/api/v2/spot/wallet/transfer` | POST | Internal transfer |
| `/api/v2/spot/wallet/transfer-coin-info` | GET | Transferable coins |

---

## Earn / Savings (Auth Required)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v2/earn/savings/product` | GET | Savings products |
| `/api/v2/earn/savings/subscribe` | POST | Subscribe to savings |
| `/api/v2/earn/savings/redeem` | POST | Redeem savings |
| `/api/v2/earn/savings/assets` | GET | Savings assets |
| `/api/v2/earn/savings/records` | GET | Savings records |
| `/api/v2/earn/sharkfin/product` | GET | Sharkfin products |
| `/api/v2/earn/sharkfin/subscribe` | POST | Subscribe to sharkfin |
| `/api/v2/earn/loan/borrow` | POST | Crypto loan borrow |
| `/api/v2/earn/loan/repay` | POST | Crypto loan repay |
| `/api/v2/earn/loan/ongoing-orders` | GET | Ongoing loans |
| `/api/v2/earn/loan/debts` | GET | Loan debts |

---

## Convert (Auth Required)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v2/convert/currencies` | GET | Convertible currencies |
| `/api/v2/convert/quoted-price` | GET | Get conversion quote |
| `/api/v2/convert/trade` | POST | Execute conversion |
| `/api/v2/convert/convert-record` | GET | Conversion history |

---

## Node.js SDK

Package: `bitget-api` (npm) — MIT, TypeScript, actively maintained.

```javascript
const { RestClientV2 } = require('bitget-api');

const client = new RestClientV2({
  apiKey: 'YOUR_KEY',
  apiSecret: 'YOUR_SECRET',
  apiPass: 'YOUR_PASSPHRASE',
});

// Spot ticker
const ticker = await client.getSpotTicker({ symbol: 'BTCUSDT' });

// Place spot order
const order = await client.spotSubmitOrder({
  symbol: 'BTCUSDT',
  side: 'buy',
  orderType: 'limit',
  size: '0.001',
  price: '50000',
  force: 'GTC',
});

// Futures position
const positions = await client.getFuturesPositions({ productType: 'USDT-FUTURES' });
```

SDK handles signature computation, timestamps, and retries automatically. Available on npm: `npm install bitget-api`.
