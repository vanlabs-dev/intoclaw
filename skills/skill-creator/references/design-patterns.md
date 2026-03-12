# Skill Design Patterns

## Progressive Disclosure

Skills use a 3-level loading system. This keeps things fast — the agent only loads what it actually needs.

1. **Metadata** (name + description) — always in context (~100 words)
2. **SKILL.md body** — loaded when skill triggers (target: <500 lines)
3. **Bundled resources** — loaded on demand (unlimited)

Keep SKILL.md lean. Move detailed content to `references/` and reference it clearly.

**Live example:** `bittensor-knowledge` uses all three levels — SKILL.md covers essentials inline, then links to five reference files (`yuma-consensus.md`, `emissions.md`, etc.) loaded only when the question requires them.

---

## Pattern 1: High-Level Guide with References

Works well when the skill has multiple modes or deeper features that not every invocation needs.

```markdown
## Basic usage
[core instructions here]

## Advanced
- **Form filling**: See [references/forms.md](references/forms.md)
- **API reference**: See [references/api.md](references/api.md)
```

**Live example — `bittensor-knowledge/SKILL.md`** does exactly this: core concepts inline, then a "Reference Files" section linking to `yuma-consensus.md`, `emissions.md`, `subnet-architecture.md`, etc.

---

## Pattern 2: Domain Organization

When a skill spans multiple domains, organize by domain so only the relevant context loads.

```
bigquery-skill/
├── SKILL.md (overview + navigation)
└── references/
    ├── finance.md
    ├── sales.md
    └── product.md
```

When the user asks about sales, only `sales.md` gets read. No wasted context.

**Live example:** `chain-metrics` organizes references by domain — `api-endpoints.md` for REST details, `mcp.md` for MCP integration. Each loads only when the question requires it.

---

## Pattern 3: Framework/Variant Organization

When supporting multiple tools or providers that serve the same purpose:

```
cloud-deploy/
├── SKILL.md (workflow + provider selection)
└── references/
    ├── aws.md
    ├── gcp.md
    └── azure.md
```

---

## Pattern 4: Conditional Details

Show the basics inline, link to advanced content for when it's needed:

```markdown
## Creating documents
Use docx-js for new documents.

**For tracked changes**: See [references/redlining.md](references/redlining.md)
**For OOXML internals**: See [references/ooxml.md](references/ooxml.md)
```

---

## Output Format Templates

When the skill needs consistent output structure, define it clearly:

```markdown
## Report format
Always use this template:

# [Title]
## Summary
## Findings
## Recommendations
```

---

## Defining Examples

Show input → output pairs so the agent knows exactly what you're after:

```markdown
## Commit message format

**Example:**
Input: Added user authentication with JWT tokens
Output: feat(auth): implement JWT-based authentication
```

---

## Pattern 5: Reference Loading Rules

Every skill with reference files should include a **Reference Loading** section that tells the agent exactly when to load each file. Without this, agents may eagerly load all references on every invocation — wasting tokens and context window.

**Always include:**
1. A clear rule: "Load references ONLY when the question requires detail beyond what's in SKILL.md"
2. A topic-to-file mapping table so the agent knows which reference answers which question
3. A reminder: "Never load all references at once"

```markdown
## Reference Loading

Load references ONLY when the user's question requires detail beyond what's covered above.

| User is asking about... | Load |
|---|---|
| Topic A details | `references/topic-a.md` |
| Topic B details | `references/topic-b.md` |

If the question is answerable from the sections above, answer directly — no reference load needed.
```

Place this section right after the **Reference Files** list so the agent sees the loading rules immediately after discovering which files exist.

**Live example:** All three IntoClaw content skills (`bittensor-knowledge`, `chain-metrics`, `desearch`) use this pattern with topic-to-file mapping tables.

---

## Anti-Patterns

Things that make skills worse, not better:

| Anti-pattern | Better approach |
|---|---|
| MUST/NEVER in all-caps everywhere | Explain the reasoning; trust the agent to follow |
| Rigid numbered lists for flexible tasks | High-level guidance with examples |
| Repeating things the agent already knows | Only add context that's non-obvious |
| Deep nesting of reference files | Keep references one level deep from SKILL.md |
| Large reference files without a TOC | Add a table of contents at the top |
| Extraneous docs (README, CHANGELOG, etc.) | Only files the agent actually needs |
| Silent actions with no user explanation | Narrate what's happening and why (the IntoClaw way) — see how `chain-metrics` and `desearch` both open with this instruction |
| Jargon without context | If you use a technical term, explain it in the same breath |
