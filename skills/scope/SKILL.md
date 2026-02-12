---
name: scope
description: Scan a project and produce dispatch-ready work for the handler pipeline. Generates 2-3 dispatch files with full context, acceptance criteria, and implementation paths.
---

# /claude-code-skills:scope

Scan a project, identify autonomous work opportunities, and produce handler dispatch files that are ready to launch.

## When to Use

- Handler identifies a starving project (fewer than 2 dispatch-ready tasks)
- Starting work on a project after a gap (need to understand current state)
- Pipeline is thin and needs filling before tmux workers go idle
- Proactively after completing a batch of dispatches

## Configuration

This skill reads `.atlas.yaml` from the project root if present. If no config file exists, default paths are used.

**Config variables used:**
- `{BACKLOG_PATH}` - Path to task files (default: `backlog/tasks/`)
- `{PLANS_PATH}` - Path to implementation plans (default: `docs/plans/`)
- `{REFERENCE_PATH}` - Path to reference files (default: `reference/`)
- `{USER_NAME}` - Name used in documentation (default: `"the user"`)

**Cross-repo dependency:** This skill writes dispatch files to the dev-org repo, not the target project. It must know the absolute path to dev-org.

---

## Instructions for Claude

### Step 0: Resolve Paths

1. **Determine target project:**
   - If invoked with an argument (e.g., `/scope golf-clip`), resolve to `{PROJECTS_DIR}/<arg>`
   - If no argument, use the current working directory
   - Verify it's a git repository. If not, stop and ask.

2. **Determine dev-org path:**
   - Check if current directory IS dev-org (has `backlog/` + `reference/` + `docs/handler-state.md`)
   - If not, look for dev-org as a sibling directory (same parent)
   - If still not found, ask the user for the path
   - **Store as `{DEV_ORG_PATH}` — always absolute**

3. **Load atlas.yaml** from the target project root:
   - If found, use configured values
   - If not found, use defaults

4. **Read handler state** from `{DEV_ORG_PATH}/docs/handler-state.md`:
   - Parse active dispatches (to avoid duplicates)
   - Parse pending decisions (to avoid re-asking)
   - Note budget remaining and priority level for this project

---

### Step 1: Deep Scan

Run all of these in parallel where possible. Do not output raw results to the user — synthesize in Step 2.

#### 1a. Git State
```
git log --oneline -20                    # Recent history
git status --porcelain                   # Dirty files
git branch --list                        # Open branches
git stash list                           # Stashed work
```

#### 1b. Project Backlog
- Read all task files in `{BACKLOG_PATH}/*.md` (if directory exists)
- Extract: title, status, priority, blockers, next steps

#### 1c. Dev-Org Backlog (cross-reference)
- Read all files in `{DEV_ORG_PATH}/backlog/tasks/*.md`
- Filter to tasks that reference this project (by repo name in filename or content)
- Extract: title, status, priority, blockers, next steps

#### 1d. Codebase Health
- Check for test directory (`tests/`, `__tests__/`, `*.test.*`, `*.spec.*`)
- Count test files vs source files (rough coverage signal)
- Search for `TODO`, `FIXME`, `HACK`, `XXX` comments
- Check for README.md, CLAUDE.md, contributing docs

#### 1e. Open PRs and CI
```
gh pr list --state open --json number,title,createdAt,isDraft
```

#### 1f. Implementation Plans
- Read any files in `{PLANS_PATH}/*.md` or `docs/plans/*.md`
- Identify plans that haven't been fully executed

#### 1g. Product Understanding
- Read README.md, CLAUDE.md, any PRD or product docs
- Read package.json / Cargo.toml / go.mod for tech stack
- Understand what the product does, who it's for, and what state it's in

---

### Step 2: Identify Work Opportunities

Analyze scan results against these 8 categories, in priority order:

| Priority | Category | Signal | Example |
|----------|----------|--------|---------|
| 1 | **Uncommitted WIP cleanup** | Dirty files, stale branches | "28 dirty files from debugging session" |
| 2 | **Bug fixes** | Bug-tagged tasks, failing tests, error TODOs | "Export timeout not handled" |
| 3 | **Stale branch resolution** | Branches with no recent commits | "fix/clip-boundary abandoned 2 weeks ago" |
| 4 | **Missing test coverage** | Source files without corresponding tests | "VideoExporter has 0 tests" |
| 5 | **Documentation gaps** | Missing README sections, outdated docs | "API docs reference removed endpoints" |
| 6 | **Feature implementation** | Backlog tasks with existing plans | "Adjust impact time — plan exists" |
| 7 | **Research spikes** | Tasks without implementation paths | "Offline export needs investigation" |
| 8 | **New feature proposals** | Product gaps, user experience improvements, competitive features | "Add social sharing for clips" |

#### Category 8: New Feature Proposals

For this category, think like a product manager:
- What would make this product more useful to its target users?
- What's the competitive landscape? What features do similar products have?
- What would make this product more marketable or monetizable?
- Are there quick wins (small effort, high user value)?
- Are there features that leverage existing infrastructure?

**Constraints on feature proposals:**
- Must be scoped to a single dispatch (not multi-week epics)
- Must have clear acceptance criteria definable without user input
- Research/spike dispatches are fine if the feature needs investigation first
- Tag proposals as `type: feature-proposal` in the dispatch so the handler knows these are suggestions, not confirmed work

#### Filtering Rules

For each opportunity, assess:
- **Autonomous?** Can a worker complete this without human decisions? If no, log as a Pending Decision instead.
- **Duplicate?** Is this already an active dispatch in handler state? If yes, skip.
- **Right size?** Can it be completed in a single dispatch (under 2 hours)? If too large, break it down.
- **Aligned?** Does it match the project's priority level and budget allocation?

---

### Step 3: Prioritize and Select

Select the top 2-3 work items based on:
1. Handler priority level for this project
2. Category priority (lower number = higher priority)
3. Autonomous readiness (fully autonomous > needs-investigation > needs-decision)
4. Impact (unblocks other work > standalone improvement)

**Pipeline balance rule:** Aim for a mix of quick wins (< 15 min) and substantial tasks (30-60 min). Don't produce 3 research spikes — at least one should produce shippable output.

---

### Step 4: Write Dispatch Files

For each selected work item, write a dispatch file to:
`{DEV_ORG_PATH}/docs/handler-dispatches/YYYY-MM-DD-<project>-<task-slug>.md`

**Use this exact template:**

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
3. If blocked, write blocker to {DEV_ORG_PATH}/docs/handler-blockers/YYYY-MM-DD-<slug>.md and stop
4. Do not merge PRs — create them and report back
5. Write completion report to {DEV_ORG_PATH}/docs/handler-results/YYYY-MM-DD-<slug>.md before exiting
6. Code review issues go through /debug-loop, not quick fixes (max 3 rounds)
-->

## Metadata

| Field | Value |
|-------|-------|
| **Project** | [repo name] |
| **Repo** | [absolute path to repo] |
| **Priority** | P[1-5] |
| **Skill Chain** | [skill sequence] |
| **Dispatched** | YYYY-MM-DD |
| **Budget Cap** | ~X% of weekly allocation |
| **Type** | cleanup / bugfix / test / docs / feature / feature-proposal / research |
| **Source** | /scope |

## Objective

[One sentence: what "done" looks like]

### Acceptance Criteria

- [ ] [Specific, testable outcome]
- [ ] [Specific, testable outcome]
- [ ] [Specific, testable outcome]

### Scope Boundaries

- Not addressing: [explicitly out of scope]

## Context

[Key files, recent decisions, relevant background — enough for a cold start.
Include specific file paths, recent commits, and codebase state.]

## Tasks

1. [Specific step with expected outcome]
2. [Specific step with expected outcome]
3. [Specific step with expected outcome]

## Verification Gate

[For PR-producing work:]
1. Run `/code-review` on implementation
2. If issues found -> `/debug-loop` on each (max 3 rounds)
3. Run `/test-feature` — capture actual output
4. Create PR with test evidence

[For non-PR work:]
1. [Specific verification command or check]
2. [Expected output]

## On Completion

Write `{DEV_ORG_PATH}/docs/handler-results/YYYY-MM-DD-<slug>.md`:

```
## Result: [task name]
- Commit: [hash]
- PR: #[number] (or "no PR — [type] task")
- Tests: [X passed, Y failed]
- Code review: [clean / N issues found and resolved]
- Blockers encountered: [none, or description]
```

## On Blocker

1. Run `/retro` to analyze root cause
2. Write `{DEV_ORG_PATH}/docs/handler-blockers/YYYY-MM-DD-<slug>.md`
3. Stop work — do not attempt workarounds without handler approval
~~~

**CRITICAL:** Before writing, resolve ALL `{DEV_ORG_PATH}` placeholders to the actual absolute path. Workers cannot resolve variables.

---

### Step 5: Validate Dispatch Files (MANDATORY)

**This step cannot be skipped. Malformed dispatches waste worker time.**

After writing each dispatch file, read it back and verify against this checklist:

| # | Check | How to Verify |
|---|-------|---------------|
| 1 | All paths are absolute | No `./`, `../`, or `{VAR}` placeholders remain |
| 2 | Objective is one sentence | Count sentences in Objective section |
| 3 | Acceptance criteria are testable | Each starts with a verb, describes observable outcome |
| 4 | Scope boundaries exist | "Not addressing" section is populated |
| 5 | Context has file paths | At least 2 specific file paths mentioned |
| 6 | Tasks are numbered steps | Not vague ("investigate") — each has expected outcome |
| 7 | Verification gate matches type | PR work has code-review chain; non-PR has specific checks |
| 8 | On Completion path is absolute | Full path to results file |
| 9 | On Blocker path is absolute | Full path to blockers file |
| 10 | No duplicate of active dispatch | Cross-checked against handler state |

**If any check fails:** Fix the issue and re-validate. Do not proceed to Step 6 until all 10 checks pass.

**Output validation result:**
```
Dispatch validation: [filename]
  [1] Absolute paths ........... PASS
  [2] One-sentence objective ... PASS
  [3] Testable criteria ........ PASS
  [4] Scope boundaries ......... PASS
  [5] Context file paths ....... PASS
  [6] Numbered task steps ...... PASS
  [7] Verification gate ........ PASS
  [8] Completion path .......... PASS
  [9] Blocker path ............. PASS
  [10] No duplicates ........... PASS
  RESULT: VALID
```

---

### Step 6: Log Pending Decisions

For work opportunities that need human input (failed the "Autonomous?" filter in Step 2), add entries to `{DEV_ORG_PATH}/docs/handler-state.md` under `## Pending Decisions`:

```markdown
| PD[N] | [project] | [question] | [options] |
```

Do NOT create dispatch files for non-autonomous work. The handler will present these decisions to the user at the next check-in.

---

### Step 7: Update Handler State

Update `{DEV_ORG_PATH}/docs/handler-state.md`:
- Add new dispatches to `## Active Dispatches` with status `queued`
- Add any pending decisions from Step 6
- Add discoveries to `## Discoveries` table

---

### Step 8: Commit and Report

Commit all new files:
```
git add docs/handler-dispatches/YYYY-MM-DD-*.md docs/handler-state.md
git commit -m "scope: [project] — [N] dispatches queued, [M] decisions pending"
```

Present summary to the user:

```
Scope: [project] complete
────────────────────────

Dispatched:
  D[N]: [task name] (~X min, [type])
  D[N]: [task name] (~X min, [type])
  D[N]: [task name] (~X min, [type])

Decisions needed:
  PD[N]: [question]

Skipped (already dispatched):
  [task name] — active as D[X]

Pipeline: [total queued dispatches] tasks, ~[total time] estimated
```

---

## Skill Routing Table

When determining the skill chain for a dispatch, use this table:

| Work Type | Skill Chain | Creates PR? |
|-----------|------------|-------------|
| WIP cleanup | commit + organize | No |
| Bug fix | `/debug-loop` -> `/code-review` -> `/test-feature` | Yes |
| Stale branch | investigate + delete or merge | No |
| Test coverage | `/write-plan` -> implement tests -> `/code-review` | Yes |
| Documentation | write/update docs | No |
| Feature implementation | `/write-plan` -> `/uat` -> implement -> `/code-review` -> `/test-feature` | Yes |
| Research spike | investigate -> write findings to `docs/research/` | No |
| Feature proposal | research -> write task file with acceptance criteria | No |

---

## Error Handling

| Issue | Response |
|-------|----------|
| Target project not a git repo | Stop and ask the user |
| Dev-org path not found | Ask the user for the path |
| No handler-state.md | Stop — handler must be initialized first (`/handler`) |
| GitHub API unavailable | Skip PR scan, note in report |
| No work opportunities found | Report "project is healthy, no autonomous work identified" — this is not a failure |
| All opportunities need decisions | Create pending decisions only, no dispatches. Flag in report. |
| Dispatch validation fails | Fix and re-validate. Never commit a failing dispatch. |

---

## Reminders

- Never dump raw scan results — synthesize and prioritize
- All dispatch file paths must be absolute before writing
- Validation is mandatory — a malformed dispatch wastes more time than no dispatch
- Feature proposals (category 8) are suggestions, not confirmed work — tag them clearly
- Check handler state for duplicates before writing anything
- Pipeline balance: mix quick wins with substantial tasks
- This skill produces dispatch files, not implementations — stay in scoping mode
