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

## Phase 2: Analyze — Diagnose Pipeline Health

Using the data gathered in Phase 1, evaluate the following. Do this silently — output comes in Phase 4.

### Step 2.1: Identify Starving Projects

A project is **starving** if:
- It is an active project (has in-progress or ready tasks in backlog, or recent commits)
- AND it has fewer than 2 tasks that can be executed autonomously (without user input)

For starving projects, determine:
- Can the handler generate autonomous work? (research spikes, test coverage, documentation, grooming)
- Or does it need user input to scope the next batch of work?

### Step 2.2: Identify Blocked Work

Work is **blocked** if:
- A task in the backlog has status "blocked" or mentions a blocker
- A PR has failing checks or is waiting on review
- A worker wrote a blocker file
- A repo has uncommitted work older than 3 days (possible abandoned WIP)

For each blocker, classify:
- **Auto-resolvable** — handler can fix it (re-run CI, merge a dependency PR, close stale items)
- **Needs user input** — architectural decision, external dependency, priority call

### Step 2.3: Check Priority Alignment

Compare current budget allocation (from handler state) against stated priorities:
- Read priority alignment section from handler state
- If priorities haven't been confirmed in 7+ days, flag for re-confirmation BEFORE dispatching any new work
- If budget allocation has drifted >20% from priority weights, flag for rebalancing

### Step 2.4: Check Budget Pacing

Calculate:
- What % of weekly budget is used (from check-in log)
- What % of the week has elapsed
- Is pacing on track, over, or under?

If under-paced (budget available but not being used):
- Identify lower-priority work that can absorb excess budget
- Recommend backfilling with research, testing, or grooming tasks

If over-paced:
- Flag which projects are consuming disproportionate budget
- Recommend throttling or pausing lower-priority dispatches

### Step 2.5: Build Dispatch Queue

Based on the analysis, build a prioritized list of work to dispatch:

For each item, determine:
- **Project** — which repo
- **Task** — what to do
- **Skill chain** — which skills the worker should use (see Skill Routing table)
- **Auto-dispatch?** — can this launch without approval?
- **Estimated budget** — rough % of weekly allocation

**Skill Routing Table:**

| Work Type | Skill Chain | Creates PR? |
|-----------|------------|-------------|
| New feature | `/write-plan` → `/uat` → `/loop`(feature) → `/code-review` → if issues: `/debug-loop` → `/test-feature` | Yes |
| Bug fix | `/debug-loop --depth minimal` → `/code-review` → if issues: `/debug-loop` → `/test-feature` | Yes |
| Complex bug | `/debug-loop --depth standard` → `/code-review` → if issues: `/debug-loop` → `/test-feature` | Yes |
| Refactor | `/loop`(refactor) → `/code-review` → if issues: `/debug-loop` → `/test-feature` | Yes |
| Research | `/loop`(investigation) → write findings to `docs/research/` | No |
| Backlog grooming | `/add` to update tasks, close stale items | No |

**Auto-dispatch rules** (no approval needed):
- Research and investigation tasks
- Backlog grooming
- Test runs and code review on existing PRs
- Re-running failed CI
- Generating tasks for starving projects (research/grooming scope only)

**Requires approval:**
- New feature implementation
- Architectural decisions
- Merging PRs
- Priority rebalancing
- Any single dispatch estimated at >10% of weekly budget
- Scoping new feature work for a starving project

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
