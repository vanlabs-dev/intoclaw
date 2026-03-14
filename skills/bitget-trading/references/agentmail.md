# AgentMail Integration Reference

AgentMail gives AI agents their own email inboxes via API. This skill uses it to handle Bitget account registration with minimal human interaction — the agent creates the email, monitors for verification codes, and extracts them automatically.

---

## Setup

1. Get a free API key at [console.agentmail.to](https://console.agentmail.to) (no credit card needed)
2. Add `AGENTMAIL_API_KEY=am_...` to your `.env` file
3. Install the Python SDK: `pip install agentmail`

**Free tier:** 3 inboxes, 3,000 emails/month, 3 GB storage. More than enough for account registration.

---

## How It Works

The `agentmail_setup.py` script handles the full flow:

```
Agent creates inbox  →  User registers with that email  →  Agent catches verification code
     (automated)              (browser, ~30 seconds)              (automated)
```

The only manual step is the user clicking through Bitget's sign-up form in a browser. Everything else — email creation, inbox monitoring, code extraction — is handled by the agent.

---

## API Quick Reference

**Base URL:** `https://api.agentmail.to/v0/`
**Auth:** API key via `AGENTMAIL_API_KEY` env var or `api_key` param

### Python SDK

```python
from agentmail import AgentMail

client = AgentMail(api_key="am_...")

# Create inbox (returns email like randomstring@agentmail.to)
inbox = client.inboxes.create(display_name="My Agent")
print(inbox.inbox_id, inbox.email)

# List messages
messages = client.messages.list(inbox_id=inbox.inbox_id, limit=10)
for msg in messages.data:
    print(msg.subject, msg.extracted_text)

# Send email (if needed)
client.messages.send(
    inbox_id=inbox.inbox_id,
    to=["someone@example.com"],
    subject="Hello",
    text="Message body",
)
```

### CLI (alternative)

```bash
pip install agentmail-cli

export AGENTMAIL_API_KEY=am_...
agentmail inboxes create --display-name "Bitget Agent"
agentmail inboxes list
agentmail inboxes:messages list --inbox-id inb_xxx
```

---

## Script Commands

| Command | What it does |
|---------|-------------|
| `python3 scripts/agentmail_setup.py register` | Full flow: create inbox → print instructions → wait for code |
| `python3 scripts/agentmail_setup.py create-inbox` | Just create an inbox, return email + ID |
| `python3 scripts/agentmail_setup.py wait-for-code INBOX_ID` | Poll inbox for verification code (5min timeout) |
| `python3 scripts/agentmail_setup.py read-inbox INBOX_ID` | Read recent messages from an inbox |
| `python3 scripts/agentmail_setup.py list-inboxes` | List all existing inboxes |

All output is JSON for easy parsing by the agent.

---

## Code Extraction

The script looks for 6-digit verification codes in these patterns:
- "verification code: 123456"
- "your code is 123456"
- "OTP: 123456"
- Any standalone 6-digit number (fallback)

It checks both the subject line and body text, prioritizing messages that arrived after the inbox was created.

---

## Reusing Inboxes

Created inboxes persist in AgentMail. You can reuse the same inbox across sessions — useful if Bitget sends follow-up emails (2FA, account notifications, etc). The `list-inboxes` command shows all existing inboxes.

The free tier allows 3 inboxes. If you need more, upgrade at console.agentmail.to ($20/mo for 10 inboxes).

---

## Rate Limits

AgentMail returns HTTP 429 with a `Retry-After` header when rate-limited. The Python SDK handles retries automatically with exponential backoff.

---

## Security Notes

- The `AGENTMAIL_API_KEY` follows the same security rules as other API keys: `.env` file only, never echo, never commit
- Created email addresses are fully functional — they can receive any email, not just from Bitget
- Inboxes can be deleted via the API or console when no longer needed
- The agent never stores or logs verification codes beyond the immediate output
