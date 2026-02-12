---
name: handoff
description: Use when context window is getting full and work needs to be handed off to a fresh Claude Code session
---

# /claude-code-skills:handoff

Package session context into artifacts for continuation by a fresh Claude Code session.

## Configuration

This skill reads `.atlas.yaml` from the project root if present. If no config file exists, default paths are used.

**Config variables used:**
- `{REFERENCE_PATH}` - Path to reference layer (default: `reference/`)
- `{BACKLOG_PATH}` - Path to task files (default: `backlog/tasks/`)
- `{PLANS_PATH}` - Path to plan documents (default: `docs/plans/`)

## When to Use

Use this skill when:
- **Context window is getting full** - Primary use case. Hand off before degradation.
- **Explicit user request** - User wants to continue in a new session.
- **Long-running work** - Complex task that may span multiple sessions.

**What it produces:**
1. A handoff MD file at `docs/plans/YYYY-MM-DD-<topic>-handoff.md`
2. A starter prompt displayed to the user (copy-paste to new session)

---

## Instructions for Claude

When this skill is invoked, follow these steps exactly.

**CRITICAL: Before starting, create a TodoWrite checklist with all 9 steps below (Step 0 through Step 8). Mark each step in_progress before starting it and completed after finishing it. Do not skip steps or reorder them. Re-read the template text in Steps 5 and 8 before generating output — do not work from memory.**

### Step 0: Load Configuration

Before starting, check for `.atlas.yaml` in the project root:
- If found, read and use configured values
- If not found, use defaults:
  - `{REFERENCE_PATH}` → `reference/`
  - `{BACKLOG_PATH}` → `backlog/tasks/`
  - `{PLANS_PATH}` → `docs/plans/`

---

### Step 1: Run /claude-code-skills:review First

**Always run `/claude-code-skills:review` before generating the handoff.**

This captures learnings to the reference layer before packaging. Tell the user:

> Before creating the handoff, let's capture any learnings from this session.

Then invoke the review skill. This ensures:
- Lessons are captured to `{REFERENCE_PATH}/lessons/lessons.md`
- Memories are captured to `{REFERENCE_PATH}/memories/memories.md`
- The handoff file can focus on state/context rather than duplicating learnings

After review completes, proceed to Step 2.

---

### Step 2: Check for Formal Plan

Look for an existing plan document:
1. Check conversation history for references to plan documents
2. Check `{PLANS_PATH}/` directory for recent plan files related to current work

**If a formal plan exists:**
- Note its path for inclusion in the handoff

**If no formal plan exists:**
- Inform the user:

> I don't see a formal plan document for this work. Would you like to:
> 1. **Create a plan first** - Use `/superpowers:writing-plans` to document the approach
> 2. **Proceed without** - I'll capture the conversation-based understanding
>
> Formal plans make handoffs more reliable, but aren't required.

Wait for user response before proceeding.

---

### Step 3: Gather Handoff Information

Reflect on the session and gather:

1. **Mission** - What are we trying to accomplish and why?
2. **Context** - Background: what project, relevant constraints, who/what is involved
3. **What We Learned** - Key discoveries, decisions made, dead ends tried, rationale for current approach
4. **Current State** - Done, In Progress, Not Started, Blocked
5. **Codebase Context** - Key files, patterns, areas of the codebase that are relevant
6. **Recommended Next Action** - Single most important thing the new session should do first
7. **Open Questions** - Unresolved decisions or uncertainties

**Ask the user to confirm or add to your understanding:**

> Here's what I understand about the current state of this work:
>
> **Mission:** [your understanding]
>
> **Current State:**
> - Done: [list]
> - In Progress: [list]
> - Not Started: [list]
> - Blocked: [list]
>
> **Recommended Next Action:** [your suggestion]
>
> Is this accurate? Anything to add or correct?

Wait for confirmation before proceeding.

---

### Step 4: Generate Handoff File

Create the handoff file at `{PLANS_PATH}/YYYY-MM-DD-<topic>-handoff.md`.

**Topic naming:** Use a short, descriptive slug (e.g., `handoff-skill-implementation`, `api-refactor`, `debugging-auth-issue`).

**File template:**

```markdown
# Handoff: [Topic Name]

## Mission
[What we're trying to accomplish and why]

## Context
[Background information: what project this is, relevant constraints, who/what is involved]

## What We Learned
[Key discoveries, decisions made, dead ends tried, rationale for current approach. This is the irreplaceable context.]

## Current State
- **Done:** [What's been completed, if anything]
- **In Progress:** [What was actively being worked on]
- **Not Started:** [What remains]
- **Blocked:** [Any blockers the new session should know about]

## Codebase Context
[Key files, patterns, or areas of the codebase that are relevant. Where to look.]

## Recommended Next Action
[The single most important thing the new session should do first]

## Open Questions
[Unresolved decisions or uncertainties that may need user input]
```

**Writing guidelines:**
- "What We Learned" is the most important section - this is what would be lost without the handoff
- Use relative paths for file references (they'll be clickable in editors)
- Be specific about current state - don't be vague about what's done vs. remaining
- Recommended Next Action should be actionable, not "continue work"

---

### Step 5: Generate Starter Prompt

Generate the starter prompt using this template exactly:

```
[TAB_LABEL]
---

You are continuing work on [MISSION_SUMMARY].

Project path: [ABSOLUTE_PATH]

Handoff document: [PATH_TO_HANDOFF_MD]

**Execute this handoff using the executing-handoffs skill.**

Read the handoff document, then invoke `/claude-code-skills:executing-handoffs` to orchestrate the work. This skill will:
1. Digest the handoff context and confirm understanding with you
2. Classify the work type and decompose remaining tasks
3. Execute via subagents (keeping the main thread lightweight for coordination)
4. Checkpoint with you at key decision points
5. Archive the handoff and update the backlog when complete

If the executing-handoffs skill is not available, read the handoff document manually and proceed with the recommended next action — but prefer delegating exploration and implementation to subagents (Task tool) rather than doing everything in the main thread.

After completing the work:
1. Update the backlog status for this task
2. If work remains, offer to generate another handoff using /claude-code-skills:handoff
3. Rename the handoff file to add "-archived" suffix
```

Fill in:
- `[TAB_LABEL]` - A ~10-12 character summary of the chat's goal (e.g., `API refactor`, `Fix mem leak`, `Cache setup`). This MUST be the very first line so it appears as the VS Code tab label for easy navigation across multiple sessions. Always followed by `---` on the next line as a visual separator.
- `[MISSION_SUMMARY]` - Brief (5-10 words) description of the mission
- `[ABSOLUTE_PATH]` - Full path to the project root (e.g., `/path/to/project`)
- `[PATH_TO_HANDOFF_MD]` - Relative path to the handoff file (e.g., `{PLANS_PATH}/2026-01-27-handoff-skill-implementation-handoff.md`)

---

### Step 6: Verify Changes (REQUIRED)

**This step is mandatory. Never skip it.**

After writing the handoff file:

1. Read back the file
2. Display the key sections to confirm they're correct
3. Verify the starter prompt has all placeholders filled in correctly

**Verification output format:**

> **Verification - Handoff file created:**
>
> Path: `{PLANS_PATH}/YYYY-MM-DD-<topic>-handoff.md`
>
> **Mission:** [shows mission section]
>
> **Current State:** [shows state section]
>
> **Recommended Next Action:** [shows next action]
>
> Handoff file confirmed.

---

### Step 7: Commit to Git

Commit the handoff file with a descriptive message:

```
Handoff: [Topic] - ready for continuation

Created handoff document for [brief description].
Next session should [recommended action].
```

---

### Step 8: Display to User

Present both artifacts to the user:

> **Handoff Complete**
>
> I've created the handoff document at `{PLANS_PATH}/YYYY-MM-DD-<topic>-handoff.md`.
>
> **Starter prompt for the new session:**
>
> ---
>
> ```
> [THE FULL STARTER PROMPT]
> ```
>
> ---
>
> Copy this prompt to start a new Claude Code session. The new session will have full context to continue the work.
>
> **Reminder:** When the work is complete, rename the handoff file to add `-archived` suffix.

---

## File Paths

All file paths in this skill are relative to the dev-org repo root unless otherwise specified.

## Files Read

- Conversation context (to extract learnings and state)
- `{PLANS_PATH}/` directory (to check for existing plan documents)
- `{BACKLOG_PATH}/*.md` (to understand task context)

## Files Written

- `{PLANS_PATH}/YYYY-MM-DD-<topic>-handoff.md` - The handoff document

## File Lifecycle

1. **Created:** `{PLANS_PATH}/YYYY-MM-DD-<topic>-handoff.md`
2. **After work completes:** Renamed to `{PLANS_PATH}/YYYY-MM-DD-<topic>-handoff-archived.md`
3. Files stay in same directory (not moved) for easy history browsing

---

## Error Handling

- **If `{PLANS_PATH}/` doesn't exist:** Create it before writing the handoff file.
- **If user declines review:** Proceed with handoff generation, but note that learnings may not be captured in reference layer.
- **If handoff topic is unclear:** Ask the user what to call this work for the filename.
- **If git commit fails:** Inform the user and suggest manual commit.

---

## Examples

### Example 1: Implementation handoff with formal plan

User: `/claude-code-skills:handoff`

Response:
> Before creating the handoff, let's capture any learnings from this session.
>
> [Runs /claude-code-skills:review - captures learnings about the implementation approach]

After review completes:

> I found a formal plan at `docs/plans/2026-01-27-api-refactor-plan.md`. I'll reference this in the handoff.
>
> Here's what I understand about the current state of this work:
>
> **Mission:** Refactor the API layer to use the new authentication system
>
> **Current State:**
> - Done: Auth middleware, token validation
> - In Progress: Updating endpoint handlers (5 of 12 done)
> - Not Started: Integration tests, documentation
> - Blocked: None
>
> **Recommended Next Action:** Continue updating endpoint handlers, starting with `/users` routes
>
> Is this accurate? Anything to add or correct?

User: "That's right, go ahead"

[Creates handoff file, verifies, commits]

> **Handoff Complete**
>
> I've created the handoff document at `docs/plans/2026-01-27-api-refactor-handoff.md`.
>
> **Starter prompt for the new session:**
>
> ---
>
> ```
> API refactor
> ---
>
> You are continuing work on refactoring the API layer authentication.
>
> Project path: /path/to/project
>
> Handoff document: docs/plans/2026-01-27-api-refactor-handoff.md
>
> **Execute this handoff using the executing-handoffs skill.**
>
> Read the handoff document, then invoke `/claude-code-skills:executing-handoffs` to orchestrate the work. This skill will:
> 1. Digest the handoff context and confirm understanding with you
> 2. Classify the work type and decompose remaining tasks
> 3. Execute via subagents (keeping the main thread lightweight for coordination)
> 4. Checkpoint with you at key decision points
> 5. Archive the handoff and update the backlog when complete
>
> If the executing-handoffs skill is not available, read the handoff document manually and proceed with the recommended next action — but prefer delegating exploration and implementation to subagents (Task tool) rather than doing everything in the main thread.
>
> After completing the work:
> 1. Update the backlog status for this task
> 2. If work remains, offer to generate another handoff using /claude-code-skills:handoff
> 3. Rename the handoff file to add "-archived" suffix
> ```
>
> ---
>
> Copy this prompt to start a new Claude Code session.

---

### Example 2: Debugging session handoff (no formal plan)

User: `/claude-code-skills:handoff`

Response:
> Before creating the handoff, let's capture any learnings from this session.
>
> [Runs /claude-code-skills:review - captures what was discovered about the bug]

After review completes:

> I don't see a formal plan document for this work. Would you like to:
> 1. **Create a plan first** - Use `/superpowers:writing-plans` to document the approach
> 2. **Proceed without** - I'll capture the conversation-based understanding
>
> Formal plans make handoffs more reliable, but aren't required.

User: "Proceed without, this is just debugging"

> Got it. Here's what I understand about the current state:
>
> **Mission:** Debug and fix the memory leak in the worker process
>
> **What We Learned:**
> - The leak is in the event listener cleanup - listeners aren't being removed on disconnect
> - Tried using WeakMap but that didn't help because the reference chain keeps them alive
> - The pattern in `worker.ts:142` is the culprit
>
> **Current State:**
> - Done: Identified root cause, found the problematic pattern
> - In Progress: Designing fix approach
> - Not Started: Implementing fix, testing
> - Blocked: None
>
> **Recommended Next Action:** Implement the fix in `worker.ts` - add explicit listener removal in the `disconnect` handler
>
> Is this accurate?

User: "Yes"

[Creates handoff file, verifies, commits, displays starter prompt]

---

### Example 3: Research session handoff

User: "I need to hand this off, we've been researching options for the caching layer"

Response:
> Before creating the handoff, let's capture any learnings from this session.
>
> [Runs /claude-code-skills:review]

After review:

> Here's what I understand:
>
> **Mission:** Evaluate caching options for the application
>
> **What We Learned:**
> - Redis is the most robust option but adds operational complexity
> - In-memory (node-cache) is simpler but doesn't survive restarts
> - Evaluated: Redis, Memcached, node-cache, KeyDB
> - Decision criteria: team familiarity, ops overhead, performance needs
>
> **Current State:**
> - Done: Research on all four options, performance benchmarks
> - In Progress: None (research phase complete)
> - Not Started: Final decision, implementation
> - Blocked: Need user's input on ops overhead tolerance
>
> **Recommended Next Action:** Review the comparison table and make a decision on which option to use
>
> **Open Questions:**
> - How much operational complexity is acceptable?
> - Is persistence across restarts required?
>
> Is this accurate?

User: "Perfect"

[Creates handoff file, verifies, commits, displays starter prompt]

---

## Reminders

- **Always run /claude-code-skills:review first** - Capture learnings before packaging
- **"What We Learned" is critical** - This is what would be lost without the handoff
- **Verify the handoff file** - Read it back and confirm accuracy
- **Starter prompt is deterministic** - Use the template exactly, just fill in the blanks
- **Commit the handoff** - It should be tracked in git
- **Remind about archiving** - The new session should rename to `-archived` when done
