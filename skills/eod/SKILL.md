---
name: eod
description: End-of-day wrap-up - process pending lessons, check for loose ends, prep for tomorrow
---

# /claude-code-skills:eod

End-of-day ritual to close out the workday cleanly.

## Configuration

This skill reads `.dev-org.yaml` from the project root if present. If no config file exists, default paths are used.

**Config variables used:**
- `{REFERENCE_PATH}` - Path to reference layer (default: `reference/`)
- `{BACKLOG_PATH}` - Path to task files (default: `backlog/tasks/`)
- `{USER_NAME}` - Name used in documentation (default: "the user")

## When to Use

Run this at the end of your workday to:
- Process any lessons/memories queued during the day
- Check for uncommitted work or loose ends
- Update task statuses if needed
- Quick reflection on what got done

---

## Instructions for Claude

When this skill is invoked, follow these steps:

### Step 0: Load Configuration

Before starting, check for `.dev-org.yaml` in the project root:
- If found, read and use configured values
- If not found, use defaults:
  - `{REFERENCE_PATH}` → `reference/`
  - `{BACKLOG_PATH}` → `backlog/tasks/`
  - `{USER_NAME}` → "the user"

---

### Step 1: Process Pending Lessons

Read `{REFERENCE_PATH}/lessons/pending-review.md` to check for queued items.

Also read `{REFERENCE_PATH}/lessons/lessons.md` and check for any lessons added **today** (by date in the heading). These are candidates for Step 1b.

**If pending items exist:**

Present all items in a numbered list:

> **Pending lessons from today:**
>
> 1. **[Type: Lesson]** [Proposed content]
>    - *Context: [when/where observed]*
>
> 2. **[Type: Preference]** [Proposed content]
>    - *Context: [when/where observed]*
>
> For each, I can: **approve**, **edit**, or **skip**. Or say "approve all" to accept everything.

Wait for user input. Then:
- **Approved items**: Write to their permanent files (lessons.md, memories.md, preferences.md)
- **Edited items**: Write the edited version
- **Skipped items**: Remove from queue without saving

After processing, clear the queue file back to its empty template:

```markdown
# Pending Review Items

Items queued for daily review. Run `/claude-code-skills:eod` to process.

---
```

**If no pending items**, say so and move to Step 1b.

---

### Step 1b: Graduate High-Impact Lessons to Global CLAUDE.md

Review any lessons added today (from Step 1 or already in lessons.md).

**Graduation criteria** — a lesson should be promoted if it:
- Applies to **all sessions**, not just dev-org
- Represents a **recurring pattern** (happened more than once, or likely to recur)
- Is **high-impact** (caused real problems when violated)

**Evaluate each lesson and make a recommendation:**

> **Lesson graduation check:**
>
> Today's lessons:
>
> 1. **[Lesson summary]**
>    - Recommendation: **Graduate** — [1-sentence reason why it meets criteria]
>
> 2. **[Lesson summary]**
>    - Recommendation: **Skip** — [1-sentence reason: too specific, one-off, etc.]
>
> **My suggestion:** Graduate #1, skip #2.
>
> Confirm, or tell me to adjust?

If no lessons today, say "No new lessons today" and move to Step 2.

**If graduating:**
1. Read `~/.claude/CLAUDE.md`
2. Draft the new item for "Critical Mistakes to Avoid" (concise, 1-2 lines, matches existing style)
3. Show the draft to user for confirmation
4. Apply the edit and update the sync date comment
5. Show the updated section

---

### Step 2: Check for Loose Ends

Run quick checks:

1. **Git status** - Any uncommitted changes?
2. **In-progress tasks** - Any tasks marked `in-progress` in `{BACKLOG_PATH}` that should be updated?

Report findings:

> **Loose ends check:**
> - Git: [clean / X uncommitted files]
> - In-progress tasks: [list any, or "none"]
>
> Want me to address any of these?

If user wants to address something, help them. Otherwise proceed.

---

### Step 3: Day Summary (Optional)

If the user wants, offer a quick summary:

> Want a quick summary of what got done today? (I can check git commits and task updates)

If yes, summarize based on:
- Git commits from today
- Tasks completed or updated today

---

### Step 4: Wrap Up

> **EOD complete.**
>
> - [X] lessons processed (or "no pending lessons")
> - [X] loose ends checked
>
> Have a good evening!

---

## Queue File Format

The pending review file at `{REFERENCE_PATH}/lessons/pending-review.md` uses this format:

```markdown
# Pending Review Items

Items queued for daily review. Run `/claude-code-skills:eod` to process.

---

## [YYYY-MM-DD HH:MM] - [Session Context]
- **Type:** Lesson | Memory | Preference
- **Proposed:** [The thing to capture]
- **Context:** [What was happening when this was observed]

---
```

---

## Files Read

- `{REFERENCE_PATH}/lessons/pending-review.md` - Queued lessons
- `{BACKLOG_PATH}/*.md` - Check for in-progress tasks

## Files Written

- `{REFERENCE_PATH}/lessons/pending-review.md` - Clear after processing
- `{REFERENCE_PATH}/lessons/lessons.md` - Approved lessons
- `{REFERENCE_PATH}/memories/memories.md` - Approved memories
- `{REFERENCE_PATH}/identity/preferences.md` - Approved preferences
- `~/.claude/CLAUDE.md` - Graduated high-impact lessons (global)

## Integrations

- **Git** - Check status, commit any reference layer updates
