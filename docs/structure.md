# Structure

## Directory Tree
```
claude-code-skills/
├── .claude-plugin/
│   └── plugin.json              # Plugin metadata: name, version, keywords
├── skills/                      # 19 skill directories — source of truth
│   ├── add/                     # Capture tasks to backlog
│   │   ├── SKILL.md             # Claude instructions (injected at invocation)
│   │   └── README.md            # Human-readable documentation
│   ├── code-review/             # Deep code review (wraps superpowers:code-reviewer)
│   ├── dashboard/               # Kanban/Command Center web UI (port 3491)
│   ├── debug-loop/              # Deterministic debugging with living documents
│   ├── eod/                     # End-of-day wrap-up
│   ├── executing-handoffs/      # Execute work from handoff documents
│   ├── handler/                 # AI product manager and dispatch orchestrator
│   ├── handoff/                 # Package session context for continuation
│   ├── loop/                    # Filesystem-centric iterative workflows
│   ├── monitor/                 # tmux worker status dashboard
│   ├── orient/                  # Session start prioritization
│   ├── retro/                   # 5-Whys failure analysis
│   ├── review/                  # Session reflection and learning capture
│   ├── scope/                   # Pipeline filler — finds autonomous work
│   ├── setup/                   # First-run onboarding and configuration
│   ├── test-feature/            # Structured end-to-end feature testing
│   ├── uat/                     # UAT documentation generation
│   ├── user-test/               # Hands-free testing with browser automation
│   └── write-plan/              # Implementation plan creation
├── hooks/                       # Git and Claude Code enforcement hooks
│   ├── post-commit              # Syncs skills/ to ~/.claude/skills/ after commits
│   ├── compaction-reread.js     # Forces state re-read after context compaction
│   ├── validate-dispatch.js     # PostToolUse: rejects malformed dispatch files on Write
│   ├── validate-dispatch-edit.js # PostToolUse: prevents deletion of progress history
│   ├── context-monitor.js       # Tracks context window usage
│   ├── register-handler-session.js  # Writes handler session marker to /tmp
│   ├── register-loop-session.js     # Writes loop session marker to /tmp
│   └── docs/
│       └── compaction-reread.md # Hook architecture documentation
├── templates/                   # Boilerplate for living documents
│   ├── LIVING_PLAN.md           # Generic loop/plan template
│   └── debug-loop/              # Phase-specific debug templates
├── tests/                       # Manual test notes and hook test scripts
├── sync-skills.sh               # Manual skill cache sync script
└── README.md                    # Project overview and installation guide
```

## Key Files

| File | Purpose |
|------|---------|
| `skills/*/SKILL.md` | Claude instructions — the actual skill behavior. Injected into context at invocation. Required for every skill. |
| `skills/*/README.md` | Human documentation for each skill. Required for every skill. |
| `.claude-plugin/plugin.json` | Registers this repo as a Claude Code plugin with name, version, and keywords. |
| `sync-skills.sh` | Copies flat files from `skills/` to `~/.claude/skills/`. Bumps `lastUpdated` in `installed_plugins.json` to trigger Claude Code rescan. |
| `hooks/post-commit` | Git hook. Detects if commit touched `skills/` and auto-runs `sync-skills.sh`. |
| `hooks/compaction-reread.js` | Three-mode hook: `precompact` writes session-typed marker, `pretooluse` blocks first tool call after compaction, `stop` is failsafe. |
| `hooks/validate-dispatch.js` | Validates 13 structural rules on every dispatch file written to `handler-dispatches/`. Exits with code 1 on failure to block the write. |

## What Goes Where

- New skill → `skills/skill-name/` with both `SKILL.md` and `README.md`
- Skill helper templates (boilerplate Claude will fill out) → `templates/`
- Structural enforcement logic → `hooks/` as a Node.js or Bash script
- Session registration markers (ephemeral) → `/tmp/claude-{type}-{session_id}` (not in repo)
- Plugin registration → `~/.claude/plugins/installed_plugins.json` (not in repo)
- Living documents created by skills at runtime → target project's `docs/` directory (not in this repo)
