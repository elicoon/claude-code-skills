# Testing Rules

## Test Runner
There is no automated test suite. Skills are tested by invocation in Claude Code; hooks are tested by triggering their conditions manually.

```bash
# Test a skill: invoke it in Claude Code
/skill-name

# Test a hook: trigger the condition it guards and verify enforcement fires
# Example — test validate-dispatch.js:
# Write a malformed dispatch file to a handler-dispatches/ path and confirm the hook rejects it

# Test post-commit hook:
# Edit a skill file, commit, verify ~/.claude/skills/ reflects the change
```

## Required Before "Done"
- [ ] Skill invoked in real Claude Code session and responds with expected behavior (not simulated)
- [ ] If a hook was added or changed: trigger the hook condition and confirm it fires correctly
- [ ] New skill has both `SKILL.md` (Claude instructions) and `README.md` (human docs)
- [ ] Skill is committed and post-commit hook has synced it to `~/.claude/skills/`

## Coverage
- Minimum: N/A — no coverage tooling
- Enforced by: Manual invocation before marking work done

## What to Test
- Skill injection: does `/skill-name` produce behavior that follows `SKILL.md`?
- Hook enforcement: does the hook correctly block, reject, or modify the targeted action?
- Sync correctness: does `sync-skills.sh` propagate the right files to `~/.claude/skills/`?
- Living document lifecycle: do agents correctly read `[CURRENT]` step and advance it?

## What Not to Test
- Third-party library behavior (Claude Code plugin system internals)
- Claude model reasoning — test observable outputs and file artifacts, not model internals
- Simulated invocations — never mock Claude Code behavior; always use real invocations

## Test Organization
- No formal test directory structure currently
- `tests/` directory holds manual test notes and hook test scripts
- Hook-specific test conditions are documented in `hooks/docs/`

## Never
- Never simulate skill invocation by reading `SKILL.md` and acting as if it was injected — test with real Claude Code
- Never test hooks by reading the hook code and reasoning about what it would do — trigger the actual condition
- Never mark a skill as "done" based on reading the SKILL.md file — it must be invoked and observed
