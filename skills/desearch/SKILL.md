---
version: 1.0.0
name: desearch
description: Use the Desearch API for real-time web search, X/Twitter social data, sentiment research, and AI-powered search synthesis. Use when researching Bittensor subnets, tracking X/Twitter sentiment or trends, finding recent news, crawling web pages, searching Reddit/HackerNews/YouTube/Wikipedia/ArXiv, or fetching X posts by user or topic. Triggers on: "search X", "search Twitter", "find tweets", "X sentiment", "what's being said about", "recent posts", "research subnet", "web search", "crawl", "trending on X", "find news", "desearch".
conflicts_with:
  - skill: bittensor-knowledge
    triggers: ["research subnet"]
    resolution: "desearch searches the web and X/Twitter for real-time info. bittensor-knowledge provides foundational knowledge."
---

# Desearch

This is an IntoClaw skill. When you search for the user, share what you're doing — which endpoint you're hitting, why you picked those search terms, and what the results mean. Don't just hand back raw data.

Decentralized search powered by Bittensor (Subnet 22). Real-time web search, X/Twitter data, and AI-powered synthesis — all through a single API. Use it for sentiment analysis, subnet research, content discovery, and staying on top of what's happening in the ecosystem.

### ⚠️ Overlaps

This skill shares a trigger phrase with **Bittensor Knowledge**: "research subnet". Use *this* skill when the user wants real-time information — what people are saying on X/Twitter, recent news, current web results. Use Bittensor Knowledge when they want foundational context — how a subnet works, what its incentive mechanism does, how it fits into the network. If you're not sure, ask: "Do you want me to search for recent activity, or explain how this subnet works?"

**API base**: `https://api.desearch.ai`
**Auth**: `Authorization: <key>` header (no Bearer prefix)
**Docs**: https://desearch.ai/docs/api-reference

## Setup

**Prerequisites:**
- A Desearch account — create one at [desearch.ai](https://desearch.ai)
- Fund your account (very affordable — costs vary by usage and endpoint)
- Generate an API key from your dashboard
- Create a `.env` file in this skill directory (`skills/desearch/.env`) with your key:
  ```
  DESEARCH_API_KEY=your_key_here
  ```
  You can copy `.env.example` as a starting point: `cp .env.example .env`

Walk the user through each step if they haven't done it before. Account creation → funding → key generation → `.env` setup.

---

## Available Endpoints

### AI Search (synthesized answers)

**POST /desearch/ai/search** — AI Contextual Search
Fetches from multiple sources and returns a synthesized answer with citations.

```bash
curl -s -X POST "https://api.desearch.ai/desearch/ai/search" \
  -H "Authorization: $DESEARCH_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "What is Bittensor subnet 9 doing?",
    "tools": ["web", "twitter", "reddit"],
    "date_filter": "PAST_WEEK",
    "result_type": "LINKS_WITH_FINAL_SUMMARY",
    "streaming": false,
    "count": 10
  }'
```

**Tools available**: `web`, `twitter`, `reddit`, `hackernews`, `wikipedia`, `youtube`, `arxiv`
**date_filter options**: `PAST_24_HOURS`, `PAST_2_DAYS`, `PAST_WEEK`, `PAST_2_WEEKS`, `PAST_MONTH`, `PAST_2_MONTHS`, `PAST_YEAR`, `PAST_2_YEARS`
**result_type**: `ONLY_LINKS` | `LINKS_WITH_FINAL_SUMMARY`

**POST /desearch/ai/search/links/web** — AI Web Search (no Twitter)
Returns ranked links from web, YouTube, Wikipedia, HackerNews, Reddit, ArXiv.

**POST /desearch/ai/search/links/twitter** — AI X Posts Search
Returns X posts matching a prompt, AI-ranked.

---

### X/Twitter Endpoints

**GET /twitter** — X Search (raw, no AI)
Most useful for subnet research, sentiment, trend tracking.

```bash
curl -s "https://api.desearch.ai/twitter?query=bittensor+subnet+19&count=20&sort=Top" \
  -H "Authorization: $DESEARCH_API_KEY"
```

Key params:
- `query` (required) — search query string
- `sort` — `Top` (default) or `Latest`
- `count` — results to return (default 20)
- `start_date` / `end_date` — date range filter (YYYY-MM-DDTHH:MM:SSZ)
- `lang` — language filter (e.g. `en`)
- `verified` / `blue_verified` — filter to verified accounts
- `min_retweets` / `min_replies` / `min_likes` — engagement filters
- `is_quote` / `is_video` / `is_image` — content type filters
- `user` — restrict to specific user

**GET /twitter/post/user** — Search posts by specific user
**GET /twitter/user/posts** — Get a user's timeline
**GET /twitter/replies** — User's tweets and replies
**GET /twitter/replies/post** — Replies to a specific post
**GET /twitter/post** — Get post by ID
**GET /twitter/urls** — Fetch posts by URLs
**GET /twitter/post/retweeters** — Get retweeters of a post
**GET /twitter/trends** — X Trending Topics (use WOEID: 1=Worldwide, 23424977=USA, 23424975=UK)

---

### Web Endpoints

**GET /web** — SERP Web Search
```bash
curl -s "https://api.desearch.ai/web?query=bittensor+dynamic+tao&start=0" \
  -H "Authorization: $DESEARCH_API_KEY"
```

**GET /web/crawl** — Crawl a URL
```bash
curl -s "https://api.desearch.ai/web/crawl?url=https://example.com&format=text" \
  -H "Authorization: $DESEARCH_API_KEY"
```

---

## Response Fields (X/Twitter)

Each tweet object includes:
- `id`, `text`, `url`, `created_at`
- `reply_count`, `retweet_count`, `like_count`, `quote_count`, `view_count`, `bookmark_count`
- `is_quote_tweet`, `is_retweet`
- `media` — attached media
- `user` object: `id`, `name`, `username`, `description`, `followers_count`, `followings_count`, `verified`, `is_blue_verified`, `location`, `statuses_count`

---

## Bash Helpers

Source the helper script to get shorthand functions for every endpoint:

```bash
source ~/.openclaw/workspace/skills/desearch/scripts/desearch.sh
```

The script resolves its own directory automatically, so `.env` loading and internal paths work no matter where you call it from. Adjust the path above if the skill is installed elsewhere.

### Available Functions

| Function | Description |
|----------|-------------|
| `desearch_ai "query" [tools] [date_filter] [count]` | AI contextual search — multi-source synthesis with citations |
| `desearch_ai_web "query" [tools] [count]` | AI web search (no Twitter) — returns AI-ranked links |
| `desearch_ai_twitter "query" [count]` | AI X posts search — returns AI-ranked tweets |
| `desearch_twitter "query" [count] [sort]` | Raw X search (sort: `Top` or `Latest`) |
| `desearch_twitter_user "username" [query] [count]` | Search posts by a specific user |
| `desearch_twitter_timeline "username"` | Get a user's timeline |
| `desearch_twitter_replies "post_id" [count]` | Replies to a specific post |
| `desearch_twitter_post "post_id"` | Get a single post by ID |
| `desearch_twitter_trends [woeid]` | Trending topics (1=Worldwide, 23424977=USA) |
| `desearch_web "query" [start]` | SERP web search |
| `desearch_crawl "url" [format]` | Crawl a URL (format: `text` or `html`) |
| `desearch_research "topic" [date_filter]` | Compound: AI search across web + twitter + reddit |
| `desearch_subnet_sentiment <netuid> [count]` | Compound: X posts about a specific subnet |

### Quick Examples

```bash
source ~/.openclaw/workspace/skills/desearch/scripts/desearch.sh

# AI-powered research on a topic
desearch_ai "Bittensor subnet 19 developments" "web,twitter,reddit" "PAST_MONTH"

# Raw Twitter search
desearch_twitter "bittensor dynamic tao" 30 "Top"

# Check what opentensor is posting
desearch_twitter_timeline "opentensor"

# Web search
desearch_web "bittensor subnet 9 performance"

# Crawl a subnet's website
desearch_crawl "https://subnet-website.com"

# Compound: sentiment on a subnet
desearch_subnet_sentiment 19 30
```

---

## Common Workflows

### Subnet sentiment check
```bash
# What is X saying about a subnet right now?
curl -s "https://api.desearch.ai/twitter?query=bittensor+subnet+19&count=30&sort=Top&lang=en" \
  -H "Authorization: $DESEARCH_API_KEY"
```

### AI-powered subnet research (multi-source)
```bash
curl -s -X POST "https://api.desearch.ai/desearch/ai/search" \
  -H "Authorization: $DESEARCH_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Bittensor subnet 19 recent developments and performance",
    "tools": ["web", "twitter", "reddit"],
    "date_filter": "PAST_MONTH",
    "result_type": "LINKS_WITH_FINAL_SUMMARY",
    "streaming": false
  }'
```

### Track a project's X presence
```bash
curl -s "https://api.desearch.ai/twitter/user/posts?username=opentensor" \
  -H "Authorization: $DESEARCH_API_KEY"
```

### Crawl a subnet's website
```bash
curl -s "https://api.desearch.ai/web/crawl?url=https://subnet-website.com&format=text" \
  -H "Authorization: $DESEARCH_API_KEY"
```

---

## Notes

- API key comes from `.env` in the skill directory (or shell environment as fallback). Never hardcode it.
- `streaming: false` is safer for simple requests — streaming returns chunked JSON.
- X search results are real-time (no stale cache). Use `sort=Top` for best signal:noise, `sort=Latest` for most recent.
- For subnet research, combine: X search (sentiment) + web search (news/docs) + crawl (official site).
- WOEID reference: 1=Worldwide, 23424977=USA, 23424975=UK, 23424748=Australia, 1100661=New Zealand

## Reference Loading

Load references ONLY when the user's question requires detail beyond what's covered above.

| User is asking about... | Load |
|---|---|
| Full field enums, all endpoint params, response schemas, edge-case options not listed above | `references/api-full.md` |

If the question is answerable from the endpoints, response fields, or workflows above, answer directly — no reference load needed.

---

## Verify

After installing this skill and setting the `DESEARCH_API_KEY`, run a quick check:

```bash
curl -s "https://api.desearch.ai/web?query=bittensor&start=0" \
  -H "Authorization: $DESEARCH_API_KEY" | python3 -c "import sys,json; d=json.load(sys.stdin); print('✅ desearch working, got', len(d) if isinstance(d,list) else 'data')"
```

**Expected:** `✅ desearch working, got N` (a count of results). If you get a 401, the API key isn't set. If you get a 402 or payment error, the account needs funding at [desearch.ai](https://desearch.ai). If you get a JSON decode error, check your network connection.
