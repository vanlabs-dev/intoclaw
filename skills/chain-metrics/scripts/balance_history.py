#!/usr/bin/env python3
"""
Balance History & Stake Earnings
Based on taostat/awesome-taostats-api-examples/python/balances.py
                                              and delegation_stake_earnings.py

Usage:
  python3 balance_history.py <coldkey> [--days N] [--earnings]
  python3 balance_history.py 5YourColdkeyHere --days 30
  python3 balance_history.py 5YourColdkeyHere --days 90 --earnings

Output: CSV-style daily balance history + optional stake earnings summary
"""

import sys
import json
import os
from pathlib import Path
from datetime import datetime, timedelta, timezone

# Ensure the scripts directory is on sys.path so sibling imports work
SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from taostats_client import TaostatsAPI


def stupid_time_fix(timestamp: str) -> str:
    """Handle timestamps with and without milliseconds (quirk from official examples)."""
    try:
        if len(timestamp) > 20:
            d = datetime.strptime(timestamp, "%Y-%m-%dT%H:%M:%S.%fZ")
        else:
            d = datetime.strptime(timestamp, "%Y-%m-%dT%H:%M:%SZ")
        return d.strftime("%Y-%m-%d")
    except ValueError:
        return timestamp[:10]


def get_balance_history(api: TaostatsAPI, coldkey: str, start_ts: int, end_ts: int) -> list:
    """Fetch all daily balance snapshots for a coldkey."""
    all_data = []
    page = 1
    count = 200

    while count > 0:
        result = api.get_json(
            f"account/history/v1?address={coldkey}"
            f"&timestamp_start={start_ts}&timestamp_end={end_ts}"
            f"&limit={count}&page={page}&order=timestamp_asc"
        )
        if not result or "data" not in result:
            break

        new_count = result.get("pagination", {}).get("total_items", 0)
        all_data.extend(result["data"])

        if new_count < 200 and new_count == count:
            break
        count = new_count
        page += 1

    return all_data


def get_delegation_events(api: TaostatsAPI, coldkey: str, start_ts: int, end_ts: int) -> list:
    """Fetch all stake/unstake events for a coldkey in a time window."""
    all_events = []
    page = 1
    count = 200

    while count > 0:
        result = api.get_json(
            f"delegation/v1?nominator={coldkey}"
            f"&timestamp_start={start_ts}&timestamp_end={end_ts}"
            f"&limit={count}&page={page}&order=block_number_asc"
        )
        if not result or "data" not in result:
            break

        new_count = result.get("pagination", {}).get("total_items", 0)
        all_events.extend(result["data"])

        if new_count < 200 and new_count == count:
            break
        count = new_count
        page += 1

    return all_events


def print_history(history: list):
    """Print daily balance table."""
    print(f"{'Date':<12} {'Free τ':>10} {'Staked τ':>14} {'Total τ':>14} {'Daily Δ':>12}")
    print("-" * 64)

    for i, row in enumerate(history):
        ts = row.get("timestamp", "")
        date = stupid_time_fix(ts)
        free   = float(row["balance_free"]) / 1e9
        staked = float(row["balance_staked"]) / 1e9
        total  = float(row["balance_total"]) / 1e9

        delta_str = ""
        if i > 0:
            prev_total = float(history[i-1]["balance_total"]) / 1e9
            delta = total - prev_total
            delta_str = f"{delta:+.4f}"

        print(f"{date:<12} {free:>10.4f} {staked:>14.4f} {total:>14.4f} {delta_str:>12}")


def calc_stake_earnings(history: list, delegation_events: list, include_first_delegation: bool = False) -> float:
    """
    Calculate net stake earnings (yield only, excluding manual stake/unstake).
    
    Formula: total_staked_change - net_delegation_events = pure_yield
    From official pattern in delegation_stake_earnings.py
    """
    if len(history) < 2:
        return 0.0

    # Sum day-over-day staked changes
    total_staked_change = 0.0
    for i in range(1, len(history)):
        curr = float(history[i]["balance_staked"]) / 1e9
        prev = float(history[i-1]["balance_staked"]) / 1e9
        total_staked_change += curr - prev

    # Sum delegation events (net)
    net_delegations = 0.0
    include = include_first_delegation

    for event in delegation_events:
        action = event.get("action", "")
        amount = float(event.get("amount", 0)) / 1e9

        if action == "DELEGATE":
            if include:
                net_delegations += amount
            else:
                include = True  # Skip first delegation only
        else:  # UNDELEGATE
            net_delegations -= amount

    return total_staked_change - net_delegations


def main():
    import argparse
    parser = argparse.ArgumentParser(description="TaoStats balance history")
    parser.add_argument("coldkey", help="Coldkey SS58 address")
    parser.add_argument("--days", type=int, default=30, help="Number of days (default: 30)")
    parser.add_argument("--earnings", action="store_true", help="Calculate stake earnings")
    parser.add_argument("--include-first-delegation", action="store_true",
                        help="Include first delegation event in earnings calc (use for existing wallets)")
    args = parser.parse_args()

    now = int(datetime.now(timezone.utc).timestamp())
    start = now - (args.days * 86400)

    api = TaostatsAPI()

    print(f"Fetching {args.days}-day balance history for {args.coldkey[:12]}...", file=sys.stderr)
    history = get_balance_history(api, args.coldkey, start, now)

    if not history:
        print("No balance history found.")
        return

    print_history(history)

    if history:
        first_total = float(history[0]["balance_total"]) / 1e9
        last_total  = float(history[-1]["balance_total"]) / 1e9
        change = last_total - first_total
        pct = (change / first_total * 100) if first_total else 0
        print(f"\nPeriod: {len(history)} days | Start: {first_total:.4f} τ | End: {last_total:.4f} τ | Change: {change:+.4f} τ ({pct:+.2f}%)")

    if args.earnings:
        print(f"\nFetching delegation events...", file=sys.stderr)
        events = get_delegation_events(api, args.coldkey, start, now)
        earnings = calc_stake_earnings(history, events, args.include_first_delegation)
        print(f"\n📊 Stake earnings (yield only): {earnings:.6f} τ over {args.days} days")

        if len(history) > 0:
            daily_avg = earnings / len(history)
            annual_est = daily_avg * 365
            print(f"   Daily avg: {daily_avg:.6f} τ | Annualised estimate: {annual_est:.4f} τ")


if __name__ == "__main__":
    main()
