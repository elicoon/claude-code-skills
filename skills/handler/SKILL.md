---
name: handler
description: Daily check-in AI product manager — scans all projects, dispatches autonomous work, keeps the pipeline full. Use when starting a work session or checking in on progress.
---

# Handler: AI Product Manager

<!--
HANDLER SKILL
=============
Single daily entry point to Claude Code. Acts as an independent product
manager that knows what's happening across all projects and comes to
the conversation with an agenda.

SUCCESS CRITERIA:
1. Every active project progresses every day
2. All Claude Code weekly usage consumed by end of week
3. Usage allocation reflects stated priorities

DESIGN DOC: dev-org/docs/plans/2026-02-11-handler-design.md
-->

## When to Use

- Starting a work session ("good morning", "what should I work on")
- Checking in on progress from phone (~4 hour cadence)
- Reviewing what background workers accomplished
- Rebalancing priorities across projects

## Configuration

### Step 0: Load Configuration

Before starting, check for `.atlas.yaml` in the project root:
- If found, read and use configured values
- If not found, use defaults:
  - `{REFERENCE_PATH}` → `reference/`
  - `{BACKLOG_PATH}` → `backlog/tasks/`
  - `{PLANS_PATH}` → `docs/plans/`
  - `{USER_NAME}` → `"the user"`

Also resolve:
- `{DEV_ORG_PATH}` → the project root where this skill is invoked (should be dev-org)
- `{PROJECTS_DIR}` → parent directory of dev-org (e.g., `~/projects/`)

---

[FIRST RUN SECTION PLACEHOLDER]

---

[PHASE 1 PLACEHOLDER]

---

[PHASE 2 PLACEHOLDER]

---

[PHASE 3 PLACEHOLDER]

---

[PHASE 4 PLACEHOLDER]

---

[GUARDRAILS PLACEHOLDER]

---

## Error Handling

| Issue | Response |
|-------|----------|
| No `.atlas.yaml` found | Use defaults, note in briefing |
| No handler-state.md exists | First run — create initial state file |
| tmux not available | Fall back to printing dispatch commands for manual copy-paste |
| GitHub API rate limited | Skip GitHub scan, note in briefing, use local data only |
| A project repo not found locally | Note as "remote-only" in briefing, use GitHub data |
| Budget tracking data unavailable | Estimate from check-in log, flag uncertainty |

## Reminders

- Never dump raw file contents — synthesize and summarize
- Present decisions as numbered options, not open-ended questions
- Phone check-ins should be maximally compressed
- Every check-in must end with background work running or a clear reason why not
- Verify dispatch files by reading them back before launching workers
- Append-only for Discoveries, What Failed, Blockers — never delete history
