---
name: retro
description: Use when something goes wrong during a session — failure analysis with 5-Whys root cause investigation
---

# /claude-code-skills:retro

Failure analysis skill for in-session incidents. When something goes wrong — Claude makes a mistake, a process fails, you catch an error — invoke retro while context is fresh.

## Configuration

This skill reads `.dev-org.yaml` from the project root if present. If no config file exists, default paths are used.

**Config variables used:**
- `{REFERENCE_PATH}` — Base path for reference layer (default: `reference/`)
- `{BACKLOG_PATH}` — Path for task files (default: `backlog/tasks/`)
- `{POSTMORTEMS_PATH}` — Path for postmortem files (default: `docs/postmortems/`)

## When to Use

Use this skill when:
- **Claude made a mistake** — Wrong output, incorrect assumption, bad recommendation
- **A process failed** — Skill didn't work as expected, automation broke, integration failed
- **You caught an error** — Something that would have caused problems if not caught
- **A pattern repeated** — Same type of failure happened again

**What it's NOT:**
- Not for general learnings (that's `/claude-code-skills:review`)
- Not for post-session reflection (retro needs live session context)
- Not for project retrospectives (this is incident-level, not project-level)

**Rule of thumb:**
- Session went well, captured some insights → `/claude-code-skills:review`
- Something broke and you want to understand why → `/claude-code-skills:retro`

---

## Instructions for Claude

When this skill is invoked, follow these steps exactly.

**CRITICAL: Before starting, create a TodoWrite checklist with all 7 steps below. Mark each step in_progress before starting it and completed after finishing it. Do not skip steps or reorder them.**

### Step 0: Load Configuration

Before starting, check for `.dev-org.yaml` in the project root:
- If found, read and use configured values
- If not found, use defaults:
  - `{REFERENCE_PATH}` → `reference/`
  - `{BACKLOG_PATH}` → `backlog/tasks/`
  - `{POSTMORTEMS_PATH}` → `docs/postmortems/`

### Step 1: Immediate Analysis

**Launch directly into analysis — no preamble.**

Analyze the current session context and identify the failure:

1. What specifically went wrong?
2. What was the expected outcome vs. actual outcome?
3. What was the immediate cause?

**Output format — jump straight to the first "why":**

> **Failure identified:** [What went wrong]
>
> **Why #1:** Why did [specific failure] happen?
> → **Proposed answer:** Because [immediate cause based on session context]
>
> Is this accurate, or should I adjust?

**Do NOT ask** "What went wrong?" — you observed the session. Propose based on context.

---

### Step 2: 5-Whys Chain

Drive both the questions AND the answers. The user confirms, corrects, or adds nuance.

**Pattern for each iteration:**

> **Why #[N]:** Why did [previous answer] happen?
> → **Proposed answer:** Because [deeper cause]
>
> Confirm, correct, or add nuance?

**Continue until:**
- You reach a root cause (something actionable, not "because humans make mistakes")
- The user indicates the root cause has been found
- You've completed 5 iterations (typical max)

**Root cause indicators:**
- It's something that can be prevented with a process/skill/rule change
- It's a behavioral pattern, not a one-time mistake
- Further "why" questions would be circular or philosophical

**Example 5-Whys chain:**

```
Why #1: Why did the segment extraction produce corrupt video?
→ Because we used File.slice() to extract bytes directly

Why #2: Why did we use File.slice() instead of proper video tools?
→ Because I assumed byte-level operations would preserve video playability

Why #3: Why did I assume that without verifying?
→ Because I focused on making the code run without errors, not on whether the output was valid

Why #4: Why didn't I verify the output format requirements?
→ Because I was in "implementation mode" and didn't switch to "verification mode"

ROOT CAUSE: Implementation focus checked "does it run?" but not "does it work?"
The fix is adding a verification step for output validity, not just execution success.
```

---

### Step 3: Pattern Check

After reaching root cause, scan for matching patterns:

**Files to check:**
- `{REFERENCE_PATH}/lessons/lessons.md` — Previous learnings
- `{POSTMORTEMS_PATH}/*.md` — Previous postmortems (if directory exists)

**Search for:**
- Same root cause or similar phrasing
- Same category of failure (e.g., verification failures, assumption failures)
- Same affected area (e.g., same skill, same workflow)

**If pattern found:**

> **Pattern detected:** This matches the [date] lesson about "[lesson title]"
>
> The previous fix was: [what was supposed to change]
>
> This suggests the fix didn't stick. Recommending escalation to a stronger intervention.

**If no pattern:**

> **No matching pattern found** — This appears to be a new failure mode.

---

### Step 4: Escalation Decision

Evaluate whether this warrants a full postmortem based on these criteria:

| Criterion | Question | If Yes → |
|-----------|----------|----------|
| **Pattern** | Has this same failure happened before? | Escalate |
| **Structural** | Does the fix require changing a skill, workflow, or CLAUDE.md? | Escalate |
| **Impact** | Was significant time wasted or wrong output delivered? | Escalate |

**Present the evaluation:**

> **Escalation evaluation:**
> - Pattern: [Yes/No] — [reason]
> - Structural: [Yes/No] — [reason]
> - Impact: [Yes/No] — [reason]
>
> **Recommendation:** [Escalate to full postmortem / Keep lightweight]
>
> Do you want to escalate, or keep this as a lesson only?

Wait for user decision before proceeding.

---

### Step 5: Output

Generate the appropriate outputs based on escalation decision.

#### 5a: Lesson Entry (Always)

Add an entry to `{REFERENCE_PATH}/lessons/lessons.md` under the `## Future Learnings` section:

```markdown
### [YYYY-MM-DD] - [Brief Context]

- **Learning**: [What behavioral approach failed and what to do differently]
- **Concrete Example**: [The specific interaction that surfaced this — be specific enough to replay]
- **Application**: [How to behave differently going forward]
```

**Lesson quality checklist:**
- Is it about *behavior/approach*, not documentation trivia?
- Does the concrete example describe a specific moment, not a vague situation?
- Is the application actionable, not just "be more careful"?

#### 5b: Backlog Task (If fix needed)

If the fix requires implementation work (updating a skill, changing a workflow, adding a check), create a task file at `{BACKLOG_PATH}/<slug>.md`:

```markdown
# [Task Title]

## Status
- **Priority:** P2
- **Status:** pending

## Description
[What needs to change and why]

## Context
- **From retro:** [date]
- **Root cause:** [one-line summary]

## Acceptance Criteria
- [ ] [Specific, verifiable outcome]
```

#### 5c: Full Postmortem (If escalated)

If escalation was accepted, create `{POSTMORTEMS_PATH}/YYYY-MM-DD-<topic>.md`:

```markdown
# Postmortem: [Brief Title]

**Date:** YYYY-MM-DD
**Severity:** [Low / Medium / High]
**Status:** [Action items pending / Complete]

## Summary
One paragraph describing what happened.

## Impact
- Time lost: [estimate]
- Work affected: [what had to be redone/discarded]
- Downstream effects: [if any]

## Root Causes
The 5-Whys chain that was just completed, formatted as a numbered list showing the causal chain.

1. [First why and answer]
2. [Second why and answer]
3. [Continue to root cause]

## Timeline
Bullet points of key events with approximate timestamps:
- [time] — What happened
- [time] — What was tried
- [time] — When failure was recognized

## Resolution
How the immediate issue was addressed (if applicable).

## Generalized Learning
What broader principle does this failure reveal? How can we generalize beyond this specific incident to improve our systems, workflows, or approaches? This is the transferable insight that applies to future, unrelated situations.

## Action Items
| Action | Owner | Priority | Status |
|--------|-------|----------|--------|
| [What needs to change] | [Claude/User] | [P1/P2/P3] | [ ] |

## Related
- Links to related lessons in lessons.md
- Links to backlog tasks created
- Links to previous postmortems if this is a recurring pattern
```

#### 5d: CLAUDE.md Promotion (If warranted)

**Promotion triggers:**
- Pattern detected (same failure happened twice)
- High impact (significant time loss or wrong deliverable)
- Universal rule (applies broadly, not just to specific contexts)

If any trigger is met, propose adding a concise rule to CLAUDE.md:

> **Promotion recommended:** This lesson should be added to CLAUDE.md for guaranteed visibility.
>
> Proposed rule: "[One-line behavioral rule derived from the Application section]"
>
> Add to CLAUDE.md?

If accepted, add to the appropriate section in CLAUDE.md.

---

### Step 6: Verify and Exit

#### 6a: Verify Changes (REQUIRED)

After writing to each file:

1. Read back the modified file
2. Display the relevant section showing the new content
3. Confirm the changes match what was intended

**Verification output format:**

> **Verification - `{REFERENCE_PATH}/lessons/lessons.md` after update:**
>
> ```markdown
> ### 2026-01-30 - [Title]
> - **Learning**: ...
> - **Concrete Example**: ...
> - **Application**: ...
> ```
>
> Changes confirmed.

Repeat for each file modified (lesson, task, postmortem, CLAUDE.md).

#### 6b: Commit to Git

Commit all changes with a descriptive message:

```
Retro: [Brief description of failure]

Root cause: [one-line summary]
Files updated:
- [list of files]
```

#### 6c: Exit Summary

Present the summary and offer next steps:

> **Retro Complete**
>
> **Root cause:** [one-line summary]
>
> **Captured:**
> - [x] Lesson in `{REFERENCE_PATH}/lessons/lessons.md`
> - [x/—] Backlog task in `{BACKLOG_PATH}/[name].md` (if created)
> - [x/—] Postmortem in `{POSTMORTEMS_PATH}/[name].md` (if escalated)
> - [x/—] Rule added to CLAUDE.md (if promoted)
>
> Committed with message: "[commit message]"
>
> Ready to continue with [previous task], or implement the fix now?

---

## File Paths

All file paths in this skill are relative to the dev-org repo root.

## Files Read

- `{REFERENCE_PATH}/lessons/lessons.md` — Check for pattern matches
- `{POSTMORTEMS_PATH}/*.md` — Check for recurring incidents
- Session context — The failure being analyzed

## Files Written

- `{REFERENCE_PATH}/lessons/lessons.md` — New lesson entry (always)
- `{BACKLOG_PATH}/<slug>.md` — Backlog task (if fix needed)
- `{POSTMORTEMS_PATH}/YYYY-MM-DD-<topic>.md` — Full postmortem (if escalated)
- `CLAUDE.md` — Promoted rule (if warranted)

## Integrations

- **Git** — Commit all changes with descriptive message

---

## Error Handling

- **If `{POSTMORTEMS_PATH}/` doesn't exist:** Create it before writing the postmortem file.
- **If the user can't articulate the failure:** Propose based on session context. Say "Based on what I observed, the failure was [X]. Is that what we're analyzing?"
- **If no clear root cause emerges after 5 whys:** Stop and note "Root cause unclear — may need more investigation or this may be a one-time occurrence."
- **If pattern check finds ambiguous matches:** Present the potential matches and ask user to confirm relevance.
- **If git commit fails:** Inform the user and suggest manual commit.

---

## Examples

### Example 1: Simple failure with lesson only

User: `/claude-code-skills:retro`

*Context: Claude just declared a feature "done" but the user found it wasn't actually working when tested.*

Response:

> **Failure identified:** Declared segment extraction feature complete, but output files were corrupt and unplayable.
>
> **Why #1:** Why were the output files corrupt?
> → **Proposed answer:** Because File.slice() was used to extract bytes directly from the video file, which doesn't preserve video container structure.
>
> Is this accurate, or should I adjust?

User: "Yes, that's right"

> **Why #2:** Why did we use File.slice() instead of proper video tools?
> → **Proposed answer:** Because I assumed byte-level operations would produce valid video without verifying format requirements.
>
> Confirm, correct, or add nuance?

User: "Correct"

> **Why #3:** Why wasn't the output format verified?
> → **Proposed answer:** Because the verification check was "does the code run without errors" rather than "is the output actually valid."
>
> Confirm?

User: "Yes, that's the root cause"

> **No matching pattern found** — This appears to be a new failure mode.
>
> **Escalation evaluation:**
> - Pattern: No — First occurrence of this specific failure
> - Structural: No — Fix is behavioral (verify outputs), not a skill change
> - Impact: Yes — Significant time spent on broken implementation
>
> **Recommendation:** Keep lightweight (lesson only), but the impact suggests we should capture this thoroughly.
>
> Do you want to escalate, or keep this as a lesson only?

User: "Lesson only is fine"

[Writes lesson to lessons.md, verifies, commits]

> **Retro Complete**
>
> **Root cause:** Verification checked "does it run?" but not "does the output work?"
>
> **Captured:**
> - [x] Lesson in `{REFERENCE_PATH}/lessons/lessons.md`
> - [—] Backlog task (not needed)
> - [—] Postmortem (not escalated)
>
> Committed with message: "Retro: Video segment extraction produced corrupt output"
>
> Ready to continue with the segment extraction fix, or work on something else?

---

### Example 2: Pattern detected with escalation

User: `/claude-code-skills:retro`

*Context: Claude asked "What went well?" during a review instead of proposing learnings from session context.*

Response:

> **Failure identified:** During `/claude-code-skills:review`, asked open-ended questions ("What was challenging?") instead of proposing learnings based on session context.
>
> **Why #1:** Why did I ask questions instead of proposing?
> → **Proposed answer:** Because the default behavior is to gather information rather than synthesize what I already observed.
>
> Is this accurate?

User: "Yes"

> **Why #2:** Why is "gather information" the default when I have full session context?
> → **Proposed answer:** Because interrogation feels thorough, even when it's actually placing the cognitive burden on the user.
>
> Confirm?

User: "Exactly"

> **Why #3:** Why didn't the existing lesson about this change the behavior?
> → **Proposed answer:** Because lessons in lessons.md aren't guaranteed to be read — they only influence behavior if the current skill happens to reference them.
>
> **ROOT CAUSE:** Lessons in the reference layer don't automatically change behavior. The fix needs stronger enforcement.

> **Pattern detected:** This matches the 2026-01-28 lesson about "Review Skill Friction" — "should infer from session context rather than requiring user to recall and articulate everything."
>
> The previous fix was: "Skills should propose based on available context, then confirm"
>
> This is the second occurrence. The lesson didn't stick.

> **Escalation evaluation:**
> - Pattern: **Yes** — Same failure happened before (2026-01-28)
> - Structural: **Yes** — Fix requires updating review skill definition
> - Impact: Yes — User friction on every review invocation
>
> **Recommendation:** Escalate to full postmortem. This is a recurring pattern that needs structural intervention.
>
> Do you want to escalate?

User: "Yes, escalate"

[Writes lesson, creates backlog task, generates postmortem, proposes CLAUDE.md promotion]

> **Promotion recommended:** This lesson should be added to CLAUDE.md for guaranteed visibility.
>
> Proposed rule: "When running any skill that captures learnings, propose specific entries based on session context first — never start with open-ended questions."
>
> Add to CLAUDE.md?

User: "Yes"

[Adds rule to CLAUDE.md, verifies all files, commits]

> **Retro Complete**
>
> **Root cause:** Lessons in reference layer don't guarantee behavioral change; recurring failures need CLAUDE.md enforcement.
>
> **Captured:**
> - [x] Lesson in `{REFERENCE_PATH}/lessons/lessons.md`
> - [x] Backlog task in `{BACKLOG_PATH}/review-skill-interrogation-fix.md`
> - [x] Postmortem in `{POSTMORTEMS_PATH}/2026-01-30-review-skill-interrogation.md`
> - [x] Rule added to CLAUDE.md
>
> Committed with message: "Retro: Review skill interrogation pattern (recurring)"
>
> Ready to implement the review skill fix now, or continue with other work?

---

### Example 3: Failure with backlog task needed

User: `/claude-code-skills:retro`

*Context: The handoff skill skipped Step 5 (starter prompt) entirely during execution.*

Response:

> **Failure identified:** Handoff skill execution skipped Step 5 entirely — jumped from generating handoff file to verification without creating the starter prompt.
>
> **Why #1:** Why was Step 5 skipped?
> → **Proposed answer:** Because there was no tracking mechanism to ensure each step was completed before moving on.
>
> Is this accurate?

User: "Yes"

> **Why #2:** Why was there no tracking mechanism?
> → **Proposed answer:** Because the skill file said "follow these steps exactly" but didn't require explicit step tracking like TodoWrite.
>
> Confirm?

User: "Correct — and I've seen this happen with other multi-step skills too"

> **Why #3:** Why don't multi-step skills require explicit tracking?
> → **Proposed answer:** Because the original skill designs assumed Claude would naturally follow numbered steps, without realizing that context pressure leads to step-skipping.
>
> **ROOT CAUSE:** Multi-step skills lack enforcement mechanism. "Follow steps exactly" is not operationalized.

> **No exact pattern match found**, but this is related to the general "verification theater" lesson pattern.
>
> **Escalation evaluation:**
> - Pattern: Partial — Related to verification lessons but not exact match
> - Structural: **Yes** — Fix requires updating skill template and existing skills
> - Impact: Yes — Incomplete handoffs break continuation sessions
>
> **Recommendation:** Keep as lesson + backlog task. The structural fix (adding TodoWrite requirement) is the key intervention.
>
> Do you want to escalate to full postmortem, or proceed with lesson + task?

User: "Lesson + task is fine"

[Writes lesson, creates backlog task for updating skill template]

> **Retro Complete**
>
> **Root cause:** Multi-step skills lack enforcement mechanism for step completion.
>
> **Captured:**
> - [x] Lesson in `{REFERENCE_PATH}/lessons/lessons.md`
> - [x] Backlog task in `{BACKLOG_PATH}/skill-step-tracking-enforcement.md`
> - [—] Postmortem (not escalated)
>
> Committed with message: "Retro: Handoff skill skipped Step 5 — adding tracking requirement"
>
> Ready to update the handoff skill now, or continue with other work?

---

## Reminders

- **Launch directly into analysis** — No "Let me help you analyze this failure." Just start with Why #1.
- **Drive both questions AND answers** — The user confirms/corrects; they don't have to articulate what Claude already observed.
- **Root cause = actionable** — Stop when you reach something that can be prevented with a change.
- **Pattern check is mandatory** — Always scan lessons.md and postmortems before proposing output.
- **Verification is mandatory** — Always read back and display changes after writing.
- **TodoWrite tracking required** — Create checklist of all 7 steps before starting.
- **Distinguish from /review** — Review is "what did we learn?" Retro is "why did this fail?"
- **Commit all changes** — Every retro produces at least one commit.
