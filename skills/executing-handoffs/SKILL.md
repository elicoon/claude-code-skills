---
name: executing-handoffs
description: Use when receiving a handoff document from a previous session — orchestrates execution with aggressive subagent delegation to preserve main-thread context
---

# /claude-code-skills:executing-handoffs

Orchestrate continuation of work from a handoff document. Keeps the main thread lightweight (coordination only) by delegating all substantive work to subagents.

## Configuration

This skill reads `.dev-org.yaml` from the project root if present. If no config file exists, default paths are used.

**Config variables used:**
- `{REFERENCE_PATH}` - Path to reference layer (default: `reference/`)
- `{BACKLOG_PATH}` - Path to task files (default: `backlog/tasks/`)
- `{PLANS_PATH}` - Path to plans/handoff documents (default: `docs/plans/`)
- `{USER_NAME}` - Name of the user (default: "the user")

## When to Use

Use this skill when:
- **Starting a session from a handoff document** - Primary use case. The starter prompt references a handoff MD file.
- **Resuming multi-session work** - User points you to a handoff document and asks you to continue.
- **Re-engaging after context gets heavy** - Mid-session, if context is filling up and you need to restructure around delegation.

**What it does:**
1. Reads and digests the handoff document
2. Classifies the work type (implementation, research, debugging, conversational)
3. Decomposes remaining work into delegatable tasks
4. Executes via subagents, keeping main thread for coordination only
5. Tracks progress and checkpoints with the user
6. Archives the handoff and offers a new one if work remains

**What it does NOT do:**
- Explore the codebase directly (delegate to a subagent)
- Write code directly (delegate to a subagent)
- Run tests directly (delegate to a subagent)
- Perform research directly (delegate to a subagent)

---

## Instructions for Claude

When this skill is invoked, follow these steps exactly.

**CRITICAL: Before starting, create a TodoWrite checklist with Steps 0-8 below. Mark each step in_progress before starting it and completed after finishing it. Do not skip steps or reorder them.**

### Step 0: Load Configuration

Before starting, check for `.dev-org.yaml` in the project root:
- If found, read and use configured values
- If not found, use defaults:
  - `{REFERENCE_PATH}` → `reference/`
  - `{BACKLOG_PATH}` → `backlog/tasks/`
  - `{PLANS_PATH}` → `docs/plans/`
  - `{USER_NAME}` → "the user"

### Step 1: Read and Digest the Handoff Document

Read the handoff document referenced in the starter prompt or user message. Extract:

1. **Mission** - What are we trying to accomplish?
2. **What We Learned** - Irreplaceable context from previous sessions
3. **Current State** - What is Done, In Progress, Not Started, Blocked?
4. **Codebase Context** - Key files, patterns, areas of the codebase
5. **Recommended Next Action** - What the previous session suggested
6. **Open Questions** - Unresolved decisions

Also read the dev-org reference layer silently for interaction calibration:
- `{REFERENCE_PATH}/identity/preferences.md`
- `{REFERENCE_PATH}/lessons/lessons.md`
- `{REFERENCE_PATH}/memories/memories.md`

**Do NOT output raw file contents.** Synthesize what you read.

---

### Step 2: Classify the Work Type

Determine the primary work type from the handoff document. This affects how you decompose and delegate.

| Work Type | Indicators | Delegation Strategy |
|-----------|-----------|---------------------|
| **Implementation** | Code to write, features to build, files to modify | Subagents implement, test, and commit. Use TDD where applicable. |
| **Research** | Information to gather, options to evaluate, tools to assess | Subagents explore sources, read docs, analyze options. Report findings back. |
| **Debugging** | Bug to find, failure to diagnose, behavior to explain | Subagents investigate specific hypotheses. Use systematic-debugging pattern. |
| **Conversational** | Decisions to make with user, content to co-create, preferences to capture | Main thread handles conversation. Subagents do supporting exploration/drafting. |
| **Mixed** | Multiple work types in the remaining tasks | Classify each task individually. |

Tell the user:

> **Handoff received.** Here is my understanding:
>
> **Mission:** [1-2 sentence summary]
>
> **Work type:** [classification] - [brief justification]
>
> **Current state:** [Done count] completed, [In Progress count] in progress, [Not Started count] remaining, [Blocked count] blocked
>
> **Recommended first action:** [from handoff doc]
>
> **Open questions from previous session:**
> - [list any open questions]
>
> Does this match your understanding? Any corrections or priorities to adjust before I proceed?

**Wait for user confirmation before proceeding.**

---

### Step 3: Decompose into Delegatable Tasks

Break the "Not Started" and "In Progress" items into tasks that can each be completed by a single subagent invocation.

**Rules for task decomposition:**

1. Each task must be completable by one subagent without needing information from other tasks' results (unless sequenced)
2. Each task must have a clear, verifiable completion criteria
3. Tasks should be ordered by dependency (what needs to happen first)
4. Group naturally parallel tasks together

**If decomposition requires codebase exploration:** Dispatch a subagent to do it:

```
Task tool:
  subagent_type: Explore
  description: "Explore codebase for task decomposition"
  prompt: |
    Read the following handoff context and explore the codebase to break
    the remaining work into specific, actionable tasks.

    ## Handoff Context
    [paste Mission, What We Learned, Current State, Codebase Context sections]

    ## Items to Decompose
    [paste Not Started and In Progress items]

    ## Your Job
    1. Read the key files mentioned in Codebase Context
    2. Understand the current state of the code/project
    3. Break each remaining item into specific subtasks
    4. For each subtask, specify:
       - What to do (clear action)
       - What files are involved
       - Completion criteria (how to know it is done)
       - Dependencies (what must happen first)
    5. Identify which tasks can run in parallel

    Report back with the decomposed task list.
```

**Present the task list to the user:**

> **Proposed task breakdown:**
>
> 1. [Task name] - [brief description]
>    - Files: [relevant files]
>    - Depends on: [dependencies or "none"]
> 2. [Task name] - ...
> [etc.]
>
> **Parallel opportunities:** Tasks [X] and [Y] can run simultaneously.
>
> Does this look right? Any tasks to add, remove, or reorder?

**Wait for user confirmation before proceeding.**

---

### Step 4: Execute via Subagents

Execute the confirmed task list. **The main thread coordinates; subagents do the work.**

**For each task:**

1. Mark the task as `in_progress` in TodoWrite
2. Dispatch a subagent with a focused prompt (see templates below)
3. Review the subagent's output
4. If the subagent asks questions: answer them (the main thread has the context)
5. If the subagent reports completion: verify the result (dispatch a review subagent for implementation tasks)
6. Mark the task as `completed` in TodoWrite
7. Brief the user on progress after each task (or batch of parallel tasks)

**Subagent dispatch rules:**

- **Always provide full context inline.** Never make subagents read the handoff document (wastes their context). Paste the relevant sections directly into the prompt.
- **Always include "What We Learned."** Subagents need the irreplaceable context to avoid repeating dead ends.
- **Constrain scope.** Each subagent gets one task. Include: what to do, what files to touch, what NOT to touch, and what "done" looks like.
- **Include codebase context.** Paste relevant file paths and patterns so the subagent does not need to explore broadly.

#### Subagent Prompt Templates by Work Type

**Implementation task:**
```
Task tool:
  subagent_type: general-purpose
  description: "Implement: [task name]"
  prompt: |
    You are implementing a specific task as part of a larger effort.

    ## Task
    [What to do - specific and actionable]

    ## Context from Previous Sessions
    [Paste relevant "What We Learned" items and codebase context]

    ## Key Files
    [List files to read and/or modify]

    ## Constraints
    - Only modify files related to this task
    - Follow existing patterns in the codebase
    - [Any specific constraints from the handoff]

    ## Completion Criteria
    [How to verify the task is done]

    ## Your Job
    1. Read the relevant files to understand current state
    2. Implement the task
    3. Write/run tests if applicable
    4. Commit your work with a descriptive message
    5. Report: what you did, files changed, any issues encountered
```

**Research task:**
```
Task tool:
  subagent_type: general-purpose
  description: "Research: [task name]"
  prompt: |
    You are researching a specific question as part of a larger effort.

    ## Question
    [What to find out]

    ## Context
    [What we already know - paste relevant "What We Learned" items]
    [Known dead ends - what NOT to pursue]

    ## Sources to Check
    [Specific files, URLs, tools, or approaches to investigate]

    ## Output Format
    Report back with:
    - Findings (organized by source)
    - Recommendation (if applicable)
    - Confidence level (high/medium/low)
    - Open questions that remain
```

**Debugging task:**
```
Task tool:
  subagent_type: general-purpose
  description: "Debug: [task name]"
  prompt: |
    You are investigating a specific issue as part of a debugging effort.

    ## Problem
    [What is broken or unexpected]

    ## What We Already Know
    [Paste relevant "What We Learned" - especially dead ends and hypotheses]

    ## Hypothesis to Test
    [Specific hypothesis for this subagent to investigate]

    ## Key Files
    [Where to look]

    ## Your Job
    1. Read the relevant files
    2. Test the hypothesis
    3. Report: confirmed/rejected, evidence, suggested fix or next hypothesis
```

**Exploration task:**
```
Task tool:
  subagent_type: Explore
  description: "Explore: [task name]"
  prompt: |
    You are exploring a question to inform a decision.

    ## Question
    [What to explore]

    ## Context
    [Background information and constraints]

    ## What to Produce
    [Specific output: options list, draft content, analysis, etc.]

    Report back with your findings. Do not make final decisions -
    those will be made in the main thread with the user.
```

---

### Step 5: Handle Parallel Tasks

When tasks are independent (no shared files, no dependency chain), dispatch them simultaneously:

```
[Dispatch Task A subagent]
[Dispatch Task B subagent]   -- in the same message, all at once
[Dispatch Task C subagent]
```

After all return:
1. Review each result
2. Check for conflicts (did any modify the same files?)
3. Run integration verification if applicable
4. Report all results to user at once

**Never dispatch parallel subagents that modify the same files.**

---

### Step 6: Review Implementation Work

For implementation tasks, dispatch a review subagent after the implementer completes:

```
Task tool:
  subagent_type: superpowers:code-reviewer
  description: "Review: [task name] implementation"
  prompt: |
    Review the implementation that was just completed for this task.

    ## Task That Was Implemented
    [What was supposed to be done]

    ## Completion Criteria
    [How to verify it is done correctly]

    ## Your Job
    1. Read the changed files
    2. Verify the implementation matches the requirements
    3. Check for: correctness, edge cases, existing pattern compliance
    4. Run tests if applicable
    5. Report: approved or issues found (with specifics)
```

If the reviewer finds issues, dispatch a new implementation subagent with the fix instructions. Do not fix in the main thread.

---

### Step 7: Monitor Context and Checkpoint

**Context budget awareness:**

After every 2-3 completed tasks, assess whether the main thread's context is getting heavy. Signs of context accumulation:
- Multiple rounds of subagent dispatch and result review
- Extensive back-and-forth with the user
- Many task results being held in context

**If context is getting heavy and significant work remains:**

> **Context check:** We have completed [X] of [Y] tasks. The main thread has accumulated significant context from coordinating the work so far.
>
> I recommend we capture progress and create a fresh handoff to continue with a clean context window. This will prevent degradation in the remaining work.
>
> Shall I run `/claude-code-skills:handoff` to package what we have done?

**User checkpoints (pause and ask):**

- After Step 2 (confirm understanding)
- After Step 3 (confirm task breakdown)
- After each major milestone (e.g., all implementation tasks done, moving to testing)
- When a subagent surfaces an open question or blocker
- When an open question from the handoff document becomes relevant
- Before any destructive or irreversible action

---

### Step 8: Complete and Archive

When all tasks are finished:

1. **Update backlog:** Run `/claude-code-skills:add` to update the relevant backlog task status
2. **Archive the handoff:** Rename the input handoff file to add `-archived` suffix
3. **Verify the archive:** Read the file listing to confirm the rename succeeded
4. **Offer next steps:**

> **Execution complete.**
>
> **Accomplished:**
> - [List of completed tasks]
>
> **Handoff archived:** `{PLANS_PATH}/YYYY-MM-DD-<topic>-handoff-archived.md`
>
> **Remaining work (if any):**
> - [List anything not completed]
>
> Options:
> 1. **New handoff** - Create a handoff for remaining work (`/claude-code-skills:handoff`)
> 2. **Review** - Capture learnings from this session (`/claude-code-skills:review`)
> 3. **Done** - All work is complete

---

## Main Thread Rules

These rules are the core discipline of this skill. Violating them leads to context bloat and degradation.

| Action | Main Thread? | Subagent? |
|--------|:---:|:---:|
| Read the handoff document | Yes | No |
| Read dev-org reference layer | Yes | No |
| Classify work type | Yes | No |
| Decompose tasks (if exploration needed) | No | Yes |
| Decompose tasks (if obvious from handoff) | Yes | No |
| Present task list and checkpoint with user | Yes | No |
| Explore codebase | No | Yes |
| Read/analyze code files | No | Yes |
| Write/modify code | No | Yes |
| Run tests | No | Yes |
| Perform research | No | Yes |
| Review implementation | No | Yes |
| Answer subagent questions | Yes | No |
| Make decisions with user | Yes | No |
| Track progress (TodoWrite) | Yes | No |
| Assess context budget | Yes | No |
| Update backlog | Yes | No |
| Create new handoff | Yes | No |

**The one-sentence rule:** If you are about to read a file that is not the handoff doc or a dev-org reference file, you should be dispatching a subagent instead.

---

## File Paths

All file paths in this skill are relative to the dev-org repo root unless otherwise specified.

## Files Read

- The handoff document (path provided by starter prompt or user)
- `{REFERENCE_PATH}/identity/preferences.md` - Interaction calibration
- `{REFERENCE_PATH}/lessons/lessons.md` - Avoid repeating mistakes
- `{REFERENCE_PATH}/memories/memories.md` - Context about {USER_NAME}
- `{BACKLOG_PATH}/*.md` - Task status context (per-task files)

## Files Written

- None directly (subagents write files; main thread updates backlog via `/claude-code-skills:add`)
- Renames handoff file to `-archived` suffix on completion

---

## Error Handling

| Issue | Response |
|-------|----------|
| **Handoff document not found** | Ask the user for the correct path. Check `{PLANS_PATH}` for recent handoff files. |
| **Handoff document is already archived** | Inform the user: "This handoff has already been archived (completed). Did you mean a different one?" List non-archived handoff files in `{PLANS_PATH}`. |
| **Work type unclear** | Default to "mixed" and classify each task individually. Ask the user if unsure. |
| **Subagent fails or returns errors** | Do not attempt to fix in main thread. Dispatch a new subagent with the error context and specific fix instructions. |
| **Subagent asks questions main thread cannot answer** | Surface the question to the user. Do not guess. |
| **All tasks blocked** | Report blockers to user and offer to: (a) work on unblocked items, (b) create a handoff noting the blockers, (c) shelve the work. |
| **Context getting heavy** | Proactively offer to create a new handoff. Do not wait for degradation to become visible. |
| **Open questions from handoff need resolution** | Surface them to the user at the appropriate moment (when the related task is about to start), not all at once at the beginning. |

---

## Examples

### Example 1: Implementation handoff (Dashboard build)

**Starter prompt references:** `docs/plans/2026-01-28-backlog-dashboard-handoff.md`

**Step 1-2 output:**

> **Handoff received.** Here is my understanding:
>
> **Mission:** Build a web-based dashboard that visualizes the dev-org backlog as Kanban Board and Command Center views.
>
> **Work type:** Implementation - there are specific features to build (parser, two views, expandable cards, keyboard shortcuts).
>
> **Current state:** 6 completed, 0 in progress, 5 remaining, 0 blocked
>
> **Recommended first action:** Build the backlog.md parser first.
>
> **Open questions:**
> - Phase 2 hosting approach (defer for now)
> - Build script vs. runtime parsing
>
> Does this match your understanding?

**User:** "Yes, go ahead."

**Step 3 (via subagent exploration):**

> **Proposed task breakdown:**
>
> 1. Build backlog.md parser - JS function that extracts task objects from markdown
>    - Files: `backlog/tasks/*.md` (read), `dashboard.html` (write)
>    - Depends on: none
> 2. Build Kanban Board view with expandable cards
>    - Files: `dashboard.html`
>    - Depends on: Task 1
> 3. Build Command Center view with expandable rows
>    - Files: `dashboard.html`
>    - Depends on: Task 1
> 4. Add date fields to cards and rows
>    - Files: `dashboard.html`
>    - Depends on: Tasks 2 and 3
> 5. Add keyboard shortcuts (B/C for tab switching)
>    - Files: `dashboard.html`
>    - Depends on: Tasks 2 and 3
>
> **Parallel opportunities:** Tasks 2 and 3 can run simultaneously. Tasks 4 and 5 can run simultaneously after 2+3 complete.
>
> Shall I proceed?

**User:** "Go"

[Dispatches subagent for Task 1, reviews result, dispatches Tasks 2+3 in parallel, reviews, dispatches Tasks 4+5 in parallel, reviews, reports completion]

---

### Example 2: Research handoff

**Starter prompt references:** `docs/plans/2026-01-28-reference-layer-research-handoff.md`

**Step 1-2 output:**

> **Handoff received.** Here is my understanding:
>
> **Mission:** Deeply populate the dev-org reference layer by mining all available sources about {USER_NAME}.
>
> **Work type:** Research - gathering information from Google Drive, LinkedIn, local projects, and web presence.
>
> **Current state:** Research planning done, 5 starter prompts written. 0 of 4 research sessions completed, merge session not started.
>
> **Recommended first action:** Launch research sessions 1-4.
>
> **Open questions:**
> - API keys for enhanced search?
> - Run from Mac instead?
>
> These questions affect approach. Let me surface them now.
>
> Do you want to set up API keys before we start, or proceed with Playwright as fallback?

**User:** "Proceed with Playwright for now."

[Dispatches 4 research subagents in parallel, collects findings, dispatches merge subagent, reports results]

---

### Example 3: Conversational handoff (Codify personal "why")

**Step 1-2 output:**

> **Handoff received.** Here is my understanding:
>
> **Mission:** Codify {USER_NAME}'s personal "why" into `{REFERENCE_PATH}/identity/why.md`.
>
> **Work type:** Conversational - this requires a deep-dive conversation with {USER_NAME} to articulate their motivations. Not something a subagent can do autonomously.
>
> **Current state:** Two-layer structure identified. Deep-dive conversation incomplete.
>
> **Recommended first action:** Resume the conversational deep-dive using research findings.
>
> This is primarily conversational work. I will handle the conversation directly and use subagents only for supporting tasks (reading research output, drafting sections for review, updating files).
>
> Ready to continue the deep-dive?

---

## Reminders

- **Main thread = coordinator only.** If you are about to read code, write code, run tests, or explore the codebase, stop and dispatch a subagent instead.
- **Paste context into subagent prompts.** Never make subagents read the handoff document. Give them exactly what they need inline.
- **Include "What We Learned" in every subagent prompt.** This prevents repeating dead ends.
- **Checkpoint with the user** after understanding (Step 2), after decomposition (Step 3), and after each major milestone.
- **Monitor context accumulation.** Offer to re-handoff before degradation, not after.
- **Surface open questions at the right time** - when the related task is about to start, not all at the beginning.
- **Archive the handoff document** when work is complete. Rename to add `-archived` suffix.
- **Conversational work stays in main thread.** Not everything can be delegated. Conversations with the user, decisions, and preference capture are main-thread responsibilities.
