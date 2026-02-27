# Conventions

## Documentation
Keep docs current — when you change code, update the relevant doc in the same session.

| Change made | Doc to update |
|-------------|---------------|
| New integration added or changed | `docs/integrations.md` |
| Architectural decision made | `docs/decisions.md` |
| Something burned time or caused confusion | `docs/gotchas.md` |
| New UI surface or flow added | `docs/ui-flow.md` |
| New user scenario identified | `docs/user-scenarios.md` + update coverage table |
| Stack dependency added or changed | `docs/stack.md` |
| Deployment or installation process changes | `docs/deployment.md` |
| New skill added | `docs/structure.md` skill list + `README.md` skill table |

Never let docs drift from the code. If a doc is wrong, fix it before moving on.

## Naming
- Skill names: kebab-case matching the directory name (`debug-loop`, `write-plan`, not `debugLoop` or `WritePlan`)
- Skill directories: `skills/kebab-case-name/`
- Hook files: descriptive kebab-case with `.js` extension for Node.js, no extension for Bash
- Template files: `UPPER_SNAKE_CASE.md` for boilerplate documents (`LIVING_PLAN.md`, `SKILL.md`)
- Commits: conventional commits format — `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`

## Skill File Requirements
Every skill directory must contain exactly two files:
- `SKILL.md` — Claude instructions. Must include YAML frontmatter with `name` and `description` fields. Instructions use numbered steps in imperative voice. File paths must be explicit and absolute where possible.
- `README.md` — Human documentation. Explains what the skill does, when to use it, and any prerequisites.

No subdirectories inside `skills/skill-name/` — files in subdirectories are not synced to cache.

## SKILL.md Format
```markdown
---
name: skill-name
description: One sentence describing what this skill does.
---

# Skill Name

[Brief intro for Claude]

## Steps

1. [First thing Claude should do]
2. [Second thing]
3. [etc.]
```

## Hook Conventions
- Use Node.js for hooks with complex logic (JSON parsing, file validation, multi-step logic)
- Use Bash for simple hooks (file copying, existence checks)
- Hooks must never block Claude on script errors — always exit 0 on unexpected failures
- Hooks receive input via stdin as JSON; output decisions via stdout as JSON (`{ "decision": "block", "reason": "..." }`)
- Log diagnostic messages to stderr, not stdout

## Patterns to Follow
- Wrap upstream skills rather than fork them (see `docs/decisions.md`)
- Enforce structural rules with hooks, not skill instructions
- Write living documents to the target project's `docs/` directory, not to this repo
- Use `/tmp/claude-{type}-{session_id}` for ephemeral session markers

## Patterns to Avoid
- Subdirectories inside `skills/skill-name/` — not synced, invisible to Claude at runtime
- Global `/tmp` flags without session_id — accumulate and cause false positives
- Hardcoded usernames in scripts — use `$HOME` or `os.homedir()`
- Simulating Claude Code behavior to test skills — always use real invocations

## Formatting
- No enforced linter or formatter
- Markdown: follow existing style in the file being edited
- JavaScript hooks: readable over compact — prefer clarity, no minification

## Comments
- Hook files: comment the purpose and protocol at the top of the file
- SKILL.md: instructions should be self-explanatory; avoid meta-commentary about how Claude should interpret them
- Commit messages: explain why, not what — the diff shows what
