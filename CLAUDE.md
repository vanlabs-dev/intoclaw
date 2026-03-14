# IntoClaw — Developer Context

Bittensor skill pack for OpenClaw bots, built by IntoTAO. This repo contains skills that give AI agents deep Bittensor knowledge, live chain data access, and decentralized web search.

**Repo**: `https://github.com/vanlabs-dev/intoclaw.git`
**License**: MIT
**Platform**: OpenClaw (personal AI bot framework)

---

## Architecture

```
intoclaw/
├── README.md              # Bot-facing — the bot reads this on first contact
├── HUMANS.md              # Human-facing project overview
├── INSTALL.md             # Bot-facing — step-by-step install mechanics
├── LICENSE                # MIT
├── .gitignore
└── skills/                # All skills live here
    ├── bittensor-knowledge/   # Essential — Bittensor domain knowledge (no deps)
    │   ├── SKILL.md
    │   └── references/        # Deep-dive docs (YC math, emissions, btcli, SDK, subnets)
    ├── chain-metrics/         # Essential — Live chain data via TaoStats API
    │   ├── SKILL.md
    │   ├── .env.example
    │   ├── scripts/           # taostats.sh, taostats_client.py, balance_history.py, valis_24hr.py
    │   └── references/        # API endpoints, MCP reference
    ├── desearch/              # Essential — Decentralized web + X/Twitter search
    │   ├── SKILL.md
    │   ├── .env.example
    │   ├── scripts/           # desearch.sh — bash helpers for all endpoints
    │   └── references/        # Full OpenAPI spec summary
    ├── subnet-research/       # Essential — Multi-phase subnet analysis (uses TaoStats + Desearch)
    │   ├── SKILL.md
    │   ├── scripts/           # subnet_research.py — data collection + signal analysis
    │   └── references/        # Research methodology, signal thresholds
    └── skill-creator/         # Utility — Meta-skill for building new skills
        ├── SKILL.md
        └── references/        # Design patterns doc
```

---

## Skill Anatomy

Every skill follows this structure:

```
skill-name/
├── SKILL.md              # Required — YAML frontmatter + markdown body
├── .env.example           # If skill needs API keys (shows vars, never values)
├── scripts/               # Only if needed — executable code (Python/Bash)
├── references/            # Only if needed — deep-dive docs loaded on demand
└── assets/                # Only if needed — templates, icons for output
```

**No empty directories.** Only create subdirs that have files.

### SKILL.md Frontmatter

```yaml
---
name: skill-name              # lowercase, hyphens only
description: >                # THIS IS THE TRIGGER MECHANISM
  What the skill does + when to use it + trigger phrases.
  "When to use" context lives HERE, not in the body.
conflicts_with:               # Optional — skills with overlapping triggers
  - skill: other-skill
    triggers: ["overlapping", "phrases"]
    resolution: "When to use this one vs the other"
---
```

**Critical**: The `description` field determines when OpenClaw activates the skill. Be specific and slightly aggressive with trigger phrases.

### SKILL.md Body

- Imperative form ("Run X", "Check Y")
- Explain the *why*, not just the *what*
- Target under 500 lines — offload detail to `references/`
- Follow the IntoClaw tone: educational, narrated, no black boxes

---

## Conflict Resolution System

Skills can overlap in trigger phrases. The `conflicts_with` frontmatter handles this:

| Overlap | bittensor-knowledge | chain-metrics |
|---------|-------------------|---------------|
| "subnet", "emissions", "metagraph", "staking" | Answers "what is" / "how does" | Answers "show me live data" |

| Overlap | bittensor-knowledge | desearch |
|---------|-------------------|----------|
| "research subnet" | Foundational knowledge | Real-time web/X search |

When adding a new skill, check existing skill descriptions for trigger overlap and add `conflicts_with` entries in both directions.

---

## Environment Variables

Skills that call external APIs load keys from `.env` files in the skill directory:

| Variable | Skill | Source |
|----------|-------|--------|
| `TAOSTATS_API_KEY` | chain-metrics, subnet-research | [dash.taostats.io](https://dash.taostats.io) |
| `DESEARCH_API_KEY` | desearch, subnet-research | [desearch.ai](https://desearch.ai) |

**Pattern**: Copy `.env.example` to `.env` in the skill directory, fill in the key values. Scripts look for `.env` in the skill directory first, then the workspace root, then fall back to shell environment variables. This approach works reliably in subshells and agent contexts where shell profile exports may not persist.

**Security rules**:
- API keys never touch version control
- Never echo keys back to the user
- `.env.example` files document required vars without values
- `.env` and `.env.*` are gitignored

---

## Development Workflow

### Branch Strategy

```
skill/<name>  →  dev  →  main
  (build)       (test)   (release)
```

- **`main`** — always stable, always releasable. Users point bots here. Don't push directly.
- **`dev`** — active development. Build and test new skills here.
- **`skill/<name>`** — optional feature branches off `dev` for larger skills.

**Process for a new skill:**
1. Start from `dev`: `git checkout dev && git pull origin dev`
2. Build the skill (see steps below)
3. Test with agents on the `dev` branch
4. PR from `dev` → `main` using the PR template (`.github/PULL_REQUEST_TEMPLATE.md`)
5. Tag the release: `git tag v1.x.0 && git push origin v1.x.0`

**CHANGELOG pattern:** Add changes under `[Unreleased]` during development. Rename to `[x.y.z] - date` when merging to `main`.

**CI:** GitHub Actions (`validate-skill.yml`) runs on PRs to `main` and `dev`. Checks frontmatter, conflict bidirectionality, line counts, Python syntax, registry consistency, and secrets.

### Adding a New Skill

1. Understand what the skill does, when it triggers, what it outputs
2. Create `skills/<skill-name>/SKILL.md` with frontmatter + body
3. Add `scripts/`, `references/`, `assets/` only if needed
4. Check for trigger conflicts with existing skills — add `conflicts_with` if overlap exists
5. Add `.env.example` if the skill needs API keys
6. Add the skill to the README.md Skill Registry table and `intoclaw.json`
7. Test with 2-3 realistic prompts by pointing an agent at the `dev` branch
8. Follow the quality checklist in `skills/skill-creator/SKILL.md`

### Editing an Existing Skill

- SKILL.md body: edit directly, keep under 500 lines
- References: edit in `references/` — these are loaded on demand
- Scripts: edit in `scripts/` — test manually before committing
- Frontmatter description: changes affect when the skill triggers — test trigger behavior after editing

### Key Design Patterns

Documented in `skills/skill-creator/references/design-patterns.md`:
- **Progressive disclosure**: metadata → SKILL.md → references (3-level loading)
- **Domain organization**: split references by domain, only load what's relevant
- **Conditional details**: basics inline, advanced in references

---

## Writing & Tone Conventions

IntoClaw skills are **educational first**. The bot narrates what it's doing and why.

- Write like you're talking to a competent colleague, not a robot
- If you use a technical term, explain it in the same breath
- No silent actions — narrate what's happening
- Plain language over technical flex
- Wallet operations require explicit, repeated user confirmation

### Naming

- Skill directories: `lowercase-with-hyphens`
- Reference files: `descriptive-name.md`
- Scripts: `descriptive_name.py` or `descriptive_name.sh`

---

## Versioning

We use [semver](https://semver.org) for both individual skills and the pack as a whole.

- Each `SKILL.md` has a `version` field in its YAML frontmatter
- `CHANGELOG.md` at the repo root tracks all changes (Keep a Changelog format)
- **Patch** (1.0.x): bug fixes, typo corrections, minor prompt improvements
- **Minor** (1.x.0): new features, new endpoints, new references
- **Major** (x.0.0): breaking changes (renamed skills, restructured frontmatter, removed endpoints)
- Always update `CHANGELOG.md` when bumping any version

---

## Known Gotchas

### rao vs TAO in stake_balance endpoint
`balance_as_tao` in `/api/dtao/stake_balance/latest/v1` returns **rao** (1 TAO = 1,000,000,000 rao). Always divide by 1e9:
```bash
balance_tao=$(echo "$balance_as_tao / 1000000000" | bc -l)
```

### Environment variables: .env files, not shell exports
Scripts load API keys from `.env` files (skill directory first, then workspace root, then shell environment). The `.env.example` files are templates — copy to `.env` and fill in your keys. Shell exports still work as a fallback but are not the primary pattern, since OpenClaw agents run in subshells where profile exports may not persist.

### TaoStats auth header format
`Authorization: <key>` — no `Bearer` prefix. Same for Desearch.

### TaoStats rate limits
~5 req/min on free tier. Use `sleep 0.3` between calls in loops. Check `Retry-After` header on 429s.

### README.md and INSTALL.md are bot-facing
These files are written *for the bot to read* when a user first hands it the repo. They drive the onboarding flow. HUMANS.md is the human-readable project overview.

---

## File Roles

| File | Audience | Purpose |
|------|----------|---------|
| `README.md` | Bot | First-contact instructions — skill discovery and install flow |
| `HUMANS.md` | Human | Project overview, philosophy, getting started |
| `INSTALL.md` | Bot | Step-by-step install mechanics (copy, env, activate, verify) |
| `CLAUDE.md` | Developer + Claude Code | This file — development context for each session |
| `SKILL.md` | Bot/Agent | Per-skill instructions loaded when skill triggers |
| `intoclaw.json` | Machine | Machine-readable skill registry — versions, env deps, conflicts for programmatic access |

---

## Scripts Reference

### Chain Metrics (`skills/chain-metrics/scripts/`)

| Script | Language | Purpose |
|--------|----------|---------|
| `taostats.sh` | Bash | Source for shell helpers (`taostats_pool`, `taostats_validator_yield`, etc.) |
| `taostats_client.py` | Python | Robust API client with retry, pagination, rate-limit handling |
| `balance_history.py` | Python | Daily balance history + stake earnings over time |
| `valis_24hr.py` | Python | Validator 24h stake flow analysis (top N or by netuid) |

### Desearch (`skills/desearch/scripts/`)

| Script | Language | Purpose |
|--------|----------|---------|
| `desearch.sh` | Bash | Source for shell helpers (`desearch_ai`, `desearch_twitter`, `desearch_web`, etc.) |

### Subnet Research (`skills/subnet-research/scripts/`)

| Script | Language | Purpose |
|--------|----------|---------|
| `subnet_research.py` | Python | Multi-phase data collection (TaoStats + Desearch), signal analysis, JSON output |

All scripts load API keys from `.env` in the skill directory, falling back to the workspace root, then the shell environment. No hardcoded keys.

---

## Quick Verification Commands

After setting up skills, verify they work:

```bash
# Chain Metrics (needs TAOSTATS_API_KEY)
curl -s "https://api.taostats.io/api/dtao/pool/latest/v1?netuid=1&limit=1" \
  -H "Authorization: $TAOSTATS_API_KEY" | python3 -c "import sys,json; d=json.load(sys.stdin); print('chain-metrics OK:', d['data'][0]['name'])"

# Desearch (needs DESEARCH_API_KEY)
curl -s "https://api.desearch.ai/web?query=bittensor&start=0" \
  -H "Authorization: $DESEARCH_API_KEY" | python3 -c "import sys,json; d=json.load(sys.stdin); print('desearch OK, got', len(d) if isinstance(d,list) else 'data')"

# Subnet Research (needs both keys)
python3 ~/.openclaw/workspace/skills/subnet-research/scripts/subnet_research.py --netuid 1 --phase broad 2>/dev/null \
  | python3 -c "import sys,json; d=json.load(sys.stdin); p=d['primary']; print('subnet-research OK:', 'pool' in p and 'social' in p)"

# Bittensor Knowledge (no deps — ask the bot)
# "What is the exact EMA smoothing factor used in the flow-based emissions model?"
# Expected: α ≈ 0.000003209
```
