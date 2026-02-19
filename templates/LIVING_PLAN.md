# LIVING_PLAN: [Title]

> **AUTONOMOUS EXECUTION:** Do not pause for user acknowledgment. After context compaction, re-read this document from the top, find the `[CURRENT]` step, and continue executing until all acceptance criteria are met or max iterations reached.

<!--
RALPH LOOP TEMPLATE
===================
This document is the single source of truth for sequential agent iterations.
Each agent reads this fresh, executes ONE step, updates this doc, then exits.
Any agent can resume work from this document alone — no context dependencies.

AGENT CONTRACT:
1. Read this entire document before taking action
2. Execute ONLY the step marked [CURRENT]
3. Update Step Outputs, Discoveries, and Next Action before exiting
4. Never skip ahead or batch multiple steps
5. If blocked, document the blocker and propose resolution
-->

## Metadata

| Field | Value |
|-------|-------|
| **Workflow Type** | `[debugging|feature|refactor|testing|docs|investigation]` |
| **Status** | `[not-started|in-progress|blocked|paused|complete]` |
| **Iteration** | `0` |
| **Max Iterations** | `5` |
| **Created** | YYYY-MM-DD |
| **Last Updated** | YYYY-MM-DD HH:MM |
| **Owner** | [who initiated this workflow] |
| **Project** | [project path] |

<!--
WORKFLOW TYPES:
- debugging: Finding and fixing a specific issue
- feature: Implementing new functionality
- refactor: Restructuring without changing behavior
- testing: Creating or running test suites
- docs: Documentation creation/updates
- investigation: Research or exploration without code changes
-->

---

## Objective

<!-- One clear sentence describing the end goal. -->

**Goal:** [What success looks like in one sentence]

### Acceptance Criteria

<!-- Measurable conditions that prove this is done. Be specific. -->

- [ ] [Criterion 1 - observable/testable outcome]
- [ ] [Criterion 2 - observable/testable outcome]
- [ ] [Criterion 3 - observable/testable outcome]

### Scope Boundaries

<!-- What this workflow explicitly does NOT cover. Prevents scope creep. -->

- Not addressing: [explicitly out of scope item]
- Not addressing: [explicitly out of scope item]

---

## Key Files

<!-- Critical files for this workflow. Updated as discoveries are made. -->

| File | Purpose |
|------|---------|
| [path] | [why it matters] |

---

## Steps

<!--
STEP STATUS MARKERS:
- [DONE] - Completed with verified output
- [CURRENT] - The step this iteration should execute
- [NEXT] - Queued but not started
- [BLOCKED] - Cannot proceed, see Blockers section
- [SKIPPED] - Intentionally bypassed with reason noted

Each step should be atomic — completable in one agent iteration.
Update outputs immediately after execution, not at end of session.
-->

### Step 1: [Step Title]
**Status:** [CURRENT]

**Purpose:** [Why this step exists]

**Inputs:**
- [What this step needs to begin — files, values, prior step outputs]

**Actions:**
- [Specific action to take]
- [Specific action to take]

**Expected Outputs:**
- [What completing this step should produce]

**Actual Outputs:**
<!-- Filled in after execution -->
```
[Paste actual command output, file paths created, values discovered]
```

**Verification:** [How to confirm this step succeeded]

---

### Step 2: [Step Title]
**Status:** [NEXT]

**Purpose:** [Why this step exists]

**Inputs:**
- [Dependencies from prior steps]

**Actions:**
- [Specific action to take]

**Expected Outputs:**
- [What completing this step should produce]

**Actual Outputs:**
```
[To be filled after execution]
```

**Verification:** [How to confirm this step succeeded]

---

<!-- Continue pattern as needed -->

---

## Discoveries

<!--
ACCUMULATED KNOWLEDGE
This section grows across iterations. Never delete entries — only add.
Each discovery should include iteration number for traceability.
-->

| Iteration | Discovery | Impact |
|-----------|-----------|--------|
| 0 | [Initial assumptions or known context] | [How this affects the plan] |
| | | |

<!--
DISCOVERY TYPES:
- Architecture insight: How the system actually works
- Constraint found: Limitation that affects approach
- Assumption invalidated: Something we thought true that isn't
- Tool/API behavior: Unexpected behavior in tooling
- Scope change: New understanding of what's needed
-->

---

## What Failed

<!--
DEAD ENDS - Approaches that didn't work. Prevents retry of known failures.
Never delete — future iterations need to know what NOT to try.
-->

| Iteration | Approach | Why It Failed | Lesson |
|-----------|----------|---------------|--------|
| | | | |

---

## Blockers

<!--
Active blockers that prevent progress on marked [BLOCKED] steps.
Each blocker needs a proposed resolution path.
Move to resolved when fixed (keep historical record).
-->

### Active Blockers

| ID | Blocking Step | Description | Proposed Resolution | Assigned |
|----|---------------|-------------|---------------------|----------|
| B1 | Step N | [What's blocking] | [How to unblock] | [who/what] |

### Resolved Blockers

| ID | Resolution | Iteration Resolved |
|----|------------|-------------------|
| | | |

---

## Next Action

<!--
CRITICAL: This section tells the next iteration exactly what to do.
Must be specific enough that an agent with no prior context can execute.
Update this BEFORE exiting each iteration.
-->

**For Iteration [N+1]:**

1. **Read:** [Specific sections to review]
2. **Execute:** Step [N] — [brief description]
3. **Watch for:** [Potential issues to monitor]
4. **Update:** [What to record after execution]

---

## Iteration Log

<!--
Brief record of what each iteration accomplished.
Helps track velocity and identify patterns.
-->

| Iteration | Timestamp | Step Executed | Outcome | Duration |
|-----------|-----------|---------------|---------|----------|
| 0 | YYYY-MM-DD HH:MM | [Setup/Planning] | [Plan created] | [Xm] |
| | | | | |

---

## Verification Log

<!--
Objective evidence of verification. Test results, not LLM assessment.
Include actual output or link to log files.
-->

| Timestamp | Check | Result | Evidence |
|-----------|-------|--------|----------|
| | | | |

---

## Exit Checklist

<!--
Before exiting, every iteration must verify:
-->

- [ ] Step outputs recorded with actual values (not placeholders)
- [ ] Discoveries section updated if anything learned
- [ ] What Failed section updated if approach didn't work
- [ ] Blockers section updated if stuck
- [ ] Next Action section updated with specific instructions
- [ ] Iteration count incremented in Metadata
- [ ] Last Updated timestamp refreshed
- [ ] Status field reflects current state

---

<!--
INSTANTIATION GUIDE
==================

To use this template:

1. Copy to your project's docs/loops/ directory
2. Rename to: `YYYY-MM-DD-[brief-name].loop.md`
3. Fill in Metadata with workflow type and owner
4. Write clear Objective and Acceptance Criteria
5. Design Steps based on workflow type (see examples below)
6. Mark Step 1 as [CURRENT]
7. Begin first iteration

WORKFLOW-SPECIFIC STEP PATTERNS:

DEBUGGING:
1. Reproduce the issue (capture exact error)
2. Identify root cause (trace code path)
3. Design fix (minimal change approach)
4. Implement fix
5. Verify fix (same repro steps, different outcome)
6. Check for regressions (related functionality)

FEATURE:
1. Understand existing patterns (find similar implementations)
2. Design approach (document before coding)
3. Implement core functionality (minimal viable)
4. Add edge case handling
5. Write/update tests
6. Update documentation
7. Manual verification

REFACTOR:
1. Document current behavior (tests or observations)
2. Identify transformation targets
3. Apply refactoring (preserve semantics)
4. Verify behavior unchanged
5. Clean up (remove dead code, update imports)

TESTING:
1. Identify test coverage gaps
2. Design test cases
3. Implement tests
4. Run and verify green
5. Document coverage changes

INVESTIGATION:
1. Define research questions
2. Gather evidence (code, docs, runtime)
3. Analyze findings
4. Synthesize conclusions
5. Document recommendations
-->
