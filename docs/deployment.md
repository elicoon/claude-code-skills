# Deployment

## Distribution
This project ships as a local Claude Code plugin. Users clone the repo and register it in their Claude Code config. There is no package registry or server-side component. Skills are updated by committing changes and letting the post-commit hook auto-sync to cache.

## Install Command
```bash
# 1. Clone
git clone https://github.com/elicoon/claude-code-skills.git /path/to/claude-code-skills

# 2. Register in ~/.claude/plugins/installed_plugins.json
# Add entry:
# "claude-code-skills@local": [{ "scope": "user", "installPath": "/path/to/claude-code-skills", "version": "1.0.0", "installedAt": "..." }]

# 3. Enable in ~/.claude/settings.json
# Add: "enabledPlugins": { "claude-code-skills@local": true }

# 4. Install git hook for auto-sync
cp hooks/post-commit .git/hooks/post-commit
chmod +x .git/hooks/post-commit

# 5. Initial sync
./sync-skills.sh

# 6. Register Claude Code hooks in ~/.claude/settings.json
# (See hooks/docs/compaction-reread.md for the full hooks config block)
```

## Update Command
```bash
# Pull latest, commit hook auto-syncs — no manual steps needed
git pull
```

## Required Configuration
| Variable | Required | Description | Where to get it |
|----------|----------|-------------|----------------|
| `installed_plugins.json` entry | Yes | Registers plugin with Claude Code | Create manually in `~/.claude/plugins/` |
| `enabledPlugins` in `settings.json` | Yes | Enables plugin at user scope | `~/.claude/settings.json` |
| Git post-commit hook | Yes (for auto-sync) | Triggers sync on skill commits | `cp hooks/post-commit .git/hooks/post-commit` |
| Claude Code hooks config in `settings.json` | Yes (for compaction enforcement) | Wires compaction-reread.js and validate-dispatch.js | See `hooks/docs/compaction-reread.md` |
| `gh` CLI authenticated | No | Required for handler PR/CI checks | `gh auth login` |
| Google Calendar MCP | No | Required for orient time-awareness | Configure at `~/.claude` level |
| tmux | No | Required for handler background workers | Install via OS package manager |

## Pre-Ship Checklist
- [ ] New skill has both `SKILL.md` and `README.md`
- [ ] Skill instructions use numbered steps and imperative voice
- [ ] No subdirectories created inside `skills/skill-name/` (they won't sync)
- [ ] Commit triggers post-commit hook and skill appears in `~/.claude/skills/`
- [ ] Invoke the skill in Claude Code and verify it responds with expected behavior

## Rollback
No native rollback mechanism. To undo a skill change:
```bash
git revert <commit-sha>
# Post-commit hook will re-sync the reverted state
```

To remove a skill from cache without reverting:
```bash
rm -rf ~/.claude/skills/skill-name/
```

## Notes
- Skills are only available after the post-commit hook fires. Changes to `SKILL.md` are invisible to Claude Code until committed and synced.
- The `lastUpdated` field in `installed_plugins.json` is bumped by `sync-skills.sh` to force Claude Code to rescan the cache. If skills aren't updating, check that field.
- Running `./sync-skills.sh` on a new machine requires `~/.claude/skills/` to exist — the script will error if the cache directory is missing.
