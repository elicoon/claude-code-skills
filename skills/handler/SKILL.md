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

## Phase 1: Scan — Gather State

Read all sources silently. Do not output raw file contents to the user.

### Step 1.1: Read Handler State

Read `{DEV_ORG_PATH}/docs/handler-state.md`:
- If it exists: parse active dispatches, pending decisions, budget tracking, priority alignment, check-in log
- If it doesn't exist: this is the first run. Skip to the First Run section above, complete it, then return here.

### Step 1.2: Read Dev-Org Backlog

Read all files in `{BACKLOG_PATH}/*.md`. For each task, extract:
- Title, status, priority, blockers, next steps
- Group by: in-progress, blocked, ready (has next steps but not started), done

Also read:
- `{REFERENCE_PATH}/identity/why.md` — for priority calibration
- `{REFERENCE_PATH}/identity/constraints.md` — for time/resource awareness
- `{REFERENCE_PATH}/identity/preferences.md` — for interaction style
- `{REFERENCE_PATH}/lessons/lessons.md` — for behavioral guardrails

### Step 1.3: Scan Local Repos

For each directory in `{PROJECTS_DIR}/`:
- Run `git -C <repo> log --oneline -1 --format="%ar - %s"` to get last commit age and message
- Run `git -C <repo> status --porcelain` to detect uncommitted work
- Run `git -C <repo> branch --list` to detect open branches
- Skip non-git directories silently

Build a table:
| Repo | Last Commit | Uncommitted Work | Open Branches | Days Since Activity |

### Step 1.4: Scan GitHub

Run `gh repo list --limit 50 --json name,pushedAt,description` to get all repos.

For repos with recent activity (pushed in last 14 days), also check:
- `gh pr list --repo <owner>/<repo> --state open --json number,title,createdAt,isDraft`
- Note any PRs with failing checks

### Step 1.5: Read Worker Results

Check for files in `{DEV_ORG_PATH}/docs/handler-results/`. For each:
- Parse completion report (commit hash, PR number, test results, blockers)
- Match to active dispatches in handler state
- Mark matched dispatches as complete

Check for files in `{DEV_ORG_PATH}/docs/handler-blockers/`. For each:
- Parse blocker description and proposed resolution
- Flag for user attention or auto-resolution

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
