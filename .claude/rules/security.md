# Security Rules

## Never Commit
- API keys, tokens, or credentials of any kind
- Personal access tokens for GitHub, Google, or any service
- `.env` files
- Files containing real user data (backlog tasks, dispatch files, living documents with personal project details)

## Credentials
- All integrations use external auth — this project stores no credentials
- GitHub: `gh auth login` — token managed by gh CLI, not this repo
- Google Calendar: MCP server config at `~/.claude` level — not in this repo
- No `.env` file is needed or used in this project

## Hook Script Safety
- Hook scripts run with full user permissions — they can read, write, and delete files anywhere on the filesystem
- Review all hook scripts before installing them: `hooks/post-commit`, `hooks/compaction-reread.js`, `hooks/validate-dispatch.js`, `hooks/validate-dispatch-edit.js`
- Never install hooks from this repo on a machine you don't trust or haven't reviewed

## Sync Script Safety
- `sync-skills.sh` writes to `~/.claude/` — verify the `SKILLS_CACHE` path before running on a new machine
- The script does not delete files from the cache, only adds/updates — safe to run multiple times
- If running on a shared or unfamiliar machine, inspect the script first: `cat sync-skills.sh`

## Dispatch File Security
- Dispatch files contain project paths and context about your codebase — treat them as internal documents
- Do not commit dispatch files to public repos (they live in project-specific `docs/handler-dispatches/`, not in this repo)

## Input Validation
- `validate-dispatch.js` validates structure of dispatch files written by Claude — this is the primary input validation layer
- Hook validates: required sections present, no unresolved path variables, absolute paths, valid status values
- Validation runs on every Write to a `handler-dispatches/*.md` path

## Never
- Never log or include API tokens in skill instructions, dispatch files, or living documents
- Never hardcode paths that include usernames (use `$HOME` or relative references in scripts)
- Never commit changes to `~/.claude/settings.json` — that file is user-local config, not project config
