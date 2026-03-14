## Summary

<!-- What does this PR add, change, or fix? 1-3 sentences. -->

## Type

<!-- Check one: -->
- [ ] New skill
- [ ] Skill update / enhancement
- [ ] Bug fix
- [ ] Documentation
- [ ] Infrastructure / CI

## Quality Checklist

<!-- For new or updated skills. Check all that apply: -->

### Skill structure
- [ ] `SKILL.md` has `name` + `description` with trigger phrases in frontmatter
- [ ] `SKILL.md` has `version` field in frontmatter
- [ ] Description is the trigger mechanism — "when to use" context lives there
- [ ] Body is imperative, explains the why, reads naturally
- [ ] Under 500 lines — detailed content lives in `references/`
- [ ] No empty directories or extraneous files
- [ ] `.env.example` provided if skill needs API keys (no actual keys committed)

### Conflicts & integration
- [ ] Checked for trigger overlaps with existing skills
- [ ] Added `conflicts_with` in **both directions** if overlaps exist
- [ ] Added plain-language "Overlaps" section in SKILL.md body
- [ ] Registered in `README.md` skill registry table
- [ ] Registered in `intoclaw.json`
- [ ] Updated `README.md` overlap table if new conflicts added

### Testing
- [ ] Tested with 2-3 realistic prompts via an agent
- [ ] Conflict resolution routes correctly (right skill for right intent)
- [ ] Scripts run without errors (if applicable)
- [ ] Verify section works as documented

### IntoClaw tone
- [ ] Educational — explains as it goes, no black boxes
- [ ] Accessible to someone on their first week in Bittensor
- [ ] API keys never logged, echoed, or leaked

## Test Prompts Used

<!-- List the prompts you tested with and briefly note results: -->

1. `"..."` —
2. `"..."` —
3. `"..."` —

## CHANGELOG

<!-- Added to CHANGELOG.md? -->
- [ ] Yes, under `[Unreleased]`
