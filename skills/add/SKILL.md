---
name: add
description: Use when capturing new tasks, ideas, or updating task status in the backlog
---

# /claude-code-skills:add

Add new tasks or ideas to the backlog, or update the status of existing tasks.

## Configuration

This skill reads `.dev-org.yaml` from the project root if present. If no config file exists, default paths are used.

**Config variables:**
- `{BACKLOG_PATH}` - Directory for task files (default: `backlog/tasks/`)
- `{USER_NAME}` - User's name for personalized messages (default: "the user")

## When Invoked

Execute these instructions to help the user capture work items to the backlog.

---

### Step 0: Load Configuration

Before starting, check for `.dev-org.yaml` in the project root:
- If found, read and use configured values
- If not found, use defaults:
  - `{BACKLOG_PATH}` → `backlog/tasks/`
  - `{USER_NAME}` → "the user"

---

## Step 1: Determine Mode

Check if the user provided task information with the command:

**Direct mode** (user provided info): The user included task details like a title, description, or status update. Proceed to Step 2.

**Interactive mode** (no details provided): The user just invoked `/claude-code-skills:add` without specifics. Ask:

> What would you like to add or update?
>
> - **New task/idea:** Tell me what it is and I'll help you capture it
> - **Update existing:** Tell me which task and what changed (e.g., "mark X as done", "X is blocked by Y")

Then proceed based on their response.

---

## Step 2: Read Current Backlog

Read task files in `{BACKLOG_PATH}/` to understand current state:

```
{BACKLOG_PATH}/ (read all .md files in this directory)
```

Tip: Use `ls {BACKLOG_PATH}/` to get file list, then read relevant files.

Check for:
- Existing tasks with similar titles (to avoid duplicates)
- Current task list structure and formatting
- Any tasks that might be related to what the user is adding/updating

---

## Step 3: Gather Task Information

### For New Tasks

Collect the following (ask for missing required fields):

| Field | Required | Default |
|-------|----------|---------|
| **Title** | Yes | - |
| **Status** | No | `draft` |
| **Priority** | No | `medium` |
| **Planned completion** | No | `none` |
| **Blockers** | No | `none` |
| **Notes** | No | (empty) |
| **Next steps** | No | (empty) |

**Important defaults:**
- Use `draft` status for new ideas unless the user explicitly commits to the task
- Only use `not started` when there's a genuine commitment to do the work
- Today's date is used for `Added` and `Updated` fields

### For Status Updates

Identify:
- Which task to update (by title or description)
- What field(s) to change
- If marking as `done`, set `Actual completion` to today's date

---

## Step 4: Check for Duplicates

Before adding a new task, scan the backlog for:
- Exact title matches
- Similar titles (ask user if unsure)
- Related tasks that might cover the same work

If a potential duplicate is found:
> I found an existing task that might be related:
>
> **[existing task title]**
> Status: [status], Priority: [priority]
>
> Is this the same item? Should I:
> 1. Update the existing task instead
> 2. Add as a new separate task
> 3. Skip (no action needed)

---

## Step 5: Create Bug Verification Tests (Bug Tasks Only)

**Skip this step if the task is not a bug report.**

When adding a bug task (title starts with "bug:" or "Bug:" or contains "bug" in the context), create a test file that can verify whether the bug still exists.

### Test File Location

Create tests in the project's test directory following its conventions. If unclear, use:
- `tests/bugs/<slug>.test.ts` for TypeScript projects
- `tests/bugs/<slug>.test.js` for JavaScript projects
- `tests/bugs/test_<slug>.py` for Python projects

### Test Structure

```typescript
/**
 * Bug verification test: [Bug Title]
 * Task: backlog/tasks/<slug>.md
 *
 * This test fails when the bug is present and passes when fixed.
 * Run with: [appropriate test command]
 */

describe('[Bug Title]', () => {
  it('should [expected correct behavior]', () => {
    // Setup: recreate the conditions that trigger the bug

    // Action: perform the operation that fails

    // Assert: verify the expected (correct) behavior
  });
});
```

### Guidelines

1. **Test the expected behavior** - The test should pass when the bug is fixed, fail when present
2. **Include reproduction steps** - Document how to trigger the bug in test comments
3. **Keep tests focused** - One test per bug, testing the specific failure
4. **Link to task** - Include the backlog task path in the test file header

### Add Test Path to Task

Include the test file path in the task's Notes field:
```markdown
- **Notes:** Test: `tests/bugs/<slug>.test.ts`
```

If unable to create tests (e.g., no test framework, unclear how to reproduce):
- Note in the task: "Manual verification required - [reason]"
- Still proceed with task creation

---

## Step 6: Write Changes

### Adding a New Task

Create a new file in `{BACKLOG_PATH}/` using the slugified title.

Slug convention:
1. Lowercase the title
2. Replace spaces and non-alphanumeric characters with hyphens
3. Collapse multiple hyphens, remove leading/trailing hyphens
4. Truncate to 60 characters max

Example: "Get golf clip online" → `{BACKLOG_PATH}/get-golf-clip-online.md`

Task file format:

```markdown
### [Task Title]
- **Project:** [project name if applicable, otherwise omit]
- **Status:** [status]
- **Priority:** [priority]
- **Planned completion:** [date or none]
- **Actual completion:** [date if done, otherwise omit this line]
- **Blockers:** [blockers or none]
- **Notes:** [notes]
- **Added:** [today's date in YYYY-MM-DD format]
- **Updated:** [today's date in YYYY-MM-DD format]

#### Next steps
1. [First action]
2. [Second action if applicable]
```

### Updating an Existing Task

Find and edit the task's file in `{BACKLOG_PATH}/`.
- Update the changed field(s)
- Update the `Updated` date to today
- If status changed to `done`, add/update `Actual completion` date

---

## Step 7: Verify Changes (REQUIRED)

**This step is mandatory. Never skip it.**

After writing to the file:

1. Read back the created/modified file in `{BACKLOG_PATH}/`
2. Display the relevant section showing the new or updated task
3. Confirm the changes match what was intended

Example verification output:
> **Verification - File contents after update:**
>
> ```markdown
> ### [Task that was added/updated]
> - **Status:** ...
> [rest of task content]
> ```
>
> Changes confirmed.

---

## Step 8: Commit to Git

Stage the created/modified files and commit with a meaningful message:
- `{BACKLOG_PATH}/<slug>.md` - the task file
- Test file (if created for bug tasks)

**For new tasks:**
```
Add to backlog: [task title]
```

**For status updates:**
```
Update backlog: [task title] - [old status] -> [new status]
```

**For other updates:**
```
Update backlog: [task title] - [description of change]
```

---

## File Paths

All file paths in this skill are relative to the dev-org repo root.

## Files Read

- `{BACKLOG_PATH}/*.md` - Current task files

## Files Written

- `{BACKLOG_PATH}/<slug>.md` - New or updated task files

## Error Handling

- **If `{BACKLOG_PATH}/` directory does not exist:** Create it before writing the task file.
- **If git commit fails:** Inform the user of the failure and suggest they commit manually with the appropriate message.

## Status Values Reference

| Status | When to Use |
|--------|-------------|
| `draft` | Unconfirmed ideas, brainstorming, items under consideration. **Default for new items.** |
| `not started` | Committed tasks ready to begin. Only use when there's genuine intent to complete. |
| `in progress` | Actively being worked on |
| `blocked` | Cannot continue due to external dependency or issue |
| `done` | Task completed |

## Priority Values Reference

| Priority | Description |
|----------|-------------|
| `high` | Urgent or time-sensitive, do first |
| `medium` | Important but not urgent (default) |
| `low` | Nice to have, do when time permits |

---

## Examples

### Example 1: Quick idea capture

User: `/claude-code-skills:add` "look into using Cursor for pair programming"

Response:
> Adding as a draft idea. Let me check for duplicates first...
>
> [reads backlog, no duplicates found]
>
> I'll add this with default priority (medium) as a draft item.
>
> [writes to file]
>
> **Verification - File contents after update:**
> ```markdown
> ### Look into using Cursor for pair programming
> - **Status:** draft
> - **Priority:** medium
> - **Planned completion:** none
> - **Blockers:** none
> - **Notes:**
> - **Added:** 2026-01-27
> - **Updated:** 2026-01-27
>
> #### Next steps
> 1. Research Cursor features and pricing
> ```
>
> [commits: "Add to backlog: Look into using Cursor for pair programming"]

### Example 2: Status update

User: `/claude-code-skills:add` mark "Set up dev-org repo" as done

Response:
> Let me find that task and update it...
>
> [reads backlog, finds task]
>
> Found it. Updating status to done and setting completion date.
>
> [edits file]
>
> **Verification - File contents after update:**
> ```markdown
> ### Set up dev-org repo
> - **Status:** done
> - **Priority:** high
> - **Planned completion:** 2026-01-27
> - **Actual completion:** 2026-01-27
> - **Updated:** 2026-01-27
> ...
> ```
>
> [commits: "Update backlog: Set up dev-org repo - in progress -> done"]

### Example 3: Interactive mode

User: `/claude-code-skills:add`

Response:
> What would you like to add or update?
>
> - **New task/idea:** Tell me what it is and I'll help you capture it
> - **Update existing:** Tell me which task and what changed

User: "I want to build a Chrome extension for quick capture"

Response:
> Got it. A few questions to help me capture this:
>
> 1. Is this a committed task or just an idea you're exploring? (This determines if it's "not started" vs "draft")
> 2. What priority - high, medium, or low?
> 3. Any target completion date?
> 4. Any notes or context to include?

---

## Reminders

- **Default to draft status** - Prevent backlog pollution by not over-committing
- **Always verify** - Show actual file contents after changes, never just claim "done"
- **Always commit** - All changes should be committed to git
- **Check for duplicates** - Avoid cluttering the backlog with repeated items
