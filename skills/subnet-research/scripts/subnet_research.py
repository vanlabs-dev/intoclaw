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
import tempfile
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

try:
    import requests
except ImportError:
    print("Error: 'requests' library required. Install with: pip install requests", file=sys.stderr)
    sys.exit(1)

# Optional deps — degrade gracefully if missing
try:
    import pyfiglet
    HAS_PYFIGLET = True
except ImportError:
    HAS_PYFIGLET = False

try:
    import matplotlib
    matplotlib.use("Agg")  # non-interactive backend for headless rendering
    import matplotlib.pyplot as plt
    import matplotlib.dates as mdates
    HAS_MATPLOTLIB = True
except ImportError:
    HAS_MATPLOTLIB = False


SCRIPT_DIR = Path(__file__).resolve().parent
SKILL_DIR = SCRIPT_DIR.parent
WORKSPACE_ROOT = SKILL_DIR.parent.parent

# API config
TAOSTATS_BASE = "https://api.taostats.io/api"
DESEARCH_BASE = "https://api.desearch.ai"

# Unit conversion: TaoStats returns many values in rao (1 TAO = 1e9 rao)
RAO_PER_TAO = 1_000_000_000


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
    """Load .env from relevant locations — scan all sibling skill dirs, then workspace root."""
    # This skill's own .env (if someone puts keys here)
    _load_dotenv(SKILL_DIR / ".env")
    # Scan all sibling skill directories for .env files
    # (handles any skill dir name — doesn't assume "chain-metrics" or "desearch")
    skills_dir = SKILL_DIR.parent
    if skills_dir.is_dir():
        for sibling in skills_dir.iterdir():
            if sibling.is_dir() and sibling != SKILL_DIR:
                _load_dotenv(sibling / ".env")
    # Workspace root
    _load_dotenv(WORKSPACE_ROOT / ".env")


_load_all_env()


def _get_key(name: str) -> str:
    key = os.environ.get(name, "")
    if not key:
        print(f"Error: {name} not set. Check .env files in skill dirs or set in environment.", file=sys.stderr)
        sys.exit(1)
    return key


# ── Helpers ───────────────────────────────────────────────────────────────────

def _safe_float(val: Any) -> Optional[float]:
    """Safely convert to float, returning None on failure."""
    if val is None:
        return None
    try:
        return float(val)
    except (ValueError, TypeError):
        return None


def _rao_to_tao(val: Any) -> Optional[float]:
    """Convert rao to TAO. Returns None if input is None or invalid."""
    f = _safe_float(val)
    if f is None:
        return None
    return f / RAO_PER_TAO


# ── ASCII Banner ─────────────────────────────────────────────────────────────

def generate_ascii_header(netuid: int) -> Optional[str]:
    """Generate an ASCII art banner like 'SN44' using pyfiglet."""
    if not HAS_PYFIGLET:
        print("  pyfiglet not installed — skipping ASCII banner. pip install pyfiglet", file=sys.stderr)
        return None
    try:
        text = f"SN{netuid}"
        # Try 'slant' first (clean italic), fall back to 'big'
        for font in ("slant", "big", "standard"):
            try:
                banner = pyfiglet.figlet_format(text, font=font)
                if banner.strip():
                    return banner.rstrip("\n")
            except pyfiglet.FontNotFound:
                continue
        return pyfiglet.figlet_format(text).rstrip("\n")
    except Exception as e:
        print(f"  ASCII banner failed: {e}", file=sys.stderr)
        return None


# ── Net Flow Chart ───────────────────────────────────────────────────────────

def generate_netflow_chart(netuid: int, subnet_name: str = "") -> Optional[str]:
    """Generate a 30-day net flow line chart as PNG, return file path or None."""
    if not HAS_MATPLOTLIB:
        print("  matplotlib not installed — skipping chart. pip install matplotlib", file=sys.stderr)
        return None

    try:
        # Pull 30 days of pool history (has total_tao we can diff for daily flow)
        print(f"  Pulling 30-day pool history for chart...", file=sys.stderr)
        hist = _taostats_get(f"dtao/pool/history/v1?netuid={netuid}&interval=day&limit=31")
        records = hist.get("data", [])
        if not records or len(records) < 3:
            print("  Not enough history data for chart.", file=sys.stderr)
            return None

        # Data comes newest-first — reverse to chronological order
        records = list(reversed(records))

        dates = []
        flows = []
        for i in range(1, len(records)):
            ts = records[i].get("timestamp", "")
            prev_tao = _rao_to_tao(records[i - 1].get("total_tao")) or 0
            curr_tao = _rao_to_tao(records[i].get("total_tao")) or 0
            daily_flow = curr_tao - prev_tao
            try:
                dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
                dates.append(dt)
                flows.append(daily_flow)
            except (ValueError, AttributeError):
                continue

        if len(dates) < 3:
            print("  Not enough valid data points for chart.", file=sys.stderr)
            return None

        # ── Style: dark background, TAO gold line ──
        fig, ax = plt.subplots(figsize=(10, 4))
        fig.patch.set_facecolor("#0d0d0d")
        ax.set_facecolor("#0d0d0d")

        # Gold line for net flow
        ax.plot(dates, flows, color="#e8c14a", linewidth=1.8, zorder=3)

        # Fill above/below zero
        ax.fill_between(dates, flows, 0,
                         where=[f >= 0 for f in flows], color="#e8c14a", alpha=0.15, interpolate=True)
        ax.fill_between(dates, flows, 0,
                         where=[f < 0 for f in flows], color="#ff4444", alpha=0.15, interpolate=True)

        # Zero baseline
        ax.axhline(y=0, color="#555555", linestyle="--", linewidth=0.8, zorder=2)

        # Title and labels
        title = f"SN{netuid}"
        if subnet_name:
            title += f" ({subnet_name})"
        title += " — Daily Net TAO Flow (30d)"
        ax.set_title(title, color="#e8c14a", fontsize=13, fontweight="bold", pad=12)
        ax.set_ylabel("TAO", color="#aaaaaa", fontsize=10)

        # Axis styling
        ax.tick_params(colors="#888888", which="both")
        ax.xaxis.set_major_formatter(mdates.DateFormatter("%b %d"))
        ax.xaxis.set_major_locator(mdates.WeekdayLocator(interval=1))
        fig.autofmt_xdate(rotation=30)
        for spine in ax.spines.values():
            spine.set_color("#333333")
        ax.grid(axis="y", color="#222222", linewidth=0.5)

        # Save
        out_path = os.path.join(tempfile.gettempdir(), f"sn{netuid}_netflow.png")
        fig.savefig(out_path, dpi=150, bbox_inches="tight", facecolor="#0d0d0d", edgecolor="none")
        plt.close(fig)

        print(f"  Chart saved: {out_path}", file=sys.stderr)
        return out_path

    except Exception as e:
        print(f"  Chart generation failed: {e}", file=sys.stderr)
        return None


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

    # Note: We intentionally do NOT pull from the TaoStats slippage simulation endpoint.
    # Testing shows it returns wildly inaccurate numbers compared to actual on-chain swaps
    # (e.g. 14% simulated vs <0.4% actual for a 10 TAO buy). Liquidity depth is assessed
    # via pool metrics instead (liquidity/market_cap ratio + volume).

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

def _extract_pool_item(chain_data: Dict) -> Dict:
    """Extract the first pool data item from chain data."""
    pool = chain_data.get("pool", {})
    if "data" in pool and pool["data"]:
        return pool["data"][0] if isinstance(pool["data"], list) else pool["data"]
    return {}


def _extract_subnet_item(chain_data: Dict) -> Dict:
    """Extract the first subnet info item from chain data."""
    subnet = chain_data.get("subnet_info", {})
    if "data" in subnet and subnet["data"]:
        return subnet["data"][0] if isinstance(subnet["data"], list) else subnet["data"]
    return {}



def identify_signals(chain_data: Dict, social_data: Dict) -> List[Dict[str, Any]]:
    """Evaluate data for notable signals."""
    signals = []

    pool_item = _extract_pool_item(chain_data)
    subnet_item = _extract_subnet_item(chain_data)

    # -- Inactive subnet detection --
    price = _safe_float(pool_item.get("price"))
    # volume_24h is in RAO — convert to TAO
    volume_24h_tao = _rao_to_tao(pool_item.get("tao_volume_24_hr"))
    if price is not None and price > 1.0:
        severity = "critical" if (volume_24h_tao is not None and volume_24h_tao < 1.0) else "high"
        vol_msg = f" 24h volume: {volume_24h_tao:.2f} TAO." if volume_24h_tao is not None else ""
        signals.append({
            "signal": "inactive_subnet",
            "severity": severity,
            "value": price,
            "message": f"Price is {price:.4f} TAO (above 1 TAO). "
                       f"This likely indicates an inactive/zombie subnet with no real market activity.{vol_msg}",
        })

    # -- Low liquidity risk --
    # liquidity and market_cap are in RAO — convert to TAO
    # NOTE: We do NOT use the TaoStats slippage simulation endpoint as a signal.
    # Testing shows it returns wildly inaccurate numbers compared to actual on-chain
    # swaps (e.g. 14% simulated vs <0.4% actual). Instead we assess liquidity depth
    # via pool metrics which are derived from actual on-chain state.
    liquidity_tao = _rao_to_tao(pool_item.get("liquidity"))
    market_cap_tao = _rao_to_tao(pool_item.get("market_cap"))
    volume_24h_tao_liq = _rao_to_tao(pool_item.get("tao_volume_24_hr"))

    if liquidity_tao is not None and market_cap_tao is not None and market_cap_tao > 0:
        liq_ratio = liquidity_tao / market_cap_tao
        if liq_ratio < 0.05:
            signals.append({
                "signal": "low_liquidity",
                "severity": "high",
                "value": liq_ratio,
                "message": f"Liquidity ({liquidity_tao:,.2f} TAO) is only {liq_ratio*100:.1f}% of market cap. "
                           f"This pool is thin — larger trades may see noticeable price impact.",
            })
        elif liq_ratio < 0.15:
            vol_context = ""
            if volume_24h_tao_liq is not None and volume_24h_tao_liq < liquidity_tao * 0.03:
                vol_context = f" Daily volume ({volume_24h_tao_liq:,.2f} TAO) is also low relative to pool size."
            signals.append({
                "signal": "moderate_liquidity",
                "severity": "low",
                "value": liq_ratio,
                "message": f"Liquidity ({liquidity_tao:,.2f} TAO) is {liq_ratio*100:.1f}% of market cap. "
                           f"Adequate for small-medium trades but size in carefully on larger positions.{vol_context}",
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

    # -- Net flows (values are in RAO — convert to TAO) --
    net_flow_7d_tao = _rao_to_tao(subnet_item.get("net_flow_7_days"))
    net_flow_30d_tao = _rao_to_tao(subnet_item.get("net_flow_30_days"))
    if net_flow_7d_tao is not None and net_flow_7d_tao < 0:
        signals.append({
            "signal": "capital_outflow_7d",
            "severity": "high" if net_flow_7d_tao < -500 else ("medium" if net_flow_7d_tao < -50 else "low"),
            "value": net_flow_7d_tao,
            "message": f"7-day net flow is {net_flow_7d_tao:,.2f} TAO — capital is leaving this subnet.",
        })
    if net_flow_30d_tao is not None and net_flow_30d_tao < 0:
        signals.append({
            "signal": "capital_outflow_30d",
            "severity": "high" if net_flow_30d_tao < -2000 else ("medium" if net_flow_30d_tao < -200 else "low"),
            "value": net_flow_30d_tao,
            "message": f"30-day net flow is {net_flow_30d_tao:,.2f} TAO — sustained capital outflow.",
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
    # Note: dev_activity/latest/v1 returns repos keyed by owner/org, not by netuid.
    # Matching by netuid is unreliable — many subnets won't appear even if active.
    # We skip this as a signal to avoid false positives. The raw data is still in
    # the output for the bot to inspect if relevant.

    # -- Stake concentration --
    # Removed as a signal. High validator concentration is the norm across the
    # Bittensor ecosystem at this stage — flagging it on every subnet adds noise,
    # not insight. Validator stake data is still in the display summary for the
    # bot to narrate if relevant.

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

    return signals


def build_display_summary(chain_data: Dict, signals: List[Dict]) -> Dict[str, Any]:
    """Build a display-ready summary with pre-converted units.

    Everything in this block is human-readable — TAO not rao, percentages not decimals.
    The bot can narrate directly from these values without unit conversion.
    """
    pool_item = _extract_pool_item(chain_data)
    subnet_item = _extract_subnet_item(chain_data)

    # Validators — use correct field names: "name" and "seven_day_apy"
    validators_data = chain_data.get("validators", {})
    validator_items = validators_data.get("data", []) if isinstance(validators_data, dict) else []
    top_validators = []
    for v in sorted(validator_items, key=lambda x: _safe_float(x.get("seven_day_apy")) or 0, reverse=True)[:5]:
        top_validators.append({
            "name": v.get("name", "unknown"),
            "hotkey": v.get("hotkey", {}).get("ss58", "") if isinstance(v.get("hotkey"), dict) else v.get("hotkey", ""),
            "stake_tao": round(_rao_to_tao(v.get("stake")) or 0, 2),
            "seven_day_apy": _safe_float(v.get("seven_day_apy")),
            "thirty_day_apy": _safe_float(v.get("thirty_day_apy")),
            "seven_day_participation": _safe_float(v.get("seven_day_epoch_participation")),
        })

    # Liquidity depth — ratio of liquidity to market cap
    liq_tao = _rao_to_tao(pool_item.get("liquidity")) or 0
    mcap_tao = _rao_to_tao(pool_item.get("market_cap")) or 0
    liq_ratio_pct = round((liq_tao / mcap_tao) * 100, 1) if mcap_tao > 0 else None

    display = {
        "subnet_name": pool_item.get("name", "Unknown"),
        "netuid": pool_item.get("netuid"),
        "price_tao": _safe_float(pool_item.get("price")),
        "root_prop": _safe_float(pool_item.get("root_prop")),
        "fear_and_greed_index": _safe_float(pool_item.get("fear_and_greed_index")),
        "fear_and_greed_sentiment": pool_item.get("fear_and_greed_sentiment", ""),
        "liquidity_tao": round(liq_tao, 2),
        "market_cap_tao": round(mcap_tao, 2),
        "volume_24h_tao": round(_rao_to_tao(pool_item.get("tao_volume_24_hr")) or 0, 2),
        "liquidity_ratio_pct": liq_ratio_pct,
        "net_flow_7d_tao": round(_rao_to_tao(subnet_item.get("net_flow_7_days")) or 0, 2),
        "net_flow_30d_tao": round(_rao_to_tao(subnet_item.get("net_flow_30_days")) or 0, 2),
        # emission (raw on-chain int) vs projected_emission (fraction of total, e.g. 0.029 = 2.9%)
        "emission_pct": round((_safe_float(subnet_item.get("projected_emission")) or 0) * 100, 2),
        "active_validators": subnet_item.get("active_validators"),
        "active_miners": subnet_item.get("active_miners"),
        "startup_mode": pool_item.get("startup_mode"),
        "top_validators": top_validators,
        "signal_count": len(signals),
        "signal_severities": {
            "critical": sum(1 for s in signals if s["severity"] == "critical"),
            "high": sum(1 for s in signals if s["severity"] == "high"),
            "medium": sum(1 for s in signals if s["severity"] == "medium"),
            "low": sum(1 for s in signals if s["severity"] == "low"),
        },
    }
    return display


# ── Phase 3: Deep Dive ───────────────────────────────────────────────────────

def deep_dive(netuid: int, signals: List[Dict]) -> Dict[str, Any]:
    """Conditional deeper data pulls based on flagged signals."""
    result = {}
    signal_names = {s["signal"] for s in signals}

    if "low_liquidity" in signal_names:
        print(f"  Deep dive: metagraph for stake distribution (liquidity context)...", file=sys.stderr)
        result["metagraph_liquidity"] = _taostats_get(f"metagraph/latest/v1?netuid={netuid}&limit=20")
        time.sleep(0.3)

    if any(s["signal"].startswith("capital_outflow") for s in signals):
        print(f"  Deep dive: metagraph for stake distribution...", file=sys.stderr)
        result["metagraph"] = _taostats_get(f"metagraph/latest/v1?netuid={netuid}&limit=50")
        time.sleep(0.3)

    if "concentrated_social" in signal_names:
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

    # ASCII banner — generated first so the bot can print it before anything else
    ascii_header = generate_ascii_header(netuid)
    if ascii_header:
        output["ascii_header"] = ascii_header

    # Phase 1: Broad Scan
    print(f"\n--- Phase 1: Broad Scan for SN{netuid} ---", file=sys.stderr)
    chain_data = collect_chain_data(netuid)
    time.sleep(0.3)
    social_data = collect_social_data(netuid)

    output["pool"] = chain_data.get("pool", {})
    output["subnet_info"] = chain_data.get("subnet_info", {})
    output["validators"] = chain_data.get("validators", {})
    output["social"] = social_data.get("twitter", {})
    output["web_research"] = social_data.get("web_research", {})

    if phase_only == "broad":
        output["signals"] = []
        output["display"] = build_display_summary(chain_data, [])
        return output

    # Phase 2: Signal Identification
    print(f"\n--- Phase 2: Signal Identification for SN{netuid} ---", file=sys.stderr)
    signals = identify_signals(chain_data, social_data)
    output["signals"] = signals
    output["display"] = build_display_summary(chain_data, signals)

    for s in signals:
        print(f"  [{s['severity'].upper()}] {s['signal']}: {s['message']}", file=sys.stderr)

    if not signals:
        print("  No notable signals found.", file=sys.stderr)

    # Phase 3: Deep Dive (optional)
    if include_deep and signals:
        print(f"\n--- Phase 3: Deep Dive for SN{netuid} ---", file=sys.stderr)
        output["deep_dive"] = deep_dive(netuid, signals)

    # Net flow chart — generated after all phases, non-blocking on failure
    subnet_name = output.get("display", {}).get("subnet_name", "")
    chart_path = generate_netflow_chart(netuid, subnet_name)
    output["chart_path"] = chart_path  # null if generation failed

    return output


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
