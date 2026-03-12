#!/usr/bin/env python3
"""
Validator 24-Hour Stake Flow
Based on taostat/awesome-taostats-api-examples/python/valis_24hour_change.py

Shows top N validators with stake yesterday vs now, plus delegation in/out over last 24h.
7200 blocks ≈ 24 hours on Bittensor (~12s/block).

Usage:
  python3 valis_24hr.py [--top N] [--netuid NETUID]
  python3 valis_24hr.py              # top 25 global validators
  python3 valis_24hr.py --top 10
  python3 valis_24hr.py --netuid 19  # validators on specific subnet
"""

import sys
import argparse
from taostats_client import TaostatsAPI


BLOCKS_PER_DAY = 7200  # ~12s/block × 7200 = ~24h


def get_current_block(api: TaostatsAPI) -> int:
    result = api.get_json("block/v1?limit=1")
    return result["data"][0]["block_number"]


def get_top_validators(api: TaostatsAPI, n: int, netuid: int = None) -> dict:
    """Get top N validators by stake, optionally filtered to a subnet."""
    if netuid is not None:
        url = f"dtao/validator/yield/latest/v1?netuid={netuid}&limit={n}&order=stake_desc"
    else:
        url = f"validator/latest/v1?limit={n}&order=stake_desc"

    result = api.get_json(url)
    valis = {}

    for v in result.get("data", []):
        if netuid is not None:
            # dtao/validator/yield endpoint
            hk = v["hotkey"]["ss58"]
            name = v.get("name") or hk[:8]
            stake = float(v.get("stake", 0)) / 1e9
        else:
            # validator/latest endpoint
            hk = v["hotkey"]["ss58"]
            name = v.get("name") or hk[:8]
            stake = float(v.get("stake", 0)) / 1e9

        valis[hk] = {
            "name": name,
            "stake_now": stake,
            "delegated": 0.0,
            "undelegated": 0.0,
            "events": 0,
        }

    return valis


def get_delegation_events_in_range(api: TaostatsAPI, block_start: int, block_end: int) -> list:
    """Fetch all delegation events across all validators in block range."""
    all_events = []
    page = 1
    total_pages = 2

    while page < total_pages:
        result = api.get_json(
            f"delegation/v1?page={page}&limit=200"
            f"&block_start={block_start}&block_end={block_end}"
        )
        if not result:
            break

        total_pages = result.get("pagination", {}).get("total_pages", 1)
        all_events.extend(result.get("data", []))
        page += 1

    return all_events


def main():
    parser = argparse.ArgumentParser(description="Validator 24h stake flow")
    parser.add_argument("--top", type=int, default=25, help="Number of top validators (default: 25)")
    parser.add_argument("--netuid", type=int, help="Filter to specific subnet")
    args = parser.parse_args()

    api = TaostatsAPI()

    print(f"Getting current block...", file=sys.stderr)
    block_end = get_current_block(api)
    block_start = block_end - BLOCKS_PER_DAY
    print(f"Block range: {block_start} → {block_end} (~24h)", file=sys.stderr)

    scope = f"subnet {args.netuid}" if args.netuid else "global"
    print(f"Fetching top {args.top} validators ({scope})...", file=sys.stderr)
    valis = get_top_validators(api, args.top, args.netuid)

    print(f"Fetching delegation events in block range...", file=sys.stderr)
    events = get_delegation_events_in_range(api, block_start, block_end)

    # Aggregate events to validators
    for ev in events:
        # delegation endpoint uses 'delegate' field for the validator hotkey
        delegate = ev.get("delegate", {})
        hk = delegate.get("ss58") if isinstance(delegate, dict) else delegate

        if hk not in valis:
            continue

        amount = float(ev.get("amount", 0)) / 1e9
        action = ev.get("action", "")
        valis[hk]["events"] += 1

        if action == "UNDELEGATE":
            valis[hk]["undelegated"] += amount
        else:
            valis[hk]["delegated"] += amount

    # Print results
    print(f"\n{'Validator':<28} {'Stake 24h ago':>14} {'Stake Now':>12} {'Events':>7} {'Delegated':>12} {'Undelegated':>13}")
    print("-" * 92)

    for hk, v in valis.items():
        name = v["name"][:26]
        stake_now = v["stake_now"]
        delegated = v["delegated"]
        undelegated = v["undelegated"]
        stake_yesterday = round(stake_now + undelegated - delegated, 2)
        events = v["events"]

        flow = delegated - undelegated
        flow_str = f"{flow:+.2f}" if flow != 0 else "    —"

        print(
            f"{name:<28} {stake_yesterday:>14,.1f} {stake_now:>12,.1f} "
            f"{events:>7} {delegated:>12,.2f} {undelegated:>13,.2f}"
        )

    # Summary
    total_in  = sum(v["delegated"] for v in valis.values())
    total_out = sum(v["undelegated"] for v in valis.values())
    print(f"\n{'TOTAL':28} {'':>14} {'':>12} {'':>7} {total_in:>12,.2f} {total_out:>13,.2f}")
    print(f"Net flow (top {args.top}): {total_in - total_out:+.2f} TAO")


if __name__ == "__main__":
    main()
