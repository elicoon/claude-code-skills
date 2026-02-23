---
name: debug-loop
description: Deterministic debugging workflow with living document orchestration
---

# /claude-code-skills:debug-loop

A deterministic, document-driven debugging workflow where the **living document is the orchestrator**. Each agent is stateless — reads the doc, does its job, updates the doc, exits.

## Core Concept

The filesystem is the single source of truth. Every agent reads the living document fresh, executes its phase, updates the document, then exits. The document contains enough context for any agent to resume — no conversation history required.

**Key principles:**
- Deterministic workflow, probabilistic nodes
- Document-as-orchestrator (no long-running orchestrator agent)
- Explicit paths, templates, and update rules
- Human checkpoints at critical decision points
- Serial execution (one bug at a time, fully through loop)
- Configurable depth based on bug complexity

## Subcommands

| Subcommand | Purpose |
|------------|---------|
| `init --bug <slug> --depth <minimal\|standard\|full> [--worktree]` | Initialize a new debug loop |
| `resume` | Continue from living doc state |
| `status` | Show current phase and progress |

Default (no subcommand): Show help with usage examples.

---

## `/claude-code-skills:debug-loop init`

Initialize a new debug loop for a specific bug.

### Flags

| Flag | Required | Description |
|------|----------|-------------|
| `--bug <slug>` | Yes | Bug task slug (matches `backlog/tasks/bug-{slug}.md`) |
| `--depth <minimal\|standard\|full>` | Yes | Workflow depth (affects which phases run) |
| `--worktree` | No | Create isolated git worktree for debugging work |

### Depth Levels

| Depth | Phases Included | Use When |
|-------|-----------------|----------|
| minimal | debug, test, plan, implement, review, verify | Simple bug, quick fix |
| standard | + UAT, + docs update | Normal bug, needs test coverage |
| full | + architecture design | Complex bug, architectural implications |

### Instructions for Claude

**CRITICAL: Create a TodoWrite checklist with steps 1-7 before starting. Mark each in_progress/completed as you go.**

#### Step 1: Validate Bug Task Exists

1. Check that bug task file exists at `backlog/tasks/bug-{slug}.md`
2. If not found:
   - Search for similar files: `Glob("backlog/tasks/bug-*{slug}*.md")`
   - If found, suggest correct slug
   - If not found, error: "Bug task not found. Create it first with `/add --type bug`"
3. Read the bug task file to extract:
   - Bug description
   - Reproduction steps
   - Expected vs actual behavior
   - Any existing investigation notes

#### Step 2: Detect Project Configuration

1. Check for `.atlas.yaml` in project root for conventions:
   - `test_dir`: Directory for tests (default: `tests`)
   - `test_ext`: Test file extension (default: `.test.ts`)
   - `docs_dir`: Directory for plans (default: `docs/plans`)
2. If no `.atlas.yaml`, use defaults
3. Store detected configuration for path resolution

#### Step 3: Generate Bug-Specific Exit Criteria

Based on the bug description, generate specific exit criteria for each phase. These are NOT generic — they must reference the actual bug.

Example for a "playback crashes on empty playlist" bug:

```yaml
exit_criteria:
  systematic-debug:
    description: "Identify why playback crashes when playlist array is empty"
    verification: "Debug findings doc contains root cause with stack trace"
    evidence_required:
      - "Stack trace showing crash location"
      - "Confirmed reproduction steps"
      - "Root cause hypothesis validated"
```

Generate exit criteria for these phases based on depth:
- **All depths:** systematic-debug, write-tests, write-plan, implement, code-review, verify
- **Standard/full:** + uat, + update-docs
- **Full only:** + architecture

#### Step 4: Resolve Artifact Paths

Substitute variables in path patterns:

| Variable | Value |
|----------|-------|
| `{date}` | Today's date in `YYYY-MM-DD` format |
| `{slug}` | Bug slug from `--bug` flag |
| `{test_dir}` | From `.atlas.yaml` or default `tests` |
| `{ext}` | From `.atlas.yaml` or default `.test.ts` |

Resolve all paths:
```yaml
paths:
  living_doc: ".claude/debug-loop-{slug}.md"
  bug_task: "backlog/tasks/bug-{slug}.md"
  debug_findings: "docs/plans/{date}-{slug}-debug.md"
  reproduction_test: "{test_dir}/{slug}{ext}"
  architecture: "docs/plans/{date}-{slug}-architecture.md"  # full only
  implementation_plan: "docs/plans/{date}-{slug}-plan.md"
  uat: "docs/plans/{date}-{slug}-uat.md"  # standard/full only
  test_results: "docs/plans/{date}-{slug}-results.md"
  new_bugs: "backlog/tasks/"
```

#### Step 5: Create Worktree (if --worktree flag)

If `--worktree` flag is provided:

1. Invoke `/using-git-worktrees` skill to create isolated workspace
2. Worktree location: `.worktrees/debug-{slug}`
3. Record worktree path in living doc: `worktree: ".worktrees/debug-{slug}"`
4. All subsequent work happens in the worktree

If flag not provided:
- Set `worktree: null` in living doc
- Work happens in main working directory

#### Step 6: Create Living Document

1. Read the living doc template from `templates/debug-loop/living-doc.md`
   - First check project override: `{project}/templates/debug-loop/living-doc.md`
   - Fall back to plugin: `{plugin}/templates/debug-loop/living-doc.md`

2. Create living doc at `.claude/debug-loop-{slug}.md` with:

```yaml
---
# Identity
bug_slug: "{slug}"
bug_file: "backlog/tasks/bug-{slug}.md"
project_root: "{absolute_project_path}"
started_at: "{ISO_timestamp}"
depth: "{depth}"
worktree: null  # or path if --worktree

# Loop Control
active: true
phase: "systematic-debug"
phase_iteration: 1
max_phase_iterations: 5
total_iterations: 1

# Exit Criteria (generated in Step 3)
exit_criteria:
  # ... all generated criteria

# Human Checkpoints
awaiting_human_review: true
human_checkpoints:
  - after: "phase-0-init"
    reason: "Approve exit criteria before loop begins"
  - after: "architecture"
    reason: "Approve architecture decisions"
    condition: "depth == full"
  - after: "verify"
    reason: "Confirm bug is actually fixed"

# Artifact Paths (resolved in Step 4)
paths:
  # ... all resolved paths

# Tracking
files_modified: []
decisions: []
history: []
---

## Current Phase Instructions

<!-- Will be injected by /debug-loop resume -->

## Phase Log

<!-- Append-only log of what happened each iteration -->
```

#### Step 7: Display Exit Criteria for Human Approval

Set `awaiting_human_review: true` in the living doc, then display:

```
**Debug Loop Initialized**

| Field | Value |
|-------|-------|
| Bug | {slug} |
| Depth | {depth} |
| Worktree | {worktree path or "none"} |
| Living Doc | .claude/debug-loop-{slug}.md |

**Exit Criteria for Approval:**

Phase 1 - Systematic Debug:
- Description: {description}
- Evidence required: {list}

Phase 2 - Write Tests:
- Description: {description}
- Evidence required: {list}

[... continue for all phases ...]

**Action Required:** Review the exit criteria above.
- If they look correct, say "approved" to begin the debug loop
- If changes needed, describe what to modify

After approval, run `/debug-loop resume` to begin Phase 1.
```

**STOP HERE** — Do not proceed until human approves exit criteria.

---

## `/claude-code-skills:debug-loop resume`

Continue an active debug loop from its current state.

### Instructions for Claude

**CRITICAL: Create a TodoWrite checklist with steps 1-5 before starting. Mark each in_progress/completed as you go.**

#### Step 1: Find Active Loop

1. Search for living doc: `Glob(".claude/debug-loop-*.md")`
2. If no files found:
   - Error: "No active debug loop found. Start one with `/debug-loop init --bug <slug> --depth <depth>`"
3. If multiple files found:
   - List them with bug slugs
   - Ask user which one to resume
4. If exactly one found, proceed with that file

#### Step 2: Parse Living Document

1. Read the living doc file
2. Parse YAML frontmatter to extract:
   - `bug_slug` — The bug being fixed
   - `depth` — Workflow depth
   - `phase` — Current phase name
   - `phase_iteration` — Current iteration within phase
   - `max_phase_iterations` — Max attempts before escalation
   - `awaiting_human_review` — Whether blocked on human
   - `exit_criteria` — Criteria for each phase
   - `paths` — All artifact paths
   - `files_modified` — Files changed so far
   - `history` — Phase completion history

#### Step 3: Check Human Review Status

If `awaiting_human_review: true`:

1. Check what review is pending (look at last `human_checkpoints` triggered)
2. Display status:

```
**Awaiting Human Review**

| Field | Value |
|-------|-------|
| Bug | {bug_slug} |
| Phase | {phase} |
| Reason | {checkpoint reason} |

Please provide your review/approval to continue.
```

3. **STOP** — Wait for human input
4. After human approval:
   - Set `awaiting_human_review: false`
   - Update living doc
   - Proceed to Step 4

#### Step 4: Load Phase Instructions

1. Determine current phase from living doc
2. Load phase template from `templates/debug-loop/phases/{phase}.md`
   - First check project override: `{project}/templates/debug-loop/phases/{phase}.md`
   - Fall back to plugin: `{plugin}/templates/debug-loop/phases/{phase}.md`
3. Inject template content into the "Current Phase Instructions" section of living doc

Phase template locations:
| Phase | Template File |
|-------|---------------|
| systematic-debug | `phases/systematic-debug.md` |
| write-tests | `phases/write-tests.md` |
| architecture | `phases/architecture.md` |
| write-plan | `phases/write-plan.md` |
| uat | `phases/uat.md` |
| implement | `phases/implement.md` |
| code-review | `phases/code-review.md` |
| fix-feedback | `phases/fix-feedback.md` |
| update-docs | `phases/update-docs.md` |
| verify | `phases/verify.md` |

#### Step 5: Execute Phase Instructions

1. Display phase entry:

```
**Resuming Debug Loop**

| Field | Value |
|-------|-------|
| Bug | {bug_slug} |
| Phase | {phase} |
| Iteration | {phase_iteration} / {max_phase_iterations} |

**Phase Goal:** {exit_criteria[phase].description}

**Evidence Required:**
{list exit_criteria[phase].evidence_required}

Beginning phase execution...
```

2. Follow the loaded phase template instructions exactly
3. The phase template will specify:
   - What skill to invoke (e.g., `/systematic-debugging`)
   - What artifact to create
   - What verification to perform
   - When to update the living doc
   - When to transition to next phase

4. After phase execution:
   - Update `files_modified` if any files changed
   - Append to `history` array with phase outcome
   - Check exit criteria — if met, transition to next phase
   - If not met and iterations < max, increment `phase_iteration`
   - If max iterations exceeded, block for human intervention

5. Check for human checkpoints:
   - If current phase has a human checkpoint defined, set `awaiting_human_review: true`

---

## `/claude-code-skills:debug-loop status`

Show the current state of an active debug loop.

### Instructions for Claude

#### Step 1: Find Active Loop

1. Search for living doc: `Glob(".claude/debug-loop-*.md")`
2. If no files found:
   - Display: "No active debug loop. Start one with `/debug-loop init --bug <slug> --depth <depth>`"
   - Exit
3. If multiple files found, list all with summary table
4. If exactly one, proceed with that file

#### Step 2: Parse Living Document

1. Read and parse YAML frontmatter
2. Extract all status-relevant fields

#### Step 3: Display Status Table

```
**Debug Loop Status**

| Field | Value |
|-------|-------|
| Bug | {bug_slug} |
| Bug Task | {paths.bug_task} |
| Depth | {depth} |
| Phase | {phase} |
| Iteration | {phase_iteration} / {max_phase_iterations} |
| Total Iterations | {total_iterations} |
| Status | {active ? "Active" : "Inactive"} |
| Awaiting Review | {awaiting_human_review ? "Yes" : "No"} |
| Worktree | {worktree or "none"} |
| Started | {started_at} |
```

#### Step 4: Show Phase Progress

Display phases with checkmarks based on depth and history:

```
**Phase Progress:**

[x] Phase 0: Initialize
[x] Phase 1: Systematic Debug
[ ] Phase 2: Write Tests        <-- CURRENT
[ ] Phase 3: Implementation Plan
[ ] Phase 4: UAT                 (standard/full only)
[ ] Phase 5: Implement
[ ] Phase 6: Code Review
[ ] Phase 7: Update Docs         (standard/full only)
[ ] Phase 8: E2E Verify
```

Mark phases as:
- `[x]` — Completed (in history)
- `[ ]` — Pending
- `<-- CURRENT` — Active phase
- `(skipped)` — Not applicable for this depth

#### Step 5: List Files Modified

```
**Files Modified:**
- src/components/Player.tsx
- src/utils/playlist.ts
- tests/player/playback-crash.test.ts

(or "No files modified yet" if empty)
```

#### Step 6: Show Recent History

Display last 3 entries from history array:

```
**Recent History:**

| Phase | Started | Completed | Iterations | Outcome |
|-------|---------|-----------|------------|---------|
| systematic-debug | 10:05 | 10:30 | 2 | Root cause: null check missing |
| write-tests | 10:31 | 10:45 | 1 | Test file created, fails as expected |
```

If no history yet: "No phase history yet."

---

## File Locations

| Item | Location |
|------|----------|
| Living doc | `{project}/.claude/debug-loop-{slug}.md` |
| Templates (plugin) | `{plugin}/templates/debug-loop/` |
| Templates (project override) | `{project}/templates/debug-loop/` |
| Phase prompts | `templates/debug-loop/phases/{phase}.md` |
| Worktrees | `{project}/.worktrees/debug-{slug}/` |

---

## Phase Flow

```
                              +------------------+
                              |  Phase 0: Init   |
                              | /debug-loop init |
                              +--------+---------+
                                       |
                                       v
                              +------------------+
                              | Human Checkpoint |
                              | (approve criteria)|
                              +--------+---------+
                                       |
                                       v
                              +------------------+
                              | Phase 1: Debug   |
                              | /systematic-debug|
                              +--------+---------+
                                       |
                                       v
                              +------------------+
                              | Phase 2: Tests   |
                              | /tdd (test only) |
                              +--------+---------+
                                       |
                          +------------+------------+
                          |                         |
                    depth=full               depth=minimal/standard
                          |                         |
                          v                         |
                  +------------------+              |
                  | Phase 3a: Arch   |              |
                  | /brainstorming   |              |
                  +--------+---------+              |
                          |                         |
                          | Human Checkpoint        |
                          v                         |
                          +------------+------------+
                                       |
                                       v
                              +------------------+
                              | Phase 3b: Plan   |
                              | /write-plan      |
                              +--------+---------+
                                       |
                          +------------+------------+
                          |                         |
                   depth=standard/full        depth=minimal
                          |                         |
                          v                         |
                  +------------------+              |
                  | Phase 3c: UAT    |              |
                  | /uat             |              |
                  +--------+---------+              |
                          |                         |
                          +------------+------------+
                                       |
                                       v
                              +------------------+
                              | Phase 4: Impl    |
                              | /executing-plans |
                              +--------+---------+
                                       |
                                       v
                              +------------------+
                              | Phase 5: Review  |<----+
                              | /code-review     |     |
                              +--------+---------+     |
                                       |               |
                             +---------+---------+     |
                             |                   |     |
                          approved            issues   |
                             |                   |     |
                             |                   v     |
                             |         +------------------+
                             |         | Phase 6: Fix FB  |
                             |         +--------+---------+
                             |                   |
                             |                   +-----+
                             |
                          +--+------------+------------+
                          |                            |
                   depth=standard/full           depth=minimal
                          |                            |
                          v                            |
                  +------------------+                 |
                  | Phase 7: Docs    |                 |
                  +--------+---------+                 |
                          |                            |
                          +------------+---------------+
                                       |
                                       v
                              +------------------+
                              | Phase 8: Verify  |
                              | /test-feature    |
                              +--------+---------+
                                       |
                              +--------+---------+
                              |                  |
                            pass               fail
                              |                  |
                              v                  v
                      +-------------+    +------------------+
                      |Human Review |    | Create new bug   |
                      |(confirm fix)|    | Loop to Phase 1  |
                      +------+------+    +------------------+
                             |
                             v
                      +-------------+
                      | Loop Done   |
                      +-------------+
```

---

## Integration with Other Skills

| Phase | Skill Invoked | Artifact Created |
|-------|---------------|------------------|
| 1 | `/systematic-debugging --output {path}` | debug-findings doc |
| 2 | `/test-driven-development --test-file {path}` | reproduction test |
| 3a | `/brainstorming --mode architecture --output {path}` | architecture doc |
| 3b | `/write-plan --output {path}` | implementation plan |
| 3c | `/uat --output-prefix {path}` | UAT spec + checklist |
| 4 (minimal) | `/executing-plans` | source files |
| 4 (std/full) | `/subagent-driven-development` | source files |
| 5 | `/code-review` | (inline feedback) |
| 8 | `/test-feature --results {path}` | test results doc |

---

## Examples

### Example 1: Initialize a minimal debug loop

```
User: /debug-loop init --bug playback-crash-on-empty --depth minimal

Claude: Validating bug task...
Found: backlog/tasks/bug-playback-crash-on-empty.md

**Debug Loop Initialized**

| Field | Value |
|-------|-------|
| Bug | playback-crash-on-empty |
| Depth | minimal |
| Worktree | none |
| Living Doc | .claude/debug-loop-playback-crash-on-empty.md |

**Exit Criteria for Approval:**

Phase 1 - Systematic Debug:
- Description: Identify why playback crashes when playlist array is empty
- Evidence required:
  - Stack trace showing crash location
  - Confirmed reproduction steps
  - Root cause hypothesis validated

Phase 2 - Write Tests:
- Description: Create test that crashes with empty playlist, passes with non-empty
- Evidence required:
  - Test file exists
  - Test fails with expected error

[... remaining phases ...]

**Action Required:** Review the exit criteria above.
Say "approved" to begin, or describe changes needed.
```

### Example 2: Resume an active loop

```
User: /debug-loop resume

Claude: Found active loop: debug-loop-playback-crash-on-empty.md

**Resuming Debug Loop**

| Field | Value |
|-------|-------|
| Bug | playback-crash-on-empty |
| Phase | write-tests |
| Iteration | 1 / 5 |

**Phase Goal:** Create test that crashes with empty playlist

**Evidence Required:**
- Test file exists
- Test fails with expected error

Beginning phase execution...

[Loads and executes phase template]
```

### Example 3: Check status

```
User: /debug-loop status

Claude: **Debug Loop Status**

| Field | Value |
|-------|-------|
| Bug | playback-crash-on-empty |
| Depth | minimal |
| Phase | implement |
| Iteration | 2 / 5 |
| Total Iterations | 8 |
| Status | Active |
| Awaiting Review | No |

**Phase Progress:**

[x] Phase 0: Initialize
[x] Phase 1: Systematic Debug
[x] Phase 2: Write Tests
[x] Phase 3: Implementation Plan
[ ] Phase 4: Implement              <-- CURRENT
[ ] Phase 5: Code Review
[ ] Phase 6: E2E Verify

**Files Modified:**
- src/components/Player.tsx
- tests/player/playback-crash-on-empty.test.ts

**Recent History:**

| Phase | Completed | Iterations | Outcome |
|-------|-----------|------------|---------|
| systematic-debug | 10:30 | 2 | Root cause: null check missing |
| write-tests | 10:45 | 1 | Test created, fails as expected |
| write-plan | 11:00 | 1 | 3-task implementation plan |
```

---

## Hook Installation

The debug-loop skill uses a Stop hook to enforce phase transitions and re-inject context. To enable this:

Add to your `~/.claude/settings.json` under `hooks.Stop`:

```json
{
  "hooks": [
    {
      "type": "command",
      "command": "node ~/claude-code-skills/hooks/debug-loop-stop.js",
      "timeout": 30
    }
  ]
}
```

The hook:
- Detects active debug loops via `.claude/debug-loop-*.md`
- Validates phase exit criteria
- Re-injects phase prompts if criteria not met
- Blocks if awaiting human review

---

## Troubleshooting

### "No active debug loop found"

Run `/debug-loop init --bug <slug> --depth <depth>` to start a new loop.

### "Bug task not found"

Create the bug task first with `/add --type bug` or manually create `backlog/tasks/bug-{slug}.md`.

### "Max iterations exceeded"

The loop has tried too many times without meeting exit criteria. Human intervention required:
1. Review the living doc to understand what's failing
2. Either manually fix the issue and resume, or
3. Adjust exit criteria if they're unrealistic

### "Multiple active loops found"

Only one debug loop should be active at a time. Either:
1. Delete stale `.claude/debug-loop-*.md` files, or
2. Specify which loop when prompted

### Worktree cleanup

After loop completes, worktree is NOT automatically deleted. To clean up:
1. Use `/finishing-a-development-branch` to merge and clean up, or
2. Manually delete `.worktrees/debug-{slug}/`
