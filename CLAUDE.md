# claude-code-skills
Portable, modular AI workflow skills for Claude Code — encodes process knowledge in living documents so it survives context compaction across sessions.

## Commands
```bash
./sync-skills.sh           # Manually sync skills/ to ~/.claude/skills/ cache
cp hooks/post-commit .git/hooks/post-commit && chmod +x .git/hooks/post-commit  # Install git hook
node hooks/validate-dispatch.js  # Validate a dispatch file
```

## Docs
@docs/architecture.md
@docs/structure.md
@docs/stack.md
@docs/deployment.md
@docs/integrations.md
@docs/decisions.md
@docs/ui-flow.md
@docs/user-scenarios.md
@docs/gotchas.md
