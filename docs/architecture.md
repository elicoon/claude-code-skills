# Architecture

## Diagram
```
Design time:
  skills/skill-name/SKILL.md
      │
      └─── sync-skills.sh ──────────────────► ~/.claude/skills/skill-name/SKILL.md
                │                                         │
                └─── post-commit hook (auto-trigger)      │
                                                          ▼
  hooks/ ──── ~/.claude/settings.json hooks config ──► Claude Code runtime

Runtime:
  User invokes /skill-name
      │
      ▼
  Claude Code reads ~/.claude/skills/skill-name/SKILL.md
      │
      ▼
  Injects SKILL.md instructions into Claude's context
      │
      ▼
  Claude reads config, gathers info, reads/writes files, runs bash
      │
      ├─── Simple skill: completes in one session
      │
      └─── Complex skill: writes living document to project's docs/
               │
               ▼
           Agent marks [CURRENT] step, exits
               │
               ▼
           Next agent reads living doc, finds [CURRENT], continues
               │
               ▼
           Hooks enforce correct behavior throughout:
             - compaction-reread.js → forces re-read after context compaction
             - validate-dispatch.js → rejects malformed dispatch files
             - validate-dispatch-edit.js → prevents deletion of progress history
```

## Overview
Claude Code Skills is a portable plugin that extends Claude Code with 19 modular workflow skills. The core design insight is that living documents — Markdown files on the filesystem — serve as the orchestration primitive. Because the filesystem survives context compaction and session restarts while conversation history does not, skills encode their multi-step workflows as structured documents that any subsequent agent can read and continue from. Hooks enforce the structural rules that keep this reliable.

## Components
| Component | Responsibility | Tech |
|-----------|---------------|------|
| `skills/*/SKILL.md` | Skill instructions injected into Claude's context at invocation | Markdown + YAML frontmatter |
| `sync-skills.sh` | Copies skills from repo to `~/.claude/skills/` cache | Bash |
| `hooks/post-commit` | Triggers sync automatically after any commit touching `skills/` | Bash (git hook) |
| `hooks/compaction-reread.js` | Detects context compaction and forces agent to re-read living documents before continuing | Node.js (Claude Code hook) |
| `hooks/validate-dispatch.js` | Validates handler dispatch files written by Claude — rejects malformed dispatches | Node.js (PostToolUse hook) |
| `hooks/validate-dispatch-edit.js` | Prevents agents from deleting previous progress entries in dispatch files | Node.js (PostToolUse hook) |
| `hooks/context-monitor.js` | Tracks context window usage and logs warnings | Node.js (Claude Code hook) |
| `templates/` | Boilerplate for living documents (loop plans, debug phases) | Markdown |
| `.claude-plugin/plugin.json` | Plugin metadata for Claude Code plugin system | JSON |

## Key Boundaries
- **Skills vs Cache**: `skills/` is the source of truth. `~/.claude/skills/` is a derived cache. Never edit the cache directly — changes will be overwritten on next sync.
- **Skill instructions vs skill subdirectories**: Only flat files in `skills/skill-name/` are synced to cache. Subdirectories are ignored by `sync-skills.sh`. All content referenced by a skill must be in flat files or in `templates/`.
- **Dispatch contract sections**: The contract section of a dispatch file (Objective, Acceptance Criteria, Scope Boundaries, Tasks) is frozen once dispatched. Only the `## Progress` section is mutable. Hooks enforce this boundary.
- **Hooks vs Skills**: Hooks are structural enforcement. Skills are behavioral guidance. If behavior can be broken by a determined agent, it should be a hook, not a skill instruction.

## External Dependencies
- Claude Code CLI (required — provides plugin and hook runtime)
- Node.js (required for hooks)
- Git (required for post-commit hook)
- tmux (optional — used by handler/monitor for background workers)
- GitHub CLI `gh` (optional — used by handler for PR/CI checks)
- Google Calendar MCP (optional — used by orient for time-aware prioritization)
- Playwright (optional — used by user-test for browser automation)
