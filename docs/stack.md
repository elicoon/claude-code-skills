# Stack

## Runtime
- Language: Markdown (skills), JavaScript/Node.js (hooks), Bash (sync scripts)
- Node.js version: Any modern LTS (no specific version required — hooks use only core stdlib)
- Package manager: None — no npm dependencies for core

## Framework
- Name: Claude Code plugin system
- Key config: `~/.claude/plugins/installed_plugins.json` (registration), `~/.claude/settings.json` (hooks wiring and plugin enable/disable)

## Key Dependencies

| Package | Purpose | Notes |
|---------|---------|-------|
| Node.js stdlib (`fs`, `path`, `os`, `child_process`) | All hook logic | No npm packages — zero install friction |
| Claude Code CLI | Plugin runtime and hook execution | Required — this is the host system |
| Git | post-commit hook trigger | Required for auto-sync |
| tmux | Background worker sessions (handler, monitor skills) | Optional — skills degrade gracefully |
| `gh` CLI | PR/CI status checks in handler skill | Optional — must be authenticated |
| Playwright | Browser automation in user-test skill | Optional — install separately if needed |
| Google Calendar MCP | Time-aware prioritization in orient skill | Optional — configure at `~/.claude` level |

## Infrastructure
- Hosting: Local filesystem only — no servers, no cloud
- Database: None
- Auth: Delegated to external tools (gh CLI for GitHub, MCP servers for Google)
- Storage: `~/.claude/skills/` (skill cache), `/tmp/claude-*` (ephemeral session markers)
- CDN: N/A

## Dev Tools
- Linter: None enforced
- Formatter: None enforced
- Test runner: Manual — invoke skills in Claude Code, trigger hook conditions by hand
- Build tool: None — `sync-skills.sh` is the only "build" step
