---
version: 1.0.0
name: skill-creator
description: Create, edit, improve, or audit skills — either for a personal OpenClaw workspace or as an IntoClaw repo contribution. Use when creating a new skill from scratch, improving or reviewing an existing SKILL.md, restructuring a skill directory, or auditing skill quality. Triggers on: "create a skill", "build a skill", "make a skill", "author a skill", "improve this skill", "review the skill", "tidy up the skill", "audit the skill", "clean up the skill". Always use this skill when any of these phrases appear, even if the request seems simple.
---

# Skill Creator

The tool for building skills that actually work — whether they're going into your personal bot or into the IntoClaw repo for the whole community.

Every skill in IntoClaw follows the same structure and philosophy. This skill makes sure new ones do too.

### ⚠️ Overlaps

This skill has no trigger conflicts with other IntoClaw skills. However, when creating or auditing a skill, you are responsible for checking whether the *new* skill's triggers overlap with existing ones. If they do, add `conflicts_with` entries in both directions (the new skill and the existing one) and include a plain-language Overlaps section in both SKILL.md bodies. Skipping this step causes overlapping responses at runtime — multiple skills fire on the same phrase and confuse the user.

## What a skill looks like

```
skill-name/
├── SKILL.md              (required)
│   ├── YAML frontmatter  (name + description — required; custom tools — optional)
│   └── Markdown body     (instructions for the agent)
└── Bundled Resources     (optional — only create what's needed)
    ├── scripts/          executable code (Python/Bash)
    ├── references/       docs loaded into context as needed
    └── assets/           files used in output (templates, icons)
```

No empty folders. If a skill doesn't need scripts, don't create a `scripts/` directory.

## Where skills live

Depends on what you're building:

- **Personal skill** (just for your bot): `~/.openclaw/workspace/skills/<skill-name>/`
- **IntoClaw repo skill** (for everyone): `skills/<skill-name>/` in the repo

First thing to figure out — ask the user which one they're going for. The workflow is mostly the same, but the destination and registration steps differ.

---

## Step 1 — Understand what you're building

Before writing a single line, get clear on:

1. What should this skill let the agent do?
2. When should it trigger? (what phrases or situations)
3. What's the expected output or result?
4. Are there reusable resources that would help? (scripts, reference docs, templates)

If something's unclear, ask 1–2 focused questions. Don't interrogate — just enough to write something solid.

---

## Step 2 — Plan the resources

For each piece of content in the skill, ask: would the agent need to rebuild this from scratch every time?

| Resource type | When to create |
|---|---|
| `scripts/` | Same code would be rewritten every invocation |
| `references/` | Reference material, schemas, API specs, policies |
| `assets/` | Templates, boilerplate, icons used in output |

Only create directories that will have files in them.

---

## Step 3 — Create the skeleton

**Personal skill:**
```bash
mkdir -p ~/.openclaw/workspace/skills/<skill-name>
```

**IntoClaw repo skill:**
```bash
mkdir -p skills/<skill-name>
```

Add `scripts/`, `references/`, `assets/` subdirectories only as needed.

---

## Step 4 — Write SKILL.md

This is the heart of the skill. Two parts: frontmatter and body.

### Frontmatter

Required fields: `name` and `description`. Optional: custom tool definitions.

```yaml
---
version: 1.0.0
name: skill-name
description: What the skill does AND when to use it. Include trigger phrases.
  Be slightly pushy — list contexts where the skill should fire even if not
  explicitly requested. Example: "Use when user mentions X, Y, or Z, even if
  they don't explicitly ask for this skill."
---
```

The **description is the trigger mechanism.** Everything about "when to use this" goes in the description — not the body. The body only loads after the skill triggers.

Custom tools can be defined in frontmatter if the skill needs capabilities beyond existing system tools. But prefer existing tools when possible.

### Body

Write instructions for the agent. Use imperative form ("Run X", "Check Y").

**Writing guidelines:**
- **Explain the why**, not just the what — agents work better with reasoning than rigid rules
- Keep under 500 lines — offload detailed content to `references/` files
- Reference bundled files clearly: when to read them and why
- Prefer examples over long explanations
- Avoid: MUST/NEVER in all-caps, overly rigid structures, explaining things the agent already knows

**IntoClaw tone (for repo skills):**
- Write like you're talking to a competent colleague, not a robot
- If the skill does something the user might not understand, explain it in the same breath
- No black boxes — if the skill takes action, it should narrate what's happening
- Educational first — helping the user learn is as important as getting the task done

### Safety for bash-executing skills

If your skill runs shell commands:
- Validate user input before passing to bash
- Don't allow arbitrary command injection from untrusted input
- Keep exec scope minimal — only run what's actually needed

### Naming

- Lowercase, hyphens only: `my-skill-name`
- Short, verb-led if possible: `pdf-rotate`, `subnet-research`
- Namespace by tool when helpful: `gh-review`, `btcli-stake`

---

## Step 5 — Activate

**Personal skill:**
Either ask the agent to "refresh skills" or restart the gateway:
```bash
openclaw gateway restart
```
No manual registration — OpenClaw discovers skills by scanning the skills directory.

**IntoClaw repo skill:**
1. Add the skill to the README.md skill registry table
2. Test it locally first (see Step 6)
3. Open a PR when it's solid

---

## Step 6 — Test it

Run a few realistic prompts to check:
- Does the skill trigger on the right phrases?
- Does it produce the expected output?
- Is there anything confusing that could be made clearer?

Quick test:
```bash
openclaw agent --message "use my new skill to do X"
```

Iterate on SKILL.md until it's solid. First drafts are rarely final.

---

## Step 7 — Register it

**Personal skill:** Add to `AGENTS.md` → Skills Inventory:
```markdown
### skill-name
- **Path**: `skills/skill-name/`
- **Purpose**: One-line description
```

**IntoClaw repo skill:** Add to `README.md` → Skill Registry table:
```markdown
| **Skill Name** | `skills/skill-name/` | `optional` | What it does | Prerequisites if any |
```

---

## Quality checklist

Before calling a skill done:

- [ ] Frontmatter has `name` + `description` with trigger phrases
- [ ] Description is the trigger — "when to use" context lives there, not the body
- [ ] Body is imperative, explains the why, reads naturally
- [ ] Under 500 lines — detailed content lives in `references/`
- [ ] Bash-executing skills include safety guidance
- [ ] No empty directories or extraneous files (no README, CHANGELOG, INSTALLATION docs)
- [ ] Resource dirs only exist if populated
- [ ] Checked for trigger overlaps with existing skills — added `conflicts_with` in both directions if any exist
- [ ] Added a plain-language "Overlaps" section in the SKILL.md body (not just frontmatter) if conflicts exist
- [ ] Tested with 2–3 realistic prompts
- [ ] Registered (AGENTS.md for personal, README.md for IntoClaw)

**Extra checks for IntoClaw repo skills:**
- [ ] Follows the educational tone — explains as it goes, no black boxes
- [ ] Could be understood by someone on their first week in Bittensor
- [ ] API keys use `.env` pattern with `.env.example` showing required vars

---

## Sharing skills

Community skills can be published and discovered at [ClawHub](https://clawhub.com).

IntoClaw skills are open-source and welcome PRs — check the repo's contributing guidelines.

## Reference Implementations

IntoClaw's own skills are the best examples of these patterns in action. Point users here when they need a concrete model:

- **`../chain-metrics/SKILL.md`** — A skill with scripts, API integration, env var dependencies, and a conflict resolution entry. The most full-featured example.
- **`../bittensor-knowledge/SKILL.md`** — A pure-knowledge skill with progressive disclosure: essentials inline, five reference files loaded on demand.
- **`../desearch/SKILL.md`** — A simple API wrapper skill with minimal dependencies and straightforward curl-based workflows.

When creating a new skill, read the one closest to what you're building.

## See also

- `references/design-patterns.md` — Progressive disclosure, domain organization, output format templates

---

## Verify

After installing this skill, run a quick check to confirm it loaded:

**Ask:** "Create a skill called test-skill for looking up weather data"

**Expected:** The bot's first question should be whether this is a personal skill (`~/.openclaw/workspace/skills/`) or an IntoClaw repo contribution — it asks destination before writing anything. If it skips straight to creating files or doesn't ask about destination, the skill didn't load properly.
