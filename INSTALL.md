# Install Guide

This file is for you, the bot. When a user picks a skill from the menu, follow these steps to actually get it installed. README.md handles discovery and explanation — this file handles the mechanics.

---

## Step 1 — Figure out the workspace

OpenClaw skills live in:
```
~/.openclaw/workspace/skills/
```

Check that this directory exists. If it doesn't, the user might not have OpenClaw set up yet — point them to [openclaw.ai](https://openclaw.ai) to get started before continuing.

---

## Step 2 — Get the repo

If the user gave you a GitHub URL, you need a local copy to work with. Options:

```bash
# Clone the full repo (recommended — gets everything, easy to update later)
git clone https://github.com/vanlabs-dev/intoclaw.git /tmp/intoclaw

# Or if git isn't available, download and extract
curl -L https://github.com/vanlabs-dev/intoclaw/archive/refs/heads/main.zip -o /tmp/intoclaw.zip
unzip /tmp/intoclaw.zip -d /tmp/intoclaw
```

If you already have a local copy (user pointed you at a directory), skip this.

---

## Step 3 — Check for conflicts

> ⚠️ **This step is NOT optional.** Skipping conflict checks leads to overlapping triggers, where multiple skills fire on the same phrase and produce confusing, contradictory, or duplicate responses. The user ends up getting a knowledge explanation when they wanted live data, or a web search when they wanted foundational context. Always check before installing.

Before copying anything, check `conflicts_with` in the skill's SKILL.md frontmatter. If the user already has skills installed that overlap:

1. Tell them which existing skills share trigger phrases with this one
2. Show them the specific overlapping triggers and the `resolution` field that explains how to tell them apart
3. Offer: **Replace**, **Layer** (with conflict warning), or **Skip**

Also check the `conflicts_with` entries across IntoClaw's own skills — if the user is installing multiple IntoClaw skills, let them know which ones share triggers and how to tell them apart. For example, "subnet emissions" could trigger both bittensor-knowledge (conceptual explanation) and chain-metrics (live data lookup). The `resolution` field in each skill's frontmatter tells you which skill is the right fit based on the user's intent.

---

## Step 4 — Copy the skill

```bash
# Copy the skill directory to the workspace
cp -r <repo-path>/skills/<skill-name>/. ~/.openclaw/workspace/skills/<skill-name>/
```

Tell the user what you're doing: "I'm copying the [skill name] skill into your OpenClaw workspace so your bot can use it."

---

## Step 5 — Set up environment (if needed)

Some skills need API keys or dependencies. Check if the skill directory has a `.env.example` file.

If it does:

**First, check if the keys already exist.** Scripts look for `.env` files in this order: the skill's own directory → all sibling skill directories → the workspace root → the shell environment. If the user already has the required keys set up in another skill (e.g. `TAOSTATS_API_KEY` in `chain-metrics/.env`), they do **not** need to set them up again — the script will find them automatically. Read the `.env.example` file — it often explains where keys are expected to come from.

If the keys are **not** already available:
1. Copy `.env.example` to `.env` in the same skill directory: `cp .env.example .env`
2. Fill in the actual key values in the `.env` file
3. Walk the user through each variable — what it is, where to get it, and why it's needed
4. **Never echo keys back.** Once set, confirm the file exists without showing the value.

```bash
# Example for chain-metrics
cd ~/.openclaw/workspace/skills/chain-metrics
cp .env.example .env
# Then edit .env and add the real key:
#   TAOSTATS_API_KEY=the_actual_key
```

If the skill has other dependencies (like Python packages), check the SKILL.md for prerequisites and walk through those too.

---

## Step 6 — Activate

Tell OpenClaw to pick up the new skill:

```bash
# Option 1: Ask the agent to refresh
# Just say "refresh skills" in chat

# Option 2: Restart the gateway
openclaw gateway restart
```

Let the user know: "I'm refreshing the skill list so your bot picks up what we just installed."

---

## Step 7 — Verify

Every IntoClaw skill has a `## Verify` section at the bottom of its SKILL.md. Run the smoke test described there to confirm the skill is working.

If the test fails:
- Check the API key is set correctly (for skills that need one)
- Check the skill directory is in the right place
- Check gateway was restarted
- Walk the user through what went wrong — don't just say "it failed"

If it passes, tell the user what they can now do that they couldn't before.

---

## Installing multiple skills

If the user wants several skills, repeat steps 3–7 for each one. Don't batch-install silently — go through each skill individually so the user follows along and understands what's being added.

The recommended install order for IntoClaw's core skills:
1. **Bittensor Knowledge** — no dependencies, foundation for everything else
2. **Chain Metrics** — needs TaoStats API key, builds on the knowledge base
3. **Desearch** — needs Desearch API key, adds web + X/Twitter search
4. **Subnet Research** — uses TaoStats and Desearch API keys (if you haven't already set up API keys for Chain Metrics and Desearch, you'll need to do that first — but if those keys are already in place, this skill picks them up automatically with no extra setup)

---

## Updating skills

If the user already has IntoClaw skills and the repo has been updated:

```bash
# Pull latest
cd /tmp/intoclaw && git pull

# Re-copy the updated skill
cp -r /tmp/intoclaw/skills/<skill-name>/. ~/.openclaw/workspace/skills/<skill-name>/

# Restart to pick up changes
openclaw gateway restart
```

Tell the user what changed — don't just silently overwrite. If the skill's `.env.example` has new variables, flag those specifically.
