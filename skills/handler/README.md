# /handler

## Purpose

Daily check-in AI product manager. Scans all projects, dispatches autonomous work, and keeps the pipeline full. The single entry point for every Claude Code session.

## What It Does

1. **Scan** — Reads backlog, local repos, GitHub, and previous worker results
2. **Analyze** — Identifies starving projects, blocked work, priority drift, and budget pacing
3. **Dispatch** — Writes dispatch files and launches worker sessions (tmux or manual)
4. **Report** — Delivers a compressed briefing with numbered decisions for quick approval

## When to Use

- Starting a work session ("good morning", "what should I work on")
- Checking in from your phone (~4 hour cadence)
- Reviewing what background workers accomplished
- Rebalancing priorities across projects

## Success Criteria

1. Every active project progresses every day
2. All Claude Code weekly usage consumed by end of week
3. Usage allocation reflects stated priorities

## Key Files

| File | Location | Purpose |
|------|----------|---------|
| Handler state | `dev-org/docs/handler-state.md` | Persistent memory between check-ins |
| Dispatch files | `dev-org/docs/handler-dispatches/` | Instructions for worker sessions |
| Worker results | `dev-org/docs/handler-results/` | Completion reports from workers |
| Worker blockers | `dev-org/docs/handler-blockers/` | Blocker reports from workers |

## Config Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `{DEV_ORG_PATH}` | Path to dev-org project root | Current working directory |
| `{PROJECTS_DIR}` | Parent directory containing all project repos | Parent of dev-org |
| `{REFERENCE_PATH}` | Path to reference layer files | `reference/` |
| `{BACKLOG_PATH}` | Path to task files | `backlog/tasks/` |

## Design Doc

`dev-org/docs/plans/2026-02-11-handler-design.md`
