---
name: loop
description: Initialize and manage Ralph Loop documents for filesystem-centric iterative workflows
---

# /dev-org:loop

Create and manage living plan documents that enable iterative, filesystem-centric workflows. Based on Ralph Loop principles where the filesystem is the single source of truth.

## Core Concept

Every agent reads the loop document fresh, executes ONE step, updates the document, then exits. The document contains enough context for any agent to resume — no conversation history required.

## Subcommands

| Subcommand | Purpose |
|------------|---------|
| `init <mission>` | Create a new loop document |
| `status` | Show current loop state |
| `iterate` | Manually trigger next iteration |
| `close` | Complete and archive the loop |

Default (no subcommand): Same as `init`.

---

## `/dev-org:loop init`

Create a new loop document for a mission.

### Instructions for Claude

**CRITICAL: Create a TodoWrite checklist with steps 1-6 before starting. Mark each in_progress/completed as you go.**

#### Step 1: Clarify the Mission

Ask the user to describe what they want to accomplish:

> What's the mission? Describe what success looks like in one sentence.

If the user already provided a mission (e.g., `/dev-org:loop init Fix the export bug`), use that.

#### Step 2: Determine Workflow Type

Present options:

> What type of workflow is this?
>
> 1. **debugging** - Finding and fixing a specific issue
> 2. **feature** - Implementing new functionality
> 3. **refactor** - Restructuring without changing behavior
> 4. **testing** - Creating or running test suites
> 5. **docs** - Documentation creation/updates
> 6. **investigation** - Research without code changes

#### Step 3: Define Acceptance Criteria

Ask for measurable completion criteria:

> What are the acceptance criteria? How will we know this is done?
>
> These should be specific and testable (e.g., "All unit tests pass", "Export completes without error", "Page loads in under 2s").

Suggest criteria based on workflow type if user is unsure.

#### Step 4: Identify Key Files

Ask about relevant files:

> What files are relevant to this work? (I can help identify them if you're not sure)

If user is unsure, offer to search:
- Use Grep/Glob to find relevant files based on the mission
- Present findings for confirmation

#### Step 5: Design Steps

Based on workflow type, propose steps using the patterns from the template:

**For debugging:**
1. Reproduce the issue
2. Identify root cause
3. Design fix
4. Implement fix
5. Verify fix
6. Check for regressions

**For feature:**
1. Understand existing patterns
2. Design approach
3. Implement core functionality
4. Add edge case handling
5. Write/update tests
6. Manual verification

**For refactor:**
1. Document current behavior
2. Identify transformation targets
3. Apply refactoring
4. Verify behavior unchanged
5. Clean up

**For testing:**
1. Identify coverage gaps
2. Design test cases
3. Implement tests
4. Run and verify green

**For investigation:**
1. Define research questions
2. Gather evidence
3. Analyze findings
4. Synthesize conclusions

Present proposed steps and ask for confirmation/modifications.

#### Step 6: Create the Loop Document

1. Read the template from `templates/LIVING_PLAN.md`
2. Copy to project's `docs/loops/YYYY-MM-DD-<slug>.loop.md`
3. Fill in:
   - Metadata (workflow type, status=in-progress, iteration=1)
   - Objective and acceptance criteria
   - Key files
   - Steps (mark Step 1 as [CURRENT])
   - Initial discoveries (any known context)
   - Next Action for iteration 1

4. Display confirmation:

> **Loop initialized:** `docs/loops/YYYY-MM-DD-<slug>.loop.md`
>
> **Mission:** [mission]
> **Type:** [workflow type]
> **Steps:** [count]
> **First step:** [step 1 title]
>
> To begin: Read the loop document and execute Step 1.
> After each step: Update the document before exiting.
> To check status: `/dev-org:loop status`

---

## `/dev-org:loop status`

Show the current state of an active loop.

### Instructions for Claude

1. Find active loop documents in `docs/loops/*.loop.md` (exclude archived)
2. If multiple active loops exist, list them and ask which one
3. Parse the loop document and display:

> **Loop Status:** [filename]
>
> | Field | Value |
> |-------|-------|
> | Mission | [goal] |
> | Status | [status] |
> | Iteration | [n] / [max] |
> | Current Step | [step name] |
> | Blockers | [count or "none"] |
>
> **Progress:**
> - [DONE] Step 1: [name]
> - [CURRENT] Step 2: [name]
> - [NEXT] Step 3: [name]
>
> **Next Action:** [from document]

---

## `/dev-org:loop iterate`

Manually trigger the next iteration (usually done when tests fail or verification shows issues).

### Instructions for Claude

1. Find the active loop document
2. Increment the iteration counter
3. Check if iteration > max_iterations
   - If yes: Mark loop as failed, suggest `/dev-org:handoff`
4. Update the Iteration Log with trigger reason
5. Reset appropriate steps based on failure point:
   - Test failure → reset to implementation step
   - Review rejection → reset to fix step
6. Update Next Action for new iteration
7. Display summary of what changed

---

## `/dev-org:loop close`

Complete and archive a loop.

### Instructions for Claude

1. Find the active loop document
2. Verify all acceptance criteria are checked
   - If not all checked, warn and confirm user wants to close anyway
3. Update document:
   - Status → complete
   - Last Updated timestamp
   - Add final entry to Iteration Log
4. Rename file to add `-archived` suffix
5. Display summary:

> **Loop closed:** [filename]
>
> **Final State:**
> - Iterations: [count]
> - Duration: [first timestamp] → [now]
> - Acceptance Criteria: [x/y met]
>
> Archived to: `[new filename]`

---

## File Locations

- **Template:** `templates/LIVING_PLAN.md`
- **Active loops:** `{PROJECT}/docs/loops/*.loop.md`
- **Archived loops:** `{PROJECT}/docs/loops/*-archived.loop.md`

## Agent Contract (Reference)

Every agent working on a loop step must:

**On Start:**
1. Read entire loop document
2. Find step marked `[CURRENT]`
3. Load context from Discoveries and Key Files

**During Execution:**
1. Execute ONLY the current step
2. Append to Discoveries if anything learned
3. If blocked, document blocker and STOP

**On Exit:**
1. Update step with actual outputs
2. Mark step [DONE] and next step [CURRENT]
3. Update Next Action for next iteration
4. Increment iteration count
5. Update Last Updated timestamp
6. Complete Exit Checklist

---

## Integration with Other Skills

| Scenario | Integration |
|----------|-------------|
| Loop fails (max iterations) | Generate handoff with `/dev-org:handoff` |
| Continuing from handoff | If handoff references a loop, resume via `/dev-org:loop status` |
| Creating acceptance criteria | Can use `/dev-org:uat` to generate detailed test criteria |
| Failure analysis | Use `/dev-org:retro` after loop failure |

---

## Examples

### Example 1: Initialize a debugging loop

User: `/dev-org:loop init Fix the HEVC export bug`

Response:
> I'll create a debugging loop for fixing the HEVC export bug.
>
> **Mission:** Fix the HEVC export bug
> **Workflow Type:** debugging
>
> What are the acceptance criteria? How will we know this is fixed?

User: "HEVC videos export successfully without hanging"

> Got it. Let me identify key files...
>
> [Searches codebase for export/HEVC related files]
>
> I found these relevant files:
> - `src/lib/ffmpeg-client.ts` - FFmpeg operations
> - `src/lib/video-frame-pipeline.ts` - Export orchestration
> - `src/components/ClipReview.tsx` - Export UI
>
> Here are the proposed steps:
>
> 1. Reproduce the issue (capture exact error)
> 2. Identify root cause (trace code path)
> 3. Design fix (document approach)
> 4. Implement fix
> 5. Verify fix (HEVC export completes)
> 6. Check for regressions (H.264 still works)
>
> Does this look right?

User: "Yes"

[Creates loop document, displays confirmation]

### Example 2: Check loop status

User: `/dev-org:loop status`

Response:
> **Loop Status:** 2026-02-01-hevc-export-fix.loop.md
>
> | Field | Value |
> |-------|-------|
> | Mission | Fix the HEVC export bug |
> | Status | in-progress |
> | Iteration | 2 / 5 |
> | Current Step | Step 4: Implement fix |
> | Blockers | none |
>
> **Progress:**
> - [DONE] Step 1: Reproduce the issue
> - [DONE] Step 2: Identify root cause
> - [DONE] Step 3: Design fix
> - [CURRENT] Step 4: Implement fix
> - [NEXT] Step 5: Verify fix
> - [NEXT] Step 6: Check for regressions
>
> **Next Action:** Implement selective HEVC transcoding in ffmpeg-client.ts

### Example 3: Close a completed loop

User: `/dev-org:loop close`

Response:
> Checking acceptance criteria for 2026-02-01-hevc-export-fix.loop.md...
>
> - [x] HEVC videos export successfully
> - [x] Progress bar shows transcoding phase
> - [x] All existing tests pass
>
> All criteria met!
>
> **Loop closed:** 2026-02-01-hevc-export-fix.loop.md
>
> **Final State:**
> - Iterations: 2
> - Duration: 2026-02-01 09:00 → 2026-02-01 14:30
> - Acceptance Criteria: 3/3 met
>
> Archived to: `docs/loops/2026-02-01-hevc-export-fix-archived.loop.md`
