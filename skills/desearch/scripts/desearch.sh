#!/bin/bash
# Desearch API Helper Functions
# Source this file: source ~/.openclaw/workspace/skills/desearch/scripts/desearch.sh

# Resolve script and skill directories regardless of caller's working directory
DESEARCH_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DESEARCH_SKILL_DIR="$(dirname "$DESEARCH_SCRIPT_DIR")"

# Load .env file — skill dir first, then workspace root, then fall back to env
_desearch_load_dotenv() {
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

_desearch_load_dotenv "$DESEARCH_SKILL_DIR/.env"
_desearch_load_dotenv "$DESEARCH_SKILL_DIR/../../.env"

# Validate API key is available
_desearch_load_key() {
    if [ -n "$DESEARCH_API_KEY" ]; then
        export DESEARCH_API_KEY
        return 0
    fi
    echo "DESEARCH_API_KEY not set. Create a .env file in $DESEARCH_SKILL_DIR or set the variable in your environment." >&2
    return 1
}

_desearch_load_key 2>/dev/null

DESEARCH_BASE_URL="https://api.desearch.ai"

# ── Internal Helpers ──────────────────────────────────────────────────────

# Internal GET with retry on 429
_desearch_get() {
    local endpoint="$1"
    local max_retries=3
    local retry_delay=5
    local attempt=0

    while [ $attempt -lt $max_retries ]; do
        local response
        response=$(curl -s "${DESEARCH_BASE_URL}${endpoint}" \
            -H "Authorization: ${DESEARCH_API_KEY}" \
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

# Internal POST (JSON body) with retry on 429
_desearch_post() {
    local endpoint="$1"
    local json_body="$2"
    local max_retries=3
    local retry_delay=5
    local attempt=0

    while [ $attempt -lt $max_retries ]; do
        local response
        response=$(curl -s -X POST "${DESEARCH_BASE_URL}${endpoint}" \
            -H "Authorization: ${DESEARCH_API_KEY}" \
            -H "Content-Type: application/json" \
            -H "accept: application/json" \
            -d "$json_body" \
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

# ── AI Search ─────────────────────────────────────────────────────────────

# AI contextual search — multi-source synthesis with citations
# Usage: desearch_ai "query" [tools] [date_filter] [count]
#   tools: comma-separated (default: web,twitter)
#   date_filter: PAST_24_HOURS|PAST_WEEK|PAST_MONTH|etc (default: PAST_WEEK)
#   count: results per source, 10-200 (default: 10)
desearch_ai() {
    local prompt="$1"
    local tools="${2:-web,twitter}"
    local date_filter="${3:-PAST_WEEK}"
    local count="${4:-10}"
    [ -z "$prompt" ] && { echo "Usage: desearch_ai \"query\" [tools] [date_filter] [count]" >&2; return 1; }

    # Build JSON tools array from comma-separated string
    local tools_json
    tools_json=$(echo "$tools" | python3 -c "import sys,json; print(json.dumps(sys.stdin.read().strip().split(',')))")

    local body
    body=$(python3 -c "
import json, sys
print(json.dumps({
    'prompt': sys.argv[1],
    'tools': json.loads(sys.argv[2]),
    'date_filter': sys.argv[3],
    'result_type': 'LINKS_WITH_FINAL_SUMMARY',
    'streaming': False,
    'count': int(sys.argv[4])
}))" "$prompt" "$tools_json" "$date_filter" "$count")

    _desearch_post "/desearch/ai/search" "$body"
}

# AI web search (no Twitter) — returns AI-ranked links
# Usage: desearch_ai_web "query" [tools] [count]
#   tools: comma-separated (default: web)
desearch_ai_web() {
    local prompt="$1"
    local tools="${2:-web}"
    local count="${3:-10}"
    [ -z "$prompt" ] && { echo "Usage: desearch_ai_web \"query\" [tools] [count]" >&2; return 1; }

    local tools_json
    tools_json=$(echo "$tools" | python3 -c "import sys,json; print(json.dumps(sys.stdin.read().strip().split(',')))")

    local body
    body=$(python3 -c "
import json, sys
print(json.dumps({
    'prompt': sys.argv[1],
    'tools': json.loads(sys.argv[2]),
    'count': int(sys.argv[3])
}))" "$prompt" "$tools_json" "$count")

    _desearch_post "/desearch/ai/search/links/web" "$body"
}

# AI X posts search — returns AI-ranked tweets
# Usage: desearch_ai_twitter "query" [count]
desearch_ai_twitter() {
    local prompt="$1"
    local count="${2:-10}"
    [ -z "$prompt" ] && { echo "Usage: desearch_ai_twitter \"query\" [count]" >&2; return 1; }

    local body
    body=$(python3 -c "
import json, sys
print(json.dumps({
    'prompt': sys.argv[1],
    'count': int(sys.argv[2])
}))" "$prompt" "$count")

    _desearch_post "/desearch/ai/search/links/twitter" "$body"
}

# ── X/Twitter ─────────────────────────────────────────────────────────────

# Raw X search (no AI synthesis)
# Usage: desearch_twitter "query" [count] [sort]
#   sort: Top (default) or Latest
desearch_twitter() {
    local query="$1"
    local count="${2:-20}"
    local sort="${3:-Top}"
    [ -z "$query" ] && { echo "Usage: desearch_twitter \"query\" [count] [sort]" >&2; return 1; }

    local encoded_query
    encoded_query=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))" "$query")
    _desearch_get "/twitter?query=${encoded_query}&count=${count}&sort=${sort}"
}

# Search posts by a specific user
# Usage: desearch_twitter_user "username" [query] [count]
desearch_twitter_user() {
    local user="$1"
    local query="$2"
    local count="${3:-10}"
    [ -z "$user" ] && { echo "Usage: desearch_twitter_user \"username\" [query] [count]" >&2; return 1; }

    local endpoint="/twitter/post/user?user=${user}&count=${count}"
    if [ -n "$query" ]; then
        local encoded_query
        encoded_query=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))" "$query")
        endpoint="${endpoint}&query=${encoded_query}"
    fi
    _desearch_get "$endpoint"
}

# Get a user's timeline
# Usage: desearch_twitter_timeline "username"
desearch_twitter_timeline() {
    local username="$1"
    [ -z "$username" ] && { echo "Usage: desearch_twitter_timeline \"username\"" >&2; return 1; }
    _desearch_get "/twitter/user/posts?username=${username}"
}

# Get replies to a specific post
# Usage: desearch_twitter_replies "post_id" [count]
desearch_twitter_replies() {
    local post_id="$1"
    local count="${2:-10}"
    [ -z "$post_id" ] && { echo "Usage: desearch_twitter_replies \"post_id\" [count]" >&2; return 1; }
    _desearch_get "/twitter/replies/post?post_id=${post_id}&count=${count}"
}

# Get a single post by ID
# Usage: desearch_twitter_post "post_id"
desearch_twitter_post() {
    local id="$1"
    [ -z "$id" ] && { echo "Usage: desearch_twitter_post \"post_id\"" >&2; return 1; }
    _desearch_get "/twitter/post?id=${id}"
}

# Get trending topics
# Usage: desearch_twitter_trends [woeid]
#   woeid: 1=Worldwide (default), 23424977=USA, 23424975=UK
desearch_twitter_trends() {
    local woeid="${1:-1}"
    _desearch_get "/twitter/trends?woeid=${woeid}"
}

# ── Web ───────────────────────────────────────────────────────────────────

# SERP web search
# Usage: desearch_web "query" [start]
desearch_web() {
    local query="$1"
    local start="${2:-0}"
    [ -z "$query" ] && { echo "Usage: desearch_web \"query\" [start]" >&2; return 1; }

    local encoded_query
    encoded_query=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))" "$query")
    _desearch_get "/web?query=${encoded_query}&start=${start}"
}

# Crawl a URL and return its content
# Usage: desearch_crawl "url" [format]
#   format: text (default) or html
desearch_crawl() {
    local url="$1"
    local format="${2:-text}"
    [ -z "$url" ] && { echo "Usage: desearch_crawl \"url\" [format]" >&2; return 1; }

    local encoded_url
    encoded_url=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1], safe=''))" "$url")
    _desearch_get "/web/crawl?url=${encoded_url}&format=${format}"
}

# ── Compound Helpers ──────────────────────────────────────────────────────

# Research a topic across web + Twitter, return combined results
# Usage: desearch_research "topic" [date_filter]
desearch_research() {
    local topic="$1"
    local date_filter="${2:-PAST_WEEK}"
    [ -z "$topic" ] && { echo "Usage: desearch_research \"topic\" [date_filter]" >&2; return 1; }

    echo "── AI Search (web + twitter + reddit) ──" >&2
    desearch_ai "$topic" "web,twitter,reddit" "$date_filter"
}

# Subnet sentiment check — X posts about a specific subnet
# Usage: desearch_subnet_sentiment <netuid> [count]
desearch_subnet_sentiment() {
    local netuid="$1"
    local count="${2:-20}"
    [ -z "$netuid" ] && { echo "Usage: desearch_subnet_sentiment <netuid> [count]" >&2; return 1; }
    desearch_twitter "bittensor subnet ${netuid}" "$count" "Top"
}

# ── Export ────────────────────────────────────────────────────────────────

export -f _desearch_get _desearch_post
export -f desearch_ai desearch_ai_web desearch_ai_twitter
export -f desearch_twitter desearch_twitter_user desearch_twitter_timeline
export -f desearch_twitter_replies desearch_twitter_post desearch_twitter_trends
export -f desearch_web desearch_crawl
export -f desearch_research desearch_subnet_sentiment

echo "Desearch helpers loaded. Functions: desearch_ai, desearch_twitter, desearch_web, desearch_crawl, desearch_research, ..."
