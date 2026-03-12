# Desearch API — Full Reference

Source: https://api.desearch.ai/openapi.json (live spec)
Version: 1.0.0

---

## Authentication

- Type: API Key in header
- Header name: `Authorization`
- Format: `Authorization: <key>` — **no** "Bearer" prefix
- Key source: `DESEARCH_API_KEY` environment variable

---

## Enums

### ToolEnum (for AI search `tools` array)
`web`, `hackernews`, `reddit`, `wikipedia`, `youtube`, `twitter`, `arxiv`

### WebToolEnum (for AI web search, excludes twitter)
`web`, `hackernews`, `reddit`, `wikipedia`, `youtube`, `arxiv`

### DateFilterEnum
`PAST_24_HOURS`, `PAST_2_DAYS`, `PAST_WEEK`, `PAST_2_WEEKS`, `PAST_MONTH`, `PAST_2_MONTHS`, `PAST_YEAR`, `PAST_2_YEARS`

### ResultTypeEnum
`ONLY_LINKS`, `LINKS_WITH_FINAL_SUMMARY`

---

## POST /desearch/ai/search

**AI Contextual Search** — Searches multiple sources, returns AI synthesis with citations.

### Request body (JSON)

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `prompt` | string | ✅ | — | Search query |
| `tools` | array[ToolEnum] | ✅ | — | Which sources to search |
| `start_date` | string | ❌ | — | ISO 8601: `YYYY-MM-DDTHH:MM:SSZ` |
| `end_date` | string | ❌ | — | ISO 8601: `YYYY-MM-DDTHH:MM:SSZ` |
| `date_filter` | DateFilterEnum | ❌ | `PAST_24_HOURS` | Predefined date range |
| `streaming` | boolean | ❌ | `true` | Stream response chunks |
| `result_type` | ResultTypeEnum | ❌ | `LINKS_WITH_FINAL_SUMMARY` | Response format |
| `system_message` | string | ❌ | — | Custom system prompt |
| `scoring_system_message` | string | ❌ | — | System message for scoring |
| `count` | integer | ❌ | `10` | Results per source (min 10, max 200) |

---

## POST /desearch/ai/search/links/web

**AI Web Search** — Returns AI-ranked links from web sources (no Twitter).

### Request body (JSON)

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `prompt` | string | ✅ | — | Search query |
| `tools` | array[WebToolEnum] | ✅ | — | Sources to search |
| `count` | integer | ❌ | `10` | Results per source (min 10, max 200) |

---

## POST /desearch/ai/search/links/twitter

**AI X Posts Search** — Returns AI-ranked X posts matching a prompt.

### Request body (JSON)

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `prompt` | string | ✅ | — | Search query |
| `count` | integer | ❌ | `10` | Results (min 10, max 200) |

---

## GET /twitter

**X Search API** — Raw X search without AI synthesis.

| Param | Type | Required | Default | Notes |
|---|---|---|---|---|
| `query` | string | ✅ | — | Search query |
| `sort` | string | ❌ | `Top` | `Top` or `Latest` |
| `user` | string | ❌ | — | Filter to specific user |
| `start_date` | string | ❌ | — | ISO 8601 |
| `end_date` | string | ❌ | — | ISO 8601 |
| `lang` | string | ❌ | — | Language code (e.g. `en`) |
| `verified` | boolean | ❌ | — | Only verified users |
| `blue_verified` | boolean | ❌ | — | Only blue-verified users |
| `is_quote` | boolean | ❌ | — | Only quote tweets |
| `is_video` | boolean | ❌ | — | Only video tweets |
| `is_image` | boolean | ❌ | — | Only image tweets |
| `min_retweets` | integer | ❌ | — | Minimum retweet count |
| `min_replies` | integer | ❌ | — | Minimum reply count |
| `min_likes` | integer | ❌ | — | Minimum like count |
| `count` | integer | ❌ | `20` | Number of results |

---

## GET /twitter/urls

**Fetch Posts by URLs**

| Param | Type | Required | Notes |
|---|---|---|---|
| `urls` | array[string] | ✅ | Repeat param for multiple URLs |

---

## GET /twitter/post

**Get Post by ID**

| Param | Type | Required |
|---|---|---|
| `id` | string | ✅ |

---

## GET /twitter/post/user

**Search X Posts by User**

| Param | Type | Required | Default |
|---|---|---|---|
| `user` | string | ✅ | — |
| `query` | string | ❌ | — |
| `count` | integer | ❌ | `10` |

---

## GET /twitter/post/retweeters

**Get Retweeters of a Post**

| Param | Type | Required | Notes |
|---|---|---|---|
| `id` | string | ✅ | Post/tweet ID |
| `cursor` | string | ❌ | Pagination cursor |

---

## GET /twitter/user/posts

**Get User Timeline Posts**

| Param | Type | Required | Notes |
|---|---|---|---|
| `username` | string | ✅ | X username (no @) |
| `cursor` | string | ❌ | Pagination |

---

## GET /twitter/replies

**Fetch User's Tweets and Replies**

| Param | Type | Required | Default |
|---|---|---|---|
| `user` | string | ✅ | — |
| `count` | integer | ❌ | `10` |
| `query` | string | ❌ | — |

---

## GET /twitter/replies/post

**Replies for a Specific Post**

| Param | Type | Required | Default |
|---|---|---|---|
| `post_id` | string | ✅ | — |
| `count` | integer | ❌ | `10` |
| `query` | string | ❌ | — |

---

## GET /twitter/trends

**X Trending Topics**

| Param | Type | Required | Default | Notes |
|---|---|---|---|---|
| `woeid` | integer | ✅ | — | Where On Earth ID |
| `count` | integer | ❌ | `30` | — |

**Common WOEIDs:**
- `1` — Worldwide
- `23424977` — United States
- `23424975` — United Kingdom
- `23424748` — Australia
- `1100661` — New Zealand
- `23424856` — Japan

---

## GET /web

**SERP Web Search**

| Param | Type | Required | Default |
|---|---|---|---|
| `query` | string | ✅ | — |
| `start` | integer | ❌ | `0` |

---

## GET /web/crawl

**Crawl a URL**

| Param | Type | Required | Default | Notes |
|---|---|---|---|---|
| `url` | string | ✅ | — | Full URL to crawl |
| `format` | string | ❌ | `text` | `text` or `html` |

---

## Tweet Object Schema

```json
{
  "id": "string",
  "text": "string",
  "url": "https://x.com/user/status/...",
  "created_at": "Wed Mar 11 05:45:48 +0000 2026",
  "reply_count": 0,
  "retweet_count": 0,
  "like_count": 0,
  "quote_count": 0,
  "view_count": 0,
  "bookmark_count": 0,
  "is_quote_tweet": false,
  "is_retweet": false,
  "media": [],
  "user": {
    "id": "string",
    "name": "Display Name",
    "username": "handle",
    "url": "https://x.com/handle",
    "description": "bio",
    "followers_count": 1234,
    "followings_count": 567,
    "statuses_count": 890,
    "verified": false,
    "is_blue_verified": true,
    "location": "...",
    "profile_image_url": "...",
    "profile_banner_url": "...",
    "created_at": "...",
    "listed_count": 0,
    "media_count": 0,
    "can_dm": false,
    "pinned_tweet_ids": []
  }
}
```
