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

## First Run

If `{DEV_ORG_PATH}/docs/handler-state.md` does not exist, this is the first run. Before proceeding to Phase 1:

### Step F1: Create directory structure

```bash
mkdir -p {DEV_ORG_PATH}/docs/handler-dispatches
mkdir -p {DEV_ORG_PATH}/docs/handler-results
mkdir -p {DEV_ORG_PATH}/docs/handler-blockers
```

### Step F2: Create initial handler state file

Create `{DEV_ORG_PATH}/docs/handler-state.md` with the following template:

~~~markdown
# Handler State

<!--
HANDLER STATE FILE
==================
Persistent memory between check-ins. Append-only history sections.
Handler reads this fresh every check-in.
-->

## Last Check-in
[Will be set after first check-in completes]

## Weekly Budget

| Field | Value |
|-------|-------|
| **Week of** | [current Monday's date] |
| **Total** | 100% |
| **Used** | 0% |
| **Remaining** | 100% |
| **Days left** | [days until Sunday] |
| **Pace** | starting |

### Budget by Project

| Project | Priority | Allocated | Used | Status |
|---------|----------|-----------|------|--------|
| [To be filled after priority confirmation] | | | | |

## Active Dispatches

| ID | Project | Task | Window | Status | Dispatched |
|----|---------|------|--------|--------|------------|
| (none yet) | | | | | |

## Pending Decisions

| ID | Project | Question | Options |
|----|---------|----------|---------|
| (none yet) | | | |

## Priority Alignment

Last confirmed: never
[Handler must confirm priorities on first run before dispatching work]

## Discoveries

| Date | Discovery | Impact |
|------|-----------|--------|
| | | |

## What Failed

| Date | Dispatch | Why It Failed | Lesson |
|------|----------|---------------|--------|
| | | | |

## Blockers

### Active

| ID | Project | Description | Proposed Resolution |
|----|---------|-------------|---------------------|
| | | | |

### Resolved

| ID | Resolution | Date Resolved |
|----|------------|---------------|
| | | |

## Check-in Log

| Date | Projects Scanned | Dispatches Launched | Decisions Made | Budget Used |
|------|-----------------|--------------------|--------------------|-------------|
| | | | | |
~~~

### Step F3: Confirm priorities

Before any dispatching can happen, the handler MUST confirm priorities with the user:

```
Welcome to Handler — first run.

I've scanned your projects. Before I can dispatch work, I need to
confirm priorities. Here's what I found:

[List active projects with recent activity]

How would you rank these? (I'll use this to allocate weekly budget)
```

After confirmation, fill in the Priority Alignment and Budget by Project sections in handler-state.md.

### Step F4: Commit initial state

```bash
cd {DEV_ORG_PATH}
git add docs/handler-state.md
git commit -m "feat: initialize handler state for first run"
```

Then proceed to Phase 1 as normal.

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

## Phase 3: Dispatch — Route and Launch

### Step 3.1: Write Dispatch Files

For each item in the dispatch queue that is approved (auto-dispatch or user-approved):

Create `{DEV_ORG_PATH}/docs/handler-dispatches/YYYY-MM-DD-<project>-<task-slug>.md` using this template:

~~~markdown
# Dispatch: [Task Name]

<!--
HANDLER DISPATCH
================
This document contains everything needed to execute this task autonomously.
Read the entire document before taking action.

WORKER CONTRACT:
1. Read this document completely before starting
2. Use the specified skill chain below
3. If blocked, write blocker to docs/handler-blockers/YYYY-MM-DD-<slug>.md and stop
4. Do not merge PRs — create them and report back
5. Write completion report to docs/handler-results/YYYY-MM-DD-<slug>.md before exiting
6. Code review issues go through /debug-loop, not quick fixes (max 3 rounds)
-->

## Metadata

| Field | Value |
|-------|-------|
| **Project** | [repo name] |
| **Repo** | [full path to repo] |
| **Priority** | P[1-3] |
| **Skill Chain** | [skill sequence from routing table] |
| **Dispatched** | YYYY-MM-DD HH:MM |
| **Budget Cap** | ~X% of weekly allocation |

## Objective

[One sentence: what "done" looks like]

### Acceptance Criteria

- [ ] [Specific, testable outcome]
- [ ] [Specific, testable outcome]

### Scope Boundaries

- Not addressing: [explicitly out of scope]

## Context

[Key files, recent decisions, relevant background — enough for a cold start.
Include any relevant info from backlog task, recent commits, and handler analysis.]

## Verification Gate

All PR-producing work must pass this sequence before creating a PR:

1. Run `/code-review` on implementation
2. If issues found → run `/debug-loop` on each issue (not quick fixes — max 3 rounds)
3. Re-run `/code-review` — if still failing after 3 rounds, write blocker and stop
4. Run `/test-feature` — capture actual output as evidence
5. Create PR with test evidence in description

## On Completion

Write `{DEV_ORG_PATH}/docs/handler-results/YYYY-MM-DD-<slug>.md`:

```
## Result: [task name]
- Commit: [hash]
- PR: #[number] (or "no PR — research/grooming task")
- Tests: [X passed, Y failed]
- Code review: [clean / N issues found and resolved]
- Blockers encountered: [none, or description]
```

## On Blocker

1. Run `/retro` to analyze root cause
2. Write `{DEV_ORG_PATH}/docs/handler-blockers/YYYY-MM-DD-<slug>.md`:

```
## Blocker: [task name]
- Step blocked at: [what was being attempted]
- Root cause: [from retro analysis]
- Proposed resolution: [what would unblock this]
- Needs user input: [yes/no — and what specifically]
```

3. Stop work — do not attempt workarounds without handler approval
~~~

After writing each dispatch file, **read it back** to verify it's complete and correct.

### Step 3.2: Launch Worker Sessions

For each dispatch file, determine execution method:

**If tmux is available** (always-on server):
```bash
tmux new-window -d -n "<project>" -c "<repo-path>" \
  "claude 'You are a worker session dispatched by the handler. Read and execute {DEV_ORG_PATH}/docs/handler-dispatches/YYYY-MM-DD-<slug>.md — follow the worker contract exactly.'"
```

**If tmux is not available** (local machine):
Present copy-paste commands to the user:
```
Ready to dispatch. Run these in separate terminals:

Window 1 — [project]:
  cd [repo-path]
  claude "Read and execute [dispatch-file-path]"
```

### Step 3.3: Update Handler State

After dispatching, update `{DEV_ORG_PATH}/docs/handler-state.md`:
- Add new entries to Active Dispatches table
- Update budget estimates
- Clear any completed/resolved items from previous check-in
- Move completed dispatches to Check-in Log
- Update Last Check-in timestamp

---

## Phase 4: Report — Briefing

Present the check-in briefing to the user. Format depends on context.

### Standard Briefing (desktop session)

~~~
Handler: [Day] Briefing
─────────────────────────
[N] projects active, [X] progressing, [Y] needs attention

[For each active project, one line:]
🟢 [project] — [status summary, last action, next action]
🟡 [project] — [what needs attention and why]
🔴 [project] — [blocked/stalled, what's wrong]

Dispatched since last check-in:
  ✅ [project]: [task] (completed — [key result])
  🔄 [project]: [task] (running)
  ❌ [project]: [task] (blocked — [reason])

[If there are auto-dispatched items this check-in:]
Auto-dispatched:
  🚀 [project]: [task] (launched just now)

[If there are items needing approval:]
Needs your input:
  1. [decision needed] [Y/n]
  2. [decision needed] [Y/n]
  3. [decision needed] [options]

Weekly budget: [X]% used, [N] days remaining ([on pace / over / under])
[If priority misalignment:] ⚠️  [priority concern]
~~~

### Phone Briefing (compressed for mobile check-in)

When the user indicates they're on phone, gives very short responses, or the handler detects terse input patterns:

~~~
[N] active, [X] ok, [Y] needs input

🟢 golf-clip ✅ PR merged
🟡 happy-cli — no tasks queued
🔄 dev-org — grooming running

Input needed:
1. Scope happy-cli sprint? [Y/n]
2. Approve golf-clip PR #14? [Y/n]

Budget: 62% used, 3d left ✓
~~~

Batch all decisions into numbered list. Accept responses like "1y 2n" or just "y" (applies to all).

### Priority Re-confirmation

If priorities haven't been confirmed in 7+ days, present BEFORE the regular briefing:

~~~
⚠️  Priority check — last confirmed [N] days ago.
Current allocation:
  P1: [project] ([X]%)
  P2: [project] ([X]%)
  P3: [project] ([X]%)
  Unallocated: [X]%

Still accurate? [Y/n/adjust]
~~~

Do not dispatch new work until priorities are confirmed.

### Post-Briefing

After presenting the briefing and receiving any approvals:
1. Launch approved dispatches (return to Phase 3 Step 3.2)
2. Update handler state with decisions made
3. Confirm: "Background work running. Next check-in recommended in ~4 hours."

If no work could be dispatched (everything blocked or starving and needs user input):
- Flag this explicitly: "⚠️ No background work running. [Reason]. [Proposed action to unblock]."
- This is a handler failure state — every check-in should end with work running.

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
