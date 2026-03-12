#!/usr/bin/env python3
"""
TaoStats API Client
Based on official pattern from taostat/awesome-taostats-api-examples/python/apibase.py

Features:
- Auto retry on 429 (respects Retry-After header)
- Pagination handling
- Key loaded from TAOSTATS_API_KEY env var
"""

import requests
import json
import time
import sys
import os
from typing import Optional, Dict, Any, List


def load_api_key() -> str:
    """Load TaoStats API key from TAOSTATS_API_KEY environment variable"""
    key = os.environ.get("TAOSTATS_API_KEY", "")
    if key:
        return key
    raise RuntimeError("TAOSTATS_API_KEY not set. Export it or add to your .env file")


class TaostatsAPI:
    """
    TaoStats REST API client with retry logic.
    Auth: Authorization: <key> (no Bearer prefix — per official apibase.py)
    """

    BASE_URL = "https://api.taostats.io/api"

    def __init__(self, api_key: Optional[str] = None, max_retries: int = 3, retry_delay: int = 60):
        self.api_key = api_key or load_api_key()
        self.max_retries = max_retries
        self.retry_delay = retry_delay
        self.headers = {
            "accept": "application/json",
            "Authorization": self.api_key,  # No Bearer — matches official pattern
        }

    def get_json(self, endpoint: str, params: Optional[Dict] = None) -> Dict[str, Any]:
        """
        GET request with retry on 429. Respects Retry-After header.
        endpoint: e.g. "dtao/pool/latest/v1?netuid=1" or just path component
        """
        # Handle full paths or just endpoint segments
        if endpoint.startswith("/"):
            url = f"https://api.taostats.io{endpoint}"
        elif endpoint.startswith("http"):
            url = endpoint
        else:
            url = f"{self.BASE_URL}/{endpoint}"

        retries = 0
        while retries <= self.max_retries:
            try:
                r = requests.get(url, headers=self.headers, params=params, timeout=30)

                if r.status_code == 429:
                    retry_after = int(r.headers.get("Retry-After", self.retry_delay))
                    print(f"  Rate limited. Waiting {retry_after}s... (retry {retries+1}/{self.max_retries})", file=sys.stderr)
                    time.sleep(retry_after)
                    retries += 1
                    continue

                if r.status_code == 200:
                    return r.json()

                print(f"  API error {r.status_code}: {r.text[:200]}", file=sys.stderr)
                return {"error": r.status_code, "detail": r.text}

            except requests.exceptions.Timeout:
                retries += 1
                print(f"  Timeout. Retry {retries}/{self.max_retries}", file=sys.stderr)
                time.sleep(2)
            except Exception as e:
                raise RuntimeError(f"Request failed: {e}")

        raise RuntimeError(f"Max retries ({self.max_retries}) exceeded")

    def get_paginated(self, endpoint: str, params: Optional[Dict] = None, page_size: int = 200) -> List[Any]:
        """
        Collect all pages. Returns flat list of all .data items.
        Pattern from taostat/awesome-taostats-api-examples/python/apibase.py
        """
        all_data = []
        page = 1

        while True:
            p = {**(params or {}), "limit": page_size, "page": page}
            result = self.get_json(endpoint, p)
            if not result or "data" not in result:
                break

            data = result["data"]
            all_data.extend(data)

            pagination = result.get("pagination", {})
            total_pages = pagination.get("total_pages", 1)
            if page >= total_pages or len(data) < page_size:
                break

            page += 1
            time.sleep(0.5)

        return all_data

    # ── Convenience methods ──────────────────────────────────────────────

    def pool(self, netuid: int) -> Dict:
        return self.get_json(f"dtao/pool/latest/v1?netuid={netuid}")

    def validator_yield(self, netuid: int, limit: int = 200) -> Dict:
        return self.get_json(f"dtao/validator/yield/latest/v1?netuid={netuid}&limit={limit}")

    def stake_balance(self, coldkey: str) -> Dict:
        return self.get_json(f"dtao/stake_balance/latest/v1?coldkey={coldkey}")

    def slippage(self, netuid: int, amount_rao: int, direction: str) -> Dict:
        """direction: tao_to_alpha | alpha_to_tao"""
        return self.get_json(f"dtao/slippage/v1?netuid={netuid}&input_tokens={amount_rao}&direction={direction}")

    def subnet_info(self, netuid: Optional[int] = None) -> Dict:
        endpoint = f"subnet/latest/v1?netuid={netuid}" if netuid else "subnet/latest/v1"
        return self.get_json(endpoint)

    def metagraph(self, netuid: int, limit: int = 256) -> Dict:
        return self.get_json(f"metagraph/latest/v1?netuid={netuid}&limit={limit}")

    def delegation_history(self, coldkey: str, limit: int = 200) -> List:
        return self.get_paginated(f"delegation/v1?nominator={coldkey}&action=all", page_size=limit)

    def coldkey_balance(self, coldkey: str) -> Dict:
        return self.get_json(f"wallet/coldkey/balance/latest/v2?coldkey={coldkey}")

    def dev_activity(self) -> Dict:
        return self.get_json("dev_activity/latest/v1")

    def pruning(self) -> Dict:
        return self.get_json("subnet/pruning/latest/v1")

    def entry_check(self, netuid: int, threshold: float = 0.30) -> Dict:
        """Check if a subnet is a good entry based on root_prop"""
        data = self.pool(netuid)
        item = data.get("data", [{}])[0]
        root_prop = float(item.get("root_prop", 1.0))
        return {
            "netuid": netuid,
            "price": item.get("price"),
            "root_prop": root_prop,
            "fear_and_greed_index": item.get("fear_and_greed_index"),
            "fear_and_greed_sentiment": item.get("fear_and_greed_sentiment"),
            "good_entry": root_prop < threshold,
            "threshold": threshold,
        }


# ── CLI usage ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 taostats_client.py <endpoint>")
        print("  e.g. dtao/pool/latest/v1?netuid=1")
        print("  e.g. subnet/latest/v1?netuid=19")
        sys.exit(1)

    api = TaostatsAPI()
    endpoint = sys.argv[1]

    try:
        result = api.get_json(endpoint)
        print(json.dumps(result, indent=2))
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
