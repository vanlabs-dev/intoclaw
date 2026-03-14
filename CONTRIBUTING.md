# Contributing to IntoClaw

Thanks for wanting to contribute. IntoClaw is MIT licensed and welcomes skills from anyone in the Bittensor community.

## Branch Workflow

```
skill/<name>  →  dev  →  main
  (build)       (test)   (release)
```

- **`main`** is always stable. Users point their bots here. Don't push directly.
- **`dev`** is the active development branch. New skills get built and tested here.
- **`skill/<name>`** feature branches are optional — use them for larger skills that take multiple sessions.

### For a new skill

1. Fork the repo (or branch from `dev` if you have write access)
2. Build your skill following the structure below
3. Test with a real agent (see Testing below)
4. Open a PR to `dev` (or `main` if the skill is tested and complete)
5. Fill out the PR template checklist

### For a fix or update

1. Branch from `dev`
2. Make changes, test
3. PR to `dev`

## Skill Structure

Every skill follows this layout:

```
skills/skill-name/
├── SKILL.md           # Required — YAML frontmatter + markdown body
├── .env.example       # If the skill needs API keys
├── scripts/           # Only if needed — executable code
├── references/        # Only if needed — deep-dive docs
└── assets/            # Only if needed — templates, icons
```

The **Skill Creator** (`skills/skill-creator/`) has the full specification and a quality checklist. Use it as your guide.

### Key rules

- **SKILL.md frontmatter** must include `name`, `version`, and `description` with trigger phrases
- **Description is the trigger** — this is how OpenClaw decides when to activate your skill
- **Under 500 lines** for SKILL.md — put detail in `references/`
- **No empty directories** — only create subdirs that have files
- **Check for trigger overlaps** with existing skills and add `conflicts_with` in both directions
- **Educational tone** — explain what you're doing and why, no black boxes

### API keys

- Use `.env` files, never hardcode keys
- Provide `.env.example` showing required variables (without values)
- Scripts should load from: skill dir `.env` → workspace root `.env` → shell environment
- Never log, echo, or expose keys in output

## Testing

Before submitting a PR, test your skill with a real agent:

1. Point an OpenClaw bot at your branch or local workspace
2. Run 2-3 realistic prompts that should trigger your skill
3. Verify the right skill activates (not a conflicting one)
4. If your skill has scripts, verify they run without errors
5. Check the `## Verify` section in your SKILL.md works

List your test prompts and results in the PR.

## Registry Updates

When adding a new skill, update these files:

- `README.md` — add to the Skill Registry table and Skill Overlaps table
- `intoclaw.json` — add the skill entry with version, path, status, env requirements, and conflicts
- `CHANGELOG.md` — add your changes under `[Unreleased]`

## Versioning

We use [semver](https://semver.org):

- **Patch** (1.0.x): bug fixes, typos, minor prompt improvements
- **Minor** (1.x.0): new features, endpoints, references
- **Major** (x.0.0): breaking changes (renamed skills, restructured frontmatter)

Each skill has its own version in SKILL.md frontmatter. The pack version lives in `intoclaw.json` and `README.md`.

## Questions?

Open an issue or check the Skill Creator skill for patterns and examples.
