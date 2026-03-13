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
from datetime import datetime
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


# ── Telegram Message Formatter ────────────────────────────────────────────────

def _escape_domains(text: str) -> str:
    """Replace dots in domain-like strings with (dot) to prevent link previews."""
    import re
    # Match common TLD patterns: word.word where second word is a known TLD or looks like one
    return re.sub(
        r'(\b\w+)\.(\w{2,6}\b)',
        lambda m: f"{m.group(1)}(dot){m.group(2)}"
            if m.group(2).lower() in {
                "com", "io", "ai", "org", "net", "co", "xyz", "dev", "app",
                "bot", "finance", "exchange", "network", "protocol", "tech",
                "gg", "me", "info", "cc", "tv", "sh", "de", "uk", "us",
            }
            else m.group(0),
        text,
    )


def _fmt_flow(val: float) -> str:
    """Format net flow value with direction arrow."""
    if val >= 0:
        return f"↑ +{val:,.0f} TAO inflow"
    return f"↓ {val:,.0f} TAO outflow"


def _fmt_stake(val: float) -> str:
    """Format stake in K format."""
    if val >= 1000:
        return f"{val/1000:.0f}K TAO"
    return f"{val:,.0f} TAO"


def _severity_emoji(sev: str) -> str:
    """Map severity to colored emoji."""
    return {"critical": "🔴", "high": "🔴", "medium": "🟡", "low": "🟢"}.get(sev, "⚪")


def _html_escape(text: str) -> str:
    """Escape HTML special characters in user-generated text."""
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def build_telegram_messages(
    display: Dict[str, Any],
    signals: List[Dict],
    social_data: Dict,
    web_research: Dict,
) -> Dict[str, Optional[str]]:
    """Build 4 pre-formatted Telegram message strings in HTML parse_mode.

    Uses Telegram Bot API HTML formatting:
      <b>bold</b>  <i>italic</i>  <code>mono</code>
    Each message stays under 3800 chars (Telegram limit is 4096).
    """

    netuid = display.get("netuid", "?")
    name = _html_escape(_escape_domains(display.get("subnet_name", "Unknown")))
    date_str = datetime.now().strftime("%Y-%m-%d")

    # ── msg1: Header + Overview + On-Chain Health ──

    sev = display.get("signal_severities", {})
    signal_summary_parts = []
    if sev.get("critical", 0): signal_summary_parts.append(f"🔴 {sev['critical']} critical")
    if sev.get("high", 0): signal_summary_parts.append(f"🔴 {sev['high']} high")
    if sev.get("medium", 0): signal_summary_parts.append(f"🟡 {sev['medium']} medium")
    if sev.get("low", 0): signal_summary_parts.append(f"🟢 {sev['low']} low")
    signal_line = " · ".join(signal_summary_parts) if signal_summary_parts else "🟢 No notable signals"

    price = display.get("price_tao")
    price_str = f"{price:.6f}" if price is not None else "N/A"
    root_prop = display.get("root_prop")
    root_str = f"{root_prop:.2f}" if root_prop is not None else "N/A"
    fng = display.get("fear_and_greed_index")
    fng_sent = display.get("fear_and_greed_sentiment", "")
    fng_str = f"{fng:.0f} ({fng_sent})" if fng is not None else "N/A"
    liq = display.get("liquidity_tao", 0)
    liq_ratio = display.get("liquidity_ratio_pct")
    liq_str = f"{liq:,.0f} TAO"
    if liq_ratio is not None:
        liq_str += f" ({liq_ratio}% of mcap)"
    mcap = display.get("market_cap_tao", 0)
    vol = display.get("volume_24h_tao", 0)
    flow_7d = display.get("net_flow_7d_tao", 0)
    flow_30d = display.get("net_flow_30d_tao", 0)
    emission = display.get("emission_pct", 0)
    active_v = display.get("active_validators", "?")
    active_m = display.get("active_miners", "?")
    startup = display.get("startup_mode", False)

    msg1 = f"""<b>SN{netuid} — {name}</b>
{date_str} · TaoStats + Desearch
Signals: {signal_line}

📊 <b>On-Chain Health</b>

<b>Price:</b> {price_str} TAO
<b>Root Prop:</b> {root_str}
<b>Fear &amp; Greed:</b> {fng_str}

<b>Liquidity:</b> {liq_str}
<b>Market Cap:</b> {_fmt_stake(mcap)}
<b>Volume 24h:</b> {_fmt_stake(vol)}

<b>Net Flow 7d:</b> {_fmt_flow(flow_7d)}
<b>Net Flow 30d:</b> {_fmt_flow(flow_30d)}

<b>Emission:</b> {emission}%
<b>Validators:</b> {active_v} active · <b>Miners:</b> {active_m} active
<b>Startup Mode:</b> {"Yes ⚠️" if startup else "No"}"""

    # ── msg2: Validators + Social ──

    validators = display.get("top_validators", [])
    vali_lines = []
    for v in validators[:5]:
        vname = _html_escape(_escape_domains(v.get("name", "unknown")))
        stake = _fmt_stake(v.get("stake_tao", 0))
        apy7 = v.get("seven_day_apy")
        apy_str = f"{apy7 * 100:.1f}%" if apy7 is not None else "N/A"
        part = v.get("seven_day_participation")
        part_str = f"{part*100:.0f}%" if part is not None else "N/A"
        vali_lines.append(f"• <b>{vname}</b> · {stake} · {apy_str} 7d APY · {part_str} participation")

    vali_block = "\n".join(vali_lines) if vali_lines else "No validator data available."

    # Social — extract key points from web research summary
    social_summary = ""
    if isinstance(web_research, dict):
        summary = web_research.get("summary", "") or web_research.get("result", "")
        if isinstance(summary, str) and summary:
            social_summary = _html_escape(_escape_domains(summary[:800]))
        elif isinstance(web_research.get("data"), list):
            items = web_research["data"][:5]
            social_summary = "\n".join(
                f"• {_html_escape(_escape_domains(str(item.get('title', ''))))}"
                for item in items if isinstance(item, dict)
            )

    # Twitter bullet points
    tweets = social_data if isinstance(social_data, list) else []
    tweet_lines = []
    seen_users = set()
    for t in tweets[:10]:
        if not isinstance(t, dict):
            continue
        user = t.get("user", {})
        username = user.get("username", "") if isinstance(user, dict) else ""
        text = t.get("text", "")
        if username and username not in seen_users and text:
            seen_users.add(username)
            short = _html_escape(_escape_domains(text[:120].replace("\n", " ")))
            uname = _html_escape(_escape_domains(username))
            tweet_lines.append(f"• @{uname}: {short}")
        if len(tweet_lines) >= 4:
            break

    social_block = ""
    if social_summary:
        social_block = social_summary
    if tweet_lines:
        if social_block:
            social_block += "\n\n"
        social_block += "\n".join(tweet_lines)
    if not social_block:
        social_block = "No recent social data found."

    msg2 = f"""👥 <b>Validator Landscape</b>

{vali_block}

📣 <b>Social &amp; Community</b>

{social_block}"""

    # Trim msg2 if over limit
    if len(msg2) > 3800:
        msg2 = msg2[:3750] + "\n\n<i>(truncated)</i>"

    # ── msg3: Reserved ──
    msg3 = None

    # ── msg4: Key Findings + Risks + Bottom Line ──

    findings_lines = []
    risk_lines = []
    finding_num = 1
    for s in signals:
        emoji = _severity_emoji(s["severity"])
        signal_name = _html_escape(s["signal"].replace("_", " ").title())
        msg_text = _html_escape(_escape_domains(s.get("message", "")))

        if s["severity"] in ("critical", "high"):
            risk_lines.append(f"{emoji} <b>{signal_name}</b> — {msg_text}")
        else:
            findings_lines.append(f"{finding_num}. <b>{signal_name}:</b> {msg_text}")
            finding_num += 1

    if not risk_lines:
        risk_lines.append("🟢 No high-severity risks detected.")
    if not findings_lines:
        findings_lines.append("1. No notable signals — fundamentals look clean across the board.")

    # Bottom line
    crit_count = sev.get("critical", 0) + sev.get("high", 0)
    if crit_count >= 2:
        bottom = f"<b>⚠️ Multiple red flags detected. Approach SN{netuid} with extreme caution.</b>"
    elif crit_count == 1:
        bottom = f"<b>🟡 One significant concern flagged. Review the risk above before committing to SN{netuid}.</b>"
    elif sev.get("medium", 0) >= 2:
        bottom = f"<b>🟡 A few caution signals on SN{netuid}. Not dealbreakers, but size positions carefully.</b>"
    else:
        bottom = f"<b>🟢 SN{netuid} looks healthy on the metrics. No red flags in the data.</b>"

    msg4 = f"""🔍 <b>Key Findings</b>

{chr(10).join(findings_lines[:6])}

⚠️ <b>Risk Factors</b>

{chr(10).join(risk_lines[:5])}

{bottom}"""

    if len(msg4) > 3800:
        msg4 = msg4[:3750] + "\n\n<i>(truncated)</i>"

    return {"msg1": msg1, "msg2": msg2, "msg3": msg3, "msg4": msg4}


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

    # Pre-formatted Telegram messages — ready to send directly
    output["telegram"] = build_telegram_messages(
        output["display"],
        signals,
        social_data.get("twitter", {}),
        social_data.get("web_research", {}),
    )

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
