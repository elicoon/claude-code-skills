# /handoff

## Purpose

Package session context into artifacts for continuation by a fresh Claude Code session. Use when context window is getting full and work needs to continue.

## What It Does

1. Runs `/review` first to capture learnings
2. Checks for existing formal plan documents
3. Gathers handoff information (mission, state, learnings, codebase context)
4. Creates a handoff MD file at `{PLANS_PATH}/YYYY-MM-DD-<topic>-handoff.md`
5. Generates a starter prompt for the new session
6. Commits the handoff document

## When to Use

- Context window is getting full (primary use case)
- User wants to continue work in a new session
- Long-running work that may span multiple sessions

## What It Produces

1. **Handoff file** - Contains mission, what we learned, current state, codebase context, recommended next action, open questions
2. **Starter prompt** - Copy-paste to new session with tab label, project path, and instructions

## Config Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `{REFERENCE_PATH}` | Path to reference layer | `reference/` |
| `{BACKLOG_PATH}` | Path to task files | `backlog/tasks/` |
| `{PLANS_PATH}` | Path to plan documents | `docs/plans/` |

## File Lifecycle

1. Created: `{PLANS_PATH}/YYYY-MM-DD-<topic>-handoff.md`
2. After work completes: Renamed to `*-handoff-archived.md`

## Dependencies

- `/review` skill (invoked automatically)
- Git repository for commit tracking
