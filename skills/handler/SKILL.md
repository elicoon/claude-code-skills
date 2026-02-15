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
- **Autonomously via heartbeat** (every 30 minutes, no user present)

---

## Autonomous Mode (Heartbeat)

When invoked by the heartbeat loop (no user present), the handler runs a restricted subset of its phases. This keeps the workforce pipeline running continuously without human intervention.

**Phase 1 (Lightweight scan):**
- Step 1.1: Read handler-state.md
- Step 1.5: Read worker results + blockers
- Skip Steps 1.2–1.4 (full backlog/repo/GitHub scans — too heavy for 30-min cadence)

**Phase 2 (Auto-dispatch only):**
- Step 2.1: Identify starving projects — use handler-state.md's Budget by Project table and Active Dispatches to determine which projects have no queued or running **autonomous** work. User-blocked items don't count — they're on the user's plate, not the pipeline. For starving projects, dispatch a product-strategist worker via `launch-worker.sh`.
- Step 2.5: Build dispatch queue — **only auto-dispatchable items** (see Autonomy Model). Check `handler-dispatches/` for unlaunched dispatch files.

**Phase 3 (Launch):**
- Step 3.0: Dispatch workforce-scoper if backlog items exist without dispatch files
- Step 3.2: Launch workers for auto-dispatch items via `launch-worker.sh`
- Step 3.3: Update handler-state.md and commit

**Phase 4: Skip entirely.** No briefing, no approval requests.

**Output:**
- If no issues: `HEARTBEAT_OK`
- If alerts needing human attention: `ALERT: [description]` (omit HEARTBEAT_OK token)

**Constraints:**
- Target under 2 minutes total
- Never ask questions — no human is present
- Never dispatch approval-required items (features, architecture, PR merges)
- Never merge PRs or make architectural decisions
- Commit state changes: `git commit -m "heartbeat: auto-update state [$(date +%H:%M)]"`

## Configuration

### Step 0: Load Configuration

**This skill must be invoked from the dev-org project directory.** The handler operates across repos but dev-org is its home base.

**Pre-flight check:** Verify the current working directory contains `backlog/` and `reference/` directories. If not, this is not the dev-org project root — ask the user for the correct path before proceeding.

**Register handler session:** Write a marker so compaction hooks know this is a handler session:
```bash
echo '{"timestamp":"'$(date -Iseconds)'"}' > /tmp/claude-handler-active
```

Resolve paths:
- `{DEV_ORG_PATH}` → the current working directory (verified as dev-org above). **Always resolve to an absolute path.**
- `{PROJECTS_DIR}` → parent directory of `{DEV_ORG_PATH}` (e.g., `~/projects/`)

Check for `.atlas.yaml` in the project root:
- If found, read and use configured values
- If not found, use defaults:
  - `{REFERENCE_PATH}` → `reference/`
  - `{BACKLOG_PATH}` → `backlog/tasks/`
  - `{PLANS_PATH}` → `docs/plans/`
  - `{USER_NAME}` → `"the user"`

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

### Step 1.6: Checkpoint — Save Scan State

Append a scan summary to `{DEV_ORG_PATH}/docs/handler-state.md` under a new `## Scan Log` section (create if missing). Include: date/time, repos scanned, key findings (starving projects, stale repos, new PRs, worker results).

**Action Logging (REQUIRED):**
Before completing this phase, append any direct actions you took to `/home/eli/dev-org/docs/handler-action-log.md`:

| [today's date] | [phase number] | [what you did] | [which workforce role could do this instead] | [any notes] |

Direct actions include: reading files, running git commands, analyzing data, writing state, composing briefings. Essentially anything that isn't "call a worker/role and read its output."

Then commit in background:

```bash
cd {DEV_ORG_PATH} && git add docs/handler-state.md && git commit -m "handler: checkpoint after scan" &
```

---

## Phase 2: Analyze — Diagnose Pipeline Health

Using the data gathered in Phase 1, evaluate the following. Do this silently — output comes in Phase 4.

### Pipeline Definition

**The "pipeline" is work Claude can execute autonomously.** User-blocked items (needs approval, needs user review, needs user testing, etc.) are NOT pipeline work — they sit on the user's plate. When evaluating pipeline health, completely ignore user-blocked items. A project with 10 user-blocked dispatches and 0 auto-dispatchable items has an **empty pipeline**.

### Step 2.1: Identify Starving Projects

A project is **starving** if:
- It is an active project (has in-progress or ready tasks in backlog, or recent commits)
- AND it has fewer than 2 tasks that Claude can execute autonomously (without user input)
- **User-blocked items do not count.** A project with only user-blocked work is starving.

For starving projects, **dispatch a product-strategist worker** to fill the backlog:

```bash
{DEV_ORG_PATH}/scripts/launch-worker.sh "<project>-strategist" "<repo-path>" "You are a product-strategist worker. Run /product-strategist to analyze this project and create well-scoped backlog items." ""
```

If tmux is unavailable, add to the briefing as a dispatch command for the user.

Do NOT attempt to identify work opportunities yourself — that is the product-strategist's job. Handler only decides *which* projects are starving and dispatches the role.

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

**IMPORTANT: Never estimate budget usage. Use actual data only.**

The handler's budget estimates are unreliable (documented: estimated 45% when actual was 27%). Always use one of these methods:

1. **Ask the user** — During the briefing (Phase 4), ask the user to confirm both limits from `claude.ai/settings`. Record in handler-state.md.
2. **Automated check** — If `scripts/check-usage.sh` exists and is working, run it to get actual usage. (See backlog task: `automate-usage-tracking.md`)

Do NOT calculate budget from check-in log estimates or worker counts. Only record numbers confirmed by the user or retrieved programmatically.

**Two limits exist:**
- **Session limit** — resets every ~4 hours. Caps how much can run in one burst.
- **Weekly limit** — resets Sunday 9 PM. Caps total weekly usage.

Dispatch strategy must account for both:
- Don't launch more workers than a single session window can handle
- Spread dispatches across session windows throughout the day
- Calculate remaining session windows: (hours until Sunday 9PM) / 4

Calculate pacing from confirmed data:
- What % of the week has elapsed
- Is confirmed usage on track, over, or under?

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
| Backlog filling (starving projects) | `/product-strategist` → creates backlog items | No |
| Backlog-to-dispatch conversion | `/workforce-scoper` → creates dispatch files | No |

**Auto-dispatch rules** (no approval needed):
- Research and investigation tasks
- Backlog grooming
- Test runs and code review on existing PRs
- Re-running failed CI
- **Product-strategist for starving projects** (fills backlog autonomously)
- **Workforce-scoper to convert backlog items into dispatches**

**Requires approval:**
- New feature implementation
- Architectural decisions
- Merging PRs
- Priority rebalancing
- Any single dispatch estimated at >10% of weekly budget

### Step 2.6: Checkpoint — Save Analysis State

Append analysis results to `{DEV_ORG_PATH}/docs/handler-state.md`: starving projects, blockers found, dispatch queue built, budget pacing assessment.

**Action Logging (REQUIRED):**
Before completing this phase, append any direct actions you took to `/home/eli/dev-org/docs/handler-action-log.md`:

| [today's date] | [phase number] | [what you did] | [which workforce role could do this instead] | [any notes] |

Direct actions include: reading files, running git commands, analyzing data, writing state, composing briefings. Essentially anything that isn't "call a worker/role and read its output."

Then commit in background:

```bash
cd {DEV_ORG_PATH} && git add docs/handler-state.md && git commit -m "handler: checkpoint after analysis" &
```

---

## Phase 3: Dispatch — Route and Launch

### Step 3.0: Dispatch Workforce Scoper (if needed)

If there are backlog items ready for dispatch but no dispatch files exist for them, launch a **workforce-scoper** worker to convert them:

```bash
{DEV_ORG_PATH}/scripts/launch-worker.sh "<project>-scoper" "<repo-path>" "You are a workforce-scoper worker. Run /workforce-scoper to turn this project's backlog items into dispatch-ready work packages." ""
```

If tmux is unavailable, add to the briefing as a dispatch command for the user.

The scoper worker will write dispatch files to `{DEV_ORG_PATH}/docs/handler-dispatches/` and update handler-state.md. Handler can then launch implementation workers against those dispatch files.

**When to skip:** If dispatch files already exist for the project's backlog items, skip the scoper and go straight to Step 3.1.

### Step 3.1: Write Dispatch Files (Fallback)

If workforce-scoper is unavailable or for items that need immediate dispatch, handler can still write dispatch files directly. For each item in the dispatch queue that is approved (auto-dispatch or user-approved):

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
7. After each skill in the chain completes, write a progress checkpoint to docs/handler-results/YYYY-MM-DD-<slug>-checkpoint.md with: what's done, what's next, open questions
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

**IMPORTANT:** Before writing the dispatch file, resolve ALL `{DEV_ORG_PATH}` placeholders to the actual absolute path (e.g., `/home/eli/projects/dev-org`). Workers are launched in the target project's directory and have no way to resolve dev-org path variables. The dispatch file must contain concrete paths.

After writing each dispatch file, **read it back** to verify it's complete and all paths are absolute.

### Step 3.2: Launch Worker Sessions

For each dispatch file, determine execution method:

**If tmux is available** (always-on server):
```bash
{DEV_ORG_PATH}/scripts/launch-worker.sh "<name>" "<repo-path>" "You are a worker session dispatched by the handler. Read and execute <absolute-path-to-dispatch-file> — follow the worker contract exactly." "<absolute-path-to-dispatch-file>"
```
**IMPORTANT:** Replace `{DEV_ORG_PATH}` with the resolved absolute path (e.g., `/home/eli/projects/dev-org`). Replace `<absolute-path-to-dispatch-file>` with the full path to the dispatch file. Do not leave path variables in the command.

**Note:** `launch-worker.sh` handles all worker config setup (credentials, SSH keys, git config) via `setup-worker-config.sh` automatically. Output is logged to `/tmp/handler-logs/<name>.jsonl` and includes a startup health check.

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

**Then commit the state file** so changes persist if the session ends unexpectedly:
```bash
git add docs/handler-state.md && git commit -m "handler: update state after dispatch"
```

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

Weekly budget: ❓ Please confirm actual % from claude.ai/settings → [record here]
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

**Action Logging (REQUIRED):**
Before completing this phase, append any direct actions you took to `/home/eli/dev-org/docs/handler-action-log.md`:

| [today's date] | [phase number] | [what you did] | [which workforce role could do this instead] | [any notes] |

Direct actions include: reading files, running git commands, analyzing data, writing state, composing briefings. Essentially anything that isn't "call a worker/role and read its output."

---

## Guardrails

### From Traffic-Control Postmortem

These rules exist because a previous project (traffic-control, Jan 2026) failed catastrophically:

1. **No API keys** — All work through Claude Code CLI on subscription. Never use Agent SDK or `ANTHROPIC_API_KEY`.
2. **No premature infrastructure** — Markdown files and skills only. No databases, no web services, no schedulers.
3. **Pre-flight checks** — Verify task queue contents and budget before every dispatch. Never dispatch against stale or test data.
4. **Priority confirmation** — Don't spend significant budget without confirmed priorities. If stale (>7 days), re-confirm first.
5. **Circuit breaker** — Code-review → debug-loop cycle caps at 3 rounds per issue. Escalate to handler after that.
6. **Budget pacing** — Distribute usage across the week. Don't burn everything on day 1.
7. **Start small** — 2-3 projects max initially. Scale once dispatch → execute → report loop is reliable.

### Autonomy Model

**Auto-dispatch (no approval needed):**
- Research and investigation tasks
- Backlog grooming (close stale tasks, update statuses)
- Test runs and code review on existing PRs
- Re-running failed CI checks
- **Product-strategist for starving projects** (fills backlog autonomously)
- **Workforce-scoper to convert backlog items into dispatches**

**Requires approval:**
- New feature implementation
- Architectural decisions
- Merging PRs
- Priority rebalancing
- Any single dispatch estimated at >10% of weekly budget

### Verification Gate

**No PR is created without passing this sequence:**

1. Worker runs `/code-review` on implementation
2. If issues found → `/debug-loop` on each issue (not quick fixes)
3. Re-run `/code-review` — if still failing after 3 rounds, write blocker and stop
4. Run `/test-feature` — capture actual output as evidence
5. Create PR with test evidence in description
6. Worker writes completion report to `docs/handler-results/`

**The handler never merges a PR without reviewing the test evidence in the completion report.**

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
| handler-state.md has parse errors | Back up current file, reconstruct from dispatch/results/blockers directories, flag in briefing |
| `/test-feature` fails after code-review passes | Run `/debug-loop` on the failing test, then re-run verification gate from step 1. Same 3-round cap applies. |
| tmux not running | Always use manual dispatch fallback (copy-paste commands) |

## Reminders

- Never dump raw file contents — synthesize and summarize
- Present decisions as numbered options, not open-ended questions
- Phone check-ins should be maximally compressed
- Every check-in must end with background work running or a clear reason why not
- Verify dispatch files by reading them back before launching workers
- Append-only for Discoveries, What Failed, Blockers — never delete history
