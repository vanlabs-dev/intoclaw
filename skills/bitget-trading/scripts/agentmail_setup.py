#!/usr/bin/env python3
"""
AgentMail-powered Bitget account setup.

Creates a dedicated email inbox via AgentMail, then assists with Bitget
registration by monitoring for verification codes. Minimizes human
interaction — the agent handles email creation and code extraction.

Usage:
    # Create inbox for Bitget registration
    python3 scripts/agentmail_setup.py create-inbox

    # Wait for verification email and extract code
    python3 scripts/agentmail_setup.py wait-for-code INBOX_ID

    # List inboxes
    python3 scripts/agentmail_setup.py list-inboxes

    # Read latest messages
    python3 scripts/agentmail_setup.py read-inbox INBOX_ID [--limit 5]

    # Full registration assist (create inbox + wait for code)
    python3 scripts/agentmail_setup.py register

Requires: pip install agentmail
Env: AGENTMAIL_API_KEY (from https://console.agentmail.to)
"""

import argparse
import json
import os
import re
import sys
import time

# ── Load .env ──────────────────────────────────────────────────
def load_env():
    """Load .env from skill dir, then workspace root, then rely on shell env."""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    skill_dir = os.path.dirname(script_dir)
    candidates = [
        os.path.join(skill_dir, ".env"),
        os.path.join(os.getcwd(), ".env"),
    ]
    for path in candidates:
        if os.path.isfile(path):
            with open(path) as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        key, _, value = line.partition("=")
                        key = key.strip()
                        value = value.strip().strip("'\"")
                        if key and value and key not in os.environ:
                            os.environ[key] = value
            break

load_env()

# ── Validate dependencies ─────────────────────────────────────
def get_client():
    try:
        from agentmail import AgentMail
    except ImportError:
        print(json.dumps({
            "error": "agentmail package not installed",
            "fix": "pip install agentmail",
        }))
        sys.exit(1)

    api_key = os.environ.get("AGENTMAIL_API_KEY")
    if not api_key:
        print(json.dumps({
            "error": "AGENTMAIL_API_KEY not set",
            "fix": "Add AGENTMAIL_API_KEY to your .env file. Get a key at https://console.agentmail.to",
        }))
        sys.exit(1)

    return AgentMail(api_key=api_key)


# ── Commands ──────────────────────────────────────────────────
REFERRAL_URL = "https://share.bitget.com/u/PRV8CK0B"


def create_inbox(display_name: str = "Bitget Trading Agent") -> dict:
    """Create a new AgentMail inbox for Bitget registration."""
    client = get_client()
    inbox = client.inboxes.create(display_name=display_name)

    result = {
        "inbox_id": inbox.inbox_id,
        "email": inbox.email,
        "display_name": display_name,
        "status": "created",
        "next_step": f"Use {inbox.email} to register at {REFERRAL_URL}",
    }
    print(json.dumps(result, indent=2))
    return result


def list_inboxes() -> dict:
    """List all AgentMail inboxes."""
    client = get_client()
    response = client.inboxes.list()
    inboxes = []
    for inbox in response.data:
        inboxes.append({
            "inbox_id": inbox.inbox_id,
            "email": inbox.email,
            "display_name": getattr(inbox, "display_name", None),
        })

    result = {"inboxes": inboxes, "count": len(inboxes)}
    print(json.dumps(result, indent=2))
    return result


def read_inbox(inbox_id: str, limit: int = 5) -> dict:
    """Read recent messages from an inbox."""
    client = get_client()
    response = client.messages.list(inbox_id=inbox_id, limit=limit)
    messages = []
    for msg in response.data:
        messages.append({
            "message_id": msg.message_id,
            "from": getattr(msg, "from_", None) or getattr(msg, "from_address", None),
            "subject": msg.subject,
            "received_at": getattr(msg, "received_at", None) or getattr(msg, "created_at", None),
            "snippet": (getattr(msg, "extracted_text", None) or getattr(msg, "text", "") or "")[:200],
        })

    result = {"inbox_id": inbox_id, "messages": messages, "count": len(messages)}
    print(json.dumps(result, indent=2, default=str))
    return result


def extract_verification_code(text: str) -> str | None:
    """Extract a verification code from email text.

    Bitget sends 6-digit numeric codes. Also handles common patterns
    like 'verification code: 123456' or 'code is 123456'.
    """
    if not text:
        return None

    # Look for explicit "code" context first
    patterns = [
        r'(?:verification|confirm|verify|code|pin|otp)[\s:]*(\d{6})',
        r'(\d{6})[\s]*(?:is your|verification|code)',
        r'\b(\d{6})\b',  # Fallback: any standalone 6-digit number
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return match.group(1)
    return None


def wait_for_code(inbox_id: str, timeout: int = 300, poll_interval: int = 5) -> dict:
    """Poll inbox for a verification email and extract the code.

    Waits up to `timeout` seconds, checking every `poll_interval` seconds.
    Returns the code as soon as it's found.
    """
    client = get_client()
    start = time.time()
    seen_ids: set[str] = set()

    # Record existing messages so we only look at new ones
    try:
        existing = client.messages.list(inbox_id=inbox_id, limit=50)
        for msg in existing.data:
            seen_ids.add(msg.message_id)
    except Exception:
        pass

    print(json.dumps({"status": "waiting", "inbox_id": inbox_id, "timeout_seconds": timeout}),
          file=sys.stderr)

    while time.time() - start < timeout:
        try:
            response = client.messages.list(inbox_id=inbox_id, limit=10)
            for msg in response.data:
                if msg.message_id in seen_ids:
                    continue
                seen_ids.add(msg.message_id)

                # Check subject and body for verification codes
                text = ""
                subject = msg.subject or ""
                extracted = getattr(msg, "extracted_text", None)
                body_text = getattr(msg, "text", None)
                text = f"{subject} {extracted or ''} {body_text or ''}"

                code = extract_verification_code(text)
                if code:
                    result = {
                        "status": "found",
                        "code": code,
                        "from": getattr(msg, "from_", None) or getattr(msg, "from_address", None),
                        "subject": subject,
                        "elapsed_seconds": round(time.time() - start, 1),
                    }
                    print(json.dumps(result, indent=2, default=str))
                    return result

        except Exception as e:
            print(json.dumps({"status": "poll_error", "error": str(e)}), file=sys.stderr)

        time.sleep(poll_interval)

    result = {
        "status": "timeout",
        "inbox_id": inbox_id,
        "elapsed_seconds": timeout,
        "message": "No verification code received within timeout. Check the inbox manually or try again.",
    }
    print(json.dumps(result, indent=2))
    return result


def register_flow() -> dict:
    """Full registration assist: create inbox, provide instructions, wait for code."""
    # Step 1: Create inbox
    client = get_client()
    inbox = client.inboxes.create(display_name="Bitget Trading Agent")

    setup = {
        "step": 1,
        "status": "inbox_created",
        "inbox_id": inbox.inbox_id,
        "email": inbox.email,
        "instructions": [
            f"1. Open {REFERRAL_URL} in a browser",
            f"2. Click 'Sign Up' and enter this email: {inbox.email}",
            "3. Set a strong password",
            "4. Click 'Get Code' — Bitget will send a verification email",
            "5. Come back here — I'm watching the inbox for the code",
        ],
    }
    print(json.dumps(setup, indent=2))

    # Step 2: Wait for verification code
    print(json.dumps({"step": 2, "status": "watching_inbox", "email": inbox.email}),
          file=sys.stderr)

    result = wait_for_code(inbox.inbox_id, timeout=300, poll_interval=5)

    if result.get("status") == "found":
        final = {
            "step": 3,
            "status": "code_received",
            "code": result["code"],
            "email": inbox.email,
            "inbox_id": inbox.inbox_id,
            "message": f"Verification code: {result['code']} — enter this on the Bitget registration page.",
        }
    else:
        final = {
            "step": 3,
            "status": "manual_check_needed",
            "email": inbox.email,
            "inbox_id": inbox.inbox_id,
            "message": "Didn't catch the code automatically. Check the inbox with: "
                       f"python3 scripts/agentmail_setup.py read-inbox {inbox.inbox_id}",
        }

    print(json.dumps(final, indent=2))
    return final


# ── CLI ───────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="AgentMail-powered Bitget registration assistant")
    sub = parser.add_subparsers(dest="command")

    sub.add_parser("create-inbox", help="Create a new inbox for Bitget registration")
    sub.add_parser("list-inboxes", help="List all AgentMail inboxes")

    read_p = sub.add_parser("read-inbox", help="Read recent messages from an inbox")
    read_p.add_argument("inbox_id", help="Inbox ID to read")
    read_p.add_argument("--limit", type=int, default=5, help="Number of messages to fetch")

    wait_p = sub.add_parser("wait-for-code", help="Wait for a verification code in an inbox")
    wait_p.add_argument("inbox_id", help="Inbox ID to monitor")
    wait_p.add_argument("--timeout", type=int, default=300, help="Max seconds to wait")

    sub.add_parser("register", help="Full registration flow: create inbox + wait for code")

    args = parser.parse_args()

    if args.command == "create-inbox":
        create_inbox()
    elif args.command == "list-inboxes":
        list_inboxes()
    elif args.command == "read-inbox":
        read_inbox(args.inbox_id, limit=args.limit)
    elif args.command == "wait-for-code":
        wait_for_code(args.inbox_id, timeout=args.timeout)
    elif args.command == "register":
        register_flow()
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
