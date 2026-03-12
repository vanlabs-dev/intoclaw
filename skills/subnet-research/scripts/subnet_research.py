#!/usr/bin/env python3
"""
Subnet Research — Multi-phase data collection and signal analysis.

Pulls from TaoStats (chain data) and Desearch (social/web data),
identifies notable signals, and outputs structured JSON for the bot to narrate.

Usage:
  python3 subnet_research.py --netuid 19
  python3 subnet_research.py --netuid 19 --compare 1,33
  python3 subnet_research.py --netuid 19 --phase broad
  python3 subnet_research.py --netuid 19 --deep
"""

import argparse
import json
import os
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

try:
    import requests
except ImportError:
    print("Error: 'requests' library required. Install with: pip install requests", file=sys.stderr)
    sys.exit(1)


SCRIPT_DIR = Path(__file__).resolve().parent
SKILL_DIR = SCRIPT_DIR.parent
WORKSPACE_ROOT = SKILL_DIR.parent.parent

# API config
TAOSTATS_BASE = "https://api.taostats.io/api"
DESEARCH_BASE = "https://api.desearch.ai"


# ── Environment loading ──────────────────────────────────────────────────────

def _load_dotenv(filepath: Path) -> None:
    """Load key=value pairs from a .env file into os.environ. No external deps."""
    if not filepath.is_file():
        return
    with open(filepath) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" not in line:
                continue
            key, _, value = line.partition("=")
            key = key.strip()
            value = value.strip().strip("'\"")
            if key and key not in os.environ:
                os.environ[key] = value


def _load_all_env() -> None:
    """Load .env from relevant skill dirs, then workspace root."""
    # This skill's own .env (if someone puts keys here)
    _load_dotenv(SKILL_DIR / ".env")
    # Chain-metrics skill .env
    _load_dotenv(SKILL_DIR.parent / "chain-metrics" / ".env")
    # Desearch skill .env
    _load_dotenv(SKILL_DIR.parent / "desearch" / ".env")
    # Workspace root
    _load_dotenv(WORKSPACE_ROOT / ".env")


_load_all_env()


def _get_key(name: str) -> str:
    key = os.environ.get(name, "")
    if not key:
        print(f"Error: {name} not set. Check .env files in skill dirs or set in environment.", file=sys.stderr)
        sys.exit(1)
    return key


# ── API helpers ───────────────────────────────────────────────────────────────

def _taostats_get(endpoint: str, params: Optional[Dict] = None, retries: int = 3) -> Dict:
    """GET from TaoStats with retry on 429."""
    url = f"{TAOSTATS_BASE}/{endpoint}" if not endpoint.startswith("http") else endpoint
    headers = {"accept": "application/json", "Authorization": _get_key("TAOSTATS_API_KEY")}

    for attempt in range(retries):
        try:
            r = requests.get(url, headers=headers, params=params, timeout=30)
            if r.status_code == 429:
                wait = int(r.headers.get("Retry-After", 60))
                print(f"  Rate limited. Waiting {wait}s (retry {attempt+1}/{retries})", file=sys.stderr)
                time.sleep(wait)
                continue
            if r.status_code == 200:
                return r.json()
            return {"error": r.status_code, "detail": r.text[:200]}
        except requests.exceptions.Timeout:
            print(f"  Timeout (retry {attempt+1}/{retries})", file=sys.stderr)
            time.sleep(2)
        except Exception as e:
            return {"error": str(e)}

    return {"error": "max retries exceeded"}


def _desearch_get(endpoint: str, params: Optional[Dict] = None) -> Any:
    """GET from Desearch."""
    url = f"{DESEARCH_BASE}/{endpoint}" if not endpoint.startswith("http") else endpoint
    headers = {"Authorization": _get_key("DESEARCH_API_KEY")}
    try:
        r = requests.get(url, headers=headers, params=params, timeout=30)
        if r.status_code == 200:
            return r.json()
        return {"error": r.status_code, "detail": r.text[:200]}
    except Exception as e:
        return {"error": str(e)}


def _desearch_post(endpoint: str, body: Dict) -> Any:
    """POST to Desearch."""
    url = f"{DESEARCH_BASE}/{endpoint}"
    headers = {"Authorization": _get_key("DESEARCH_API_KEY"), "Content-Type": "application/json"}
    try:
        r = requests.post(url, headers=headers, json=body, timeout=60)
        if r.status_code == 200:
            return r.json()
        return {"error": r.status_code, "detail": r.text[:200]}
    except Exception as e:
        return {"error": str(e)}


# ── Phase 1: Broad Scan ──────────────────────────────────────────────────────

def collect_chain_data(netuid: int) -> Dict[str, Any]:
    """Pull core chain data from TaoStats."""
    result = {}

    # Pool data — price, root_prop, sentiment, volume, liquidity
    print(f"  Pulling pool data for SN{netuid}...", file=sys.stderr)
    result["pool"] = _taostats_get(f"dtao/pool/latest/v1?netuid={netuid}")
    time.sleep(0.3)

    # Subnet info — emissions, net flows, hyperparams
    print(f"  Pulling subnet info for SN{netuid}...", file=sys.stderr)
    result["subnet_info"] = _taostats_get(f"subnet/latest/v1?netuid={netuid}")
    time.sleep(0.3)

    # Validator yields — top validators, APYs
    print(f"  Pulling validator yields for SN{netuid}...", file=sys.stderr)
    result["validators"] = _taostats_get(f"dtao/validator/yield/latest/v1?netuid={netuid}&limit=20")
    time.sleep(0.3)

    # Slippage — simulate a 10 TAO buy to gauge pool depth
    print(f"  Estimating slippage for SN{netuid}...", file=sys.stderr)
    result["slippage"] = _taostats_get(
        f"dtao/slippage/v1?netuid={netuid}&input_tokens=10000000000&direction=tao_to_alpha"
    )
    time.sleep(0.3)

    # Dev activity — check for this subnet
    print(f"  Pulling dev activity...", file=sys.stderr)
    result["dev_activity"] = _taostats_get("dev_activity/latest/v1")

    return result


def collect_social_data(netuid: int) -> Dict[str, Any]:
    """Pull social data from Desearch."""
    result = {}

    # X/Twitter sentiment
    print(f"  Searching X/Twitter for SN{netuid} mentions...", file=sys.stderr)
    result["twitter"] = _desearch_get("twitter", {
        "query": f"bittensor subnet {netuid}",
        "count": 20,
        "sort": "Top",
        "lang": "en",
    })
    time.sleep(0.3)

    # AI-powered web research
    print(f"  Running AI web research for SN{netuid}...", file=sys.stderr)
    result["web_research"] = _desearch_post("desearch/ai/search", {
        "prompt": f"Bittensor subnet {netuid} recent developments, team, performance, community",
        "tools": ["web", "twitter", "reddit"],
        "date_filter": "PAST_MONTH",
        "result_type": "LINKS_WITH_FINAL_SUMMARY",
        "streaming": False,
        "count": 10,
    })

    return result


# ── Phase 2: Signal Identification ───────────────────────────────────────────

def identify_signals(chain_data: Dict, social_data: Dict) -> List[Dict[str, Any]]:
    """Evaluate data for notable signals."""
    signals = []

    pool = chain_data.get("pool", {})
    pool_item = {}
    if "data" in pool and pool["data"]:
        pool_item = pool["data"][0] if isinstance(pool["data"], list) else pool["data"]

    subnet = chain_data.get("subnet_info", {})
    subnet_item = {}
    if "data" in subnet and subnet["data"]:
        subnet_item = subnet["data"][0] if isinstance(subnet["data"], list) else subnet["data"]

    # -- Inactive subnet detection --
    price = _safe_float(pool_item.get("price"))
    volume_24h = _safe_float(pool_item.get("tao_volume_24_hr"))
    if price is not None and price > 1.0:
        severity = "critical" if (volume_24h is not None and volume_24h < 1.0) else "high"
        signals.append({
            "signal": "inactive_subnet",
            "severity": severity,
            "value": price,
            "message": f"Price is {price:.4f} TAO (above 1 TAO). "
                       f"This likely indicates an inactive/zombie subnet with no real market activity. "
                       f"24h volume: {volume_24h:.2f} TAO." if volume_24h is not None else
                       f"Price is {price:.4f} TAO (above 1 TAO). Likely inactive subnet.",
        })

    # -- Low liquidity / slippage risk --
    liquidity = _safe_float(pool_item.get("liquidity"))
    market_cap = _safe_float(pool_item.get("market_cap"))
    slippage_data = chain_data.get("slippage", {})
    slippage_item = {}
    if "data" in slippage_data and slippage_data["data"]:
        slippage_item = slippage_data["data"] if isinstance(slippage_data["data"], dict) else (
            slippage_data["data"][0] if isinstance(slippage_data["data"], list) and slippage_data["data"] else {}
        )
    slippage_pct = _safe_float(slippage_item.get("slippage_percentage"))

    if slippage_pct is not None and slippage_pct > 5.0:
        signals.append({
            "signal": "high_slippage",
            "severity": "high" if slippage_pct > 10.0 else "medium",
            "value": slippage_pct,
            "message": f"Slippage on a 10 TAO buy is {slippage_pct:.2f}%. "
                       f"Pool liquidity: {liquidity:.2f} TAO. "
                       f"Large trades will move the price significantly."
                       if liquidity is not None else
                       f"Slippage on a 10 TAO buy is {slippage_pct:.2f}%. Low liquidity risk.",
        })
    elif liquidity is not None and market_cap is not None and market_cap > 0:
        liq_ratio = liquidity / market_cap
        if liq_ratio < 0.05:
            signals.append({
                "signal": "low_liquidity",
                "severity": "medium",
                "value": liq_ratio,
                "message": f"Liquidity ({liquidity:.2f} TAO) is only {liq_ratio*100:.1f}% of market cap. "
                           f"This pool is thin — expect slippage on larger trades.",
            })

    # -- Root prop --
    root_prop = _safe_float(pool_item.get("root_prop"))
    if root_prop is not None:
        if root_prop > 0.70:
            signals.append({
                "signal": "root_prop_extreme",
                "severity": "high",
                "value": root_prop,
                "message": f"Root prop is {root_prop:.2f} — over 70% of price is from protocol injection. "
                           f"This is an artificial pump. Avoid.",
            })
        elif root_prop > 0.30:
            signals.append({
                "signal": "root_prop_elevated",
                "severity": "medium",
                "value": root_prop,
                "message": f"Root prop is {root_prop:.2f} — {root_prop*100:.0f}% of price comes from protocol TAO, "
                           f"not organic demand. Caution zone.",
            })

    # -- Net flows --
    net_flow_7d = _safe_float(subnet_item.get("net_flow_7_days"))
    net_flow_30d = _safe_float(subnet_item.get("net_flow_30_days"))
    if net_flow_7d is not None and net_flow_7d < 0:
        signals.append({
            "signal": "capital_outflow_7d",
            "severity": "medium" if net_flow_7d > -100 else "high",
            "value": net_flow_7d,
            "message": f"7-day net flow is {net_flow_7d:.2f} TAO — capital is leaving this subnet.",
        })
    if net_flow_30d is not None and net_flow_30d < 0:
        signals.append({
            "signal": "capital_outflow_30d",
            "severity": "medium" if net_flow_30d > -500 else "high",
            "value": net_flow_30d,
            "message": f"30-day net flow is {net_flow_30d:.2f} TAO — sustained capital outflow.",
        })

    # -- Fear & Greed --
    fng = _safe_float(pool_item.get("fear_and_greed_index"))
    fng_label = pool_item.get("fear_and_greed_sentiment", "")
    if fng is not None:
        if fng < 30:
            signals.append({
                "signal": "extreme_fear",
                "severity": "low",
                "value": fng,
                "message": f"Fear & Greed at {fng:.0f} ({fng_label}). Market is fearful — "
                           f"could be a buy opportunity if fundamentals are solid.",
            })
        elif fng > 70:
            signals.append({
                "signal": "extreme_greed",
                "severity": "medium",
                "value": fng,
                "message": f"Fear & Greed at {fng:.0f} ({fng_label}). Market is greedy — "
                           f"exercise caution, potential overvaluation.",
            })

    # -- Dev activity --
    dev_data = chain_data.get("dev_activity", {})
    dev_items = dev_data.get("data", []) if isinstance(dev_data, dict) else []
    subnet_dev = [d for d in dev_items if str(d.get("netuid")) == str(pool_item.get("netuid", ""))]
    if not subnet_dev:
        signals.append({
            "signal": "no_dev_activity",
            "severity": "medium",
            "value": 0,
            "message": "No recent GitHub dev activity found for this subnet. "
                       "Team may be inactive or working in a private repo.",
        })

    # -- Social concentration --
    tweets = social_data.get("twitter", [])
    if isinstance(tweets, list) and len(tweets) > 5:
        usernames = [t.get("user", {}).get("username", "") for t in tweets if isinstance(t, dict)]
        unique = set(u for u in usernames if u)
        if len(unique) <= 2 and len(tweets) > 10:
            signals.append({
                "signal": "concentrated_social",
                "severity": "medium",
                "value": len(unique),
                "message": f"Only {len(unique)} unique accounts dominating {len(tweets)} tweets. "
                           f"Could be a shill campaign rather than organic community.",
            })

    # -- Pruning risk --
    # Note: pruning data is fetched globally, so we check if this netuid appears
    # This is a lightweight check; deep dive can pull full pruning details

    return signals


def _safe_float(val: Any) -> Optional[float]:
    """Safely convert to float, returning None on failure."""
    if val is None:
        return None
    try:
        return float(val)
    except (ValueError, TypeError):
        return None


# ── Phase 3: Deep Dive ───────────────────────────────────────────────────────

def deep_dive(netuid: int, signals: List[Dict]) -> Dict[str, Any]:
    """Conditional deeper data pulls based on flagged signals."""
    result = {}
    signal_names = {s["signal"] for s in signals}

    if "high_slippage" in signal_names or "low_liquidity" in signal_names:
        print(f"  Deep dive: slippage at multiple trade sizes...", file=sys.stderr)
        result["slippage_1"] = _taostats_get(
            f"dtao/slippage/v1?netuid={netuid}&input_tokens=1000000000&direction=tao_to_alpha"
        )
        time.sleep(0.3)
        result["slippage_50"] = _taostats_get(
            f"dtao/slippage/v1?netuid={netuid}&input_tokens=50000000000&direction=tao_to_alpha"
        )
        time.sleep(0.3)

    if any(s["signal"].startswith("capital_outflow") for s in signals):
        print(f"  Deep dive: metagraph for stake distribution...", file=sys.stderr)
        result["metagraph"] = _taostats_get(f"metagraph/latest/v1?netuid={netuid}&limit=50")
        time.sleep(0.3)

    if "no_dev_activity" in signal_names or "concentrated_social" in signal_names:
        print(f"  Deep dive: broader X search...", file=sys.stderr)
        result["twitter_latest"] = _desearch_get("twitter", {
            "query": f"bittensor subnet {netuid}",
            "count": 30,
            "sort": "Latest",
        })

    # Pruning risk
    print(f"  Deep dive: pruning risk check...", file=sys.stderr)
    pruning = _taostats_get("subnet/pruning/latest/v1")
    if "data" in pruning and isinstance(pruning["data"], list):
        subnet_pruning = [p for p in pruning["data"] if str(p.get("netuid")) == str(netuid)]
        if subnet_pruning:
            result["pruning"] = subnet_pruning
    time.sleep(0.3)

    return result


# ── Main ──────────────────────────────────────────────────────────────────────

def research_subnet(netuid: int, phase_only: Optional[str] = None, include_deep: bool = False) -> Dict:
    """Run the full research pipeline for a single subnet."""
    output = {"netuid": netuid}

    # Phase 1: Broad Scan
    print(f"\n--- Phase 1: Broad Scan for SN{netuid} ---", file=sys.stderr)
    chain_data = collect_chain_data(netuid)
    time.sleep(0.3)
    social_data = collect_social_data(netuid)

    output["pool"] = chain_data.get("pool", {})
    output["subnet_info"] = chain_data.get("subnet_info", {})
    output["validators"] = chain_data.get("validators", {})
    output["slippage"] = chain_data.get("slippage", {})
    output["dev_activity_match"] = _filter_dev_activity(chain_data.get("dev_activity", {}), netuid)
    output["social"] = social_data.get("twitter", {})
    output["web_research"] = social_data.get("web_research", {})

    if phase_only == "broad":
        output["signals"] = []
        return output

    # Phase 2: Signal Identification
    print(f"\n--- Phase 2: Signal Identification for SN{netuid} ---", file=sys.stderr)
    signals = identify_signals(chain_data, social_data)
    output["signals"] = signals

    for s in signals:
        print(f"  [{s['severity'].upper()}] {s['signal']}: {s['message']}", file=sys.stderr)

    if not signals:
        print("  No notable signals found.", file=sys.stderr)

    # Phase 3: Deep Dive (optional)
    if include_deep and signals:
        print(f"\n--- Phase 3: Deep Dive for SN{netuid} ---", file=sys.stderr)
        output["deep_dive"] = deep_dive(netuid, signals)

    return output


def _filter_dev_activity(dev_data: Dict, netuid: int) -> List:
    """Extract dev activity entries for a specific netuid."""
    items = dev_data.get("data", []) if isinstance(dev_data, dict) else []
    return [d for d in items if str(d.get("netuid")) == str(netuid)]


def main():
    parser = argparse.ArgumentParser(description="Subnet Research — multi-phase analysis")
    parser.add_argument("--netuid", type=int, required=True, help="Primary subnet to research")
    parser.add_argument("--compare", type=str, default="", help="Comma-separated netuids to compare")
    parser.add_argument("--phase", type=str, choices=["broad"], default=None, help="Run only this phase")
    parser.add_argument("--deep", action="store_true", help="Include Phase 3 deep dive")
    args = parser.parse_args()

    results = {}

    # Research primary subnet
    results["primary"] = research_subnet(args.netuid, args.phase, args.deep)

    # Research comparison subnets
    if args.compare:
        compare_netuids = [int(n.strip()) for n in args.compare.split(",") if n.strip()]
        results["comparison"] = []
        for comp_netuid in compare_netuids:
            print(f"\n{'='*60}", file=sys.stderr)
            time.sleep(1)  # Extra pause between subnets for rate limiting
            results["comparison"].append(
                research_subnet(comp_netuid, args.phase, args.deep)
            )

    # Output JSON
    print(json.dumps(results, indent=2, default=str))


if __name__ == "__main__":
    main()
