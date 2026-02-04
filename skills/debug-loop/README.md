# /debug-loop

Deterministic debugging workflow with living document orchestration.

## Overview

Debug-loop provides a structured, phased approach to fixing bugs. A **living document** in `.claude/debug-loop-{slug}.md` serves as the single source of truth, allowing any agent to pick up where the last one left off without conversation history.

Key principles:
- **Serial execution** - One bug at a time, fully through the loop
- **Human checkpoints** - Approval gates at critical decision points
- **Configurable depth** - Minimal, standard, or full based on bug complexity
- **Document-as-orchestrator** - The filesystem drives state, not a long-running agent

## Quick Start

```bash
# Initialize a debug loop for an existing bug task
/debug-loop init --bug playback-crash --depth minimal

# After approving exit criteria, resume the loop
/debug-loop resume

# Check current status
/debug-loop status
```

## Subcommands

| Subcommand | Purpose |
|------------|---------|
| `init --bug <slug> --depth <minimal\|standard\|full> [--worktree]` | Initialize a new debug loop |
| `resume` | Continue from living doc state |
| `status` | Show current phase and progress |

### Depth Levels

| Depth | Phases | Use When |
|-------|--------|----------|
| minimal | debug, test, plan, implement, review, verify | Simple bug, quick fix |
| standard | + UAT, + docs update | Normal bug, needs test coverage |
| full | + architecture design | Complex bug, architectural implications |

## How It Works

### Phase Flow

1. **Initialize** - Create living doc with bug-specific exit criteria
2. **Human Checkpoint** - Approve exit criteria before loop begins
3. **Systematic Debug** - Identify root cause with `/systematic-debugging`
4. **Write Tests** - Create failing test that reproduces the bug
5. **Architecture** (full only) - Design solution with `/brainstorming`
6. **Implementation Plan** - Create plan with `/write-plan`
7. **UAT** (standard/full) - Generate test checklists with `/uat`
8. **Implement** - Execute plan with `/executing-plans`
9. **Code Review** - Validate with `/code-review`
10. **Update Docs** (standard/full) - Update relevant documentation
11. **Verify** - Run tests with `/test-feature`
12. **Human Checkpoint** - Confirm bug is actually fixed

### Living Document

The living doc at `.claude/debug-loop-{slug}.md` contains:
- Bug identity and project paths
- Current phase and iteration count
- Exit criteria for each phase
- Files modified during the loop
- History of completed phases

## Requirements

### Hook Registration

The debug-loop uses a Stop hook to enforce phase transitions. Add to `~/.claude/settings.json`:

```json
{
  "hooks": [
    {
      "type": "command",
      "command": "node c:/Users/Eli/projects/claude-code-skills/hooks/debug-loop-stop.js",
      "timeout": 30
    }
  ]
}
```

### Bug Task

A bug task must exist at `backlog/tasks/bug-{slug}.md` before initializing. Create one with `/add --type bug` or manually.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "No active debug loop found" | Run `/debug-loop init --bug <slug> --depth <depth>` |
| "Bug task not found" | Create bug task first with `/add --type bug` |
| "Max iterations exceeded" | Review living doc, fix manually or adjust exit criteria |
| "Multiple active loops found" | Delete stale `.claude/debug-loop-*.md` files |
| Worktree cleanup | Use `/finishing-a-development-branch` or delete `.worktrees/debug-{slug}/` manually |

## File Locations

| Item | Location |
|------|----------|
| Living doc | `.claude/debug-loop-{slug}.md` |
| Templates | `templates/debug-loop/` |
| Phase prompts | `templates/debug-loop/phases/` |
| Worktrees | `.worktrees/debug-{slug}/` |
