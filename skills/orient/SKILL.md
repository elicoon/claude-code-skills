---
name: orient
description: Use when starting a work session to review backlog, calendar, and priorities for deciding what to work on next
---

# /claude-code-skills:orient

**Purpose:** Review backlog, calendar, and context to facilitate a prioritization discussion and help decide what to work on next.

## When to Use

Use this skill when:
- Starting a work session and need to decide what to focus on
- Feeling overwhelmed and need help prioritizing
- Want to review commitments before making new ones
- Need a sanity check on current priorities

This is a **read-only** operation. No files are modified.

---

## Configuration

This skill reads `.atlas.yaml` from the project root if present. If no config file exists, default paths are used.

**Available config variables:**

| Variable | Description | Default |
|----------|-------------|---------|
| `{REFERENCE_PATH}` | Path to reference layer files | `reference/` |
| `{BACKLOG_PATH}` | Path to task files | `backlog/tasks/` |
| `{USER_NAME}` | Name to use when addressing the user | `"the user"` |
| `{CALENDAR_INTEGRATION}` | Calendar provider or `"none"` | `"none"` |

---

## Instructions for Claude

When this skill is invoked, follow these steps to **facilitate a conversation**, not just dump information. The goal is to help {USER_NAME} make a decision about what to work on next.

### Step 0: Load Configuration

Before starting, check for `.atlas.yaml` in the project root:
- If found, read and use configured values
- If not found, use defaults:
  - `{REFERENCE_PATH}` → `reference/`
  - `{BACKLOG_PATH}` → `backlog/tasks/`
  - `{USER_NAME}` → "the user"
  - `{CALENDAR_INTEGRATION}` → "none"

### Step 1: Gather All Context

Read the following files silently (do not output raw file contents):

1. **Backlog:** `{BACKLOG_PATH}/*.md` - All task files (one file per task in {BACKLOG_PATH} directory)
2. **Why:** `{REFERENCE_PATH}/identity/why.md` - Core motivations and goals
3. **Constraints:** `{REFERENCE_PATH}/identity/constraints.md` - Time and resource limitations
4. **Preferences:** `{REFERENCE_PATH}/identity/preferences.md` - Work style and how {USER_NAME} likes to operate
5. **Lessons:** `{REFERENCE_PATH}/lessons/lessons.md` - Behavioral principles and accumulated learnings
6. **Memories:** `{REFERENCE_PATH}/memories/memories.md` - Key facts, decisions, and session patterns
7. **Workflows:** `{REFERENCE_PATH}/ways-of-working/workflows.md` - Established processes and skill usage
8. **Tools:** `{REFERENCE_PATH}/ways-of-working/tools.md` - What tools are available and how they're used

Files 1-4 provide **what** to discuss. Files 5-8 provide **how** to discuss it - they calibrate interaction style. For example, lessons may indicate "infer first, confirm second" or "verify user-facing outcomes"; memories may reveal parallel session patterns or a preference for bite-sized decisions; workflows and tools inform what tasks are realistic to take on. Read these to shape your behavior, not to add more content to the output.

These inform the conversation but should not be dumped as-is.

### Step 2: Fetch Calendar Data (if enabled)

**Skip this step if `{CALENDAR_INTEGRATION}` is `"none"`.**

If `{CALENDAR_INTEGRATION}` is `"google"`, use the Google Calendar MCP to understand time constraints:

1. Call `mcp__google-calendar__get-current-time` to get current date/time
2. Call `mcp__google-calendar__list-events` with:
   - `calendarId`: "primary"
   - `timeMin`: current time (ISO 8601 format)
   - `timeMax`: end of tomorrow (ISO 8601 format, to show today + tomorrow)

**Note:** Call these sequentially - the current time from step 1 is needed for the timeMin/timeMax parameters in step 2.

If calendar MCP is unavailable or `{CALENDAR_INTEGRATION}` is `"none"`, proceed without calendar data.

### Step 3: Analyze the Situation

Before presenting anything, mentally categorize:

**Active Work:**
- Tasks with status "in progress"
- Note: Should there be only one? Multiple in-progress tasks may indicate context-switching

**Committed but Not Started:**
- Tasks with status "not started"
- These are real commitments, not just ideas

**Blocked Items:**
- Tasks with status "blocked"
- Blockers require attention - can any be unblocked?

**Draft Ideas:**
- Count only - these are not commitments
- Do NOT list individual draft items

**Time Constraints:**
- Calendar events today and tomorrow (if calendar integration enabled)
- Available time windows for deep work
- Factor in any constraints from the user's profile

### Step 4: Open the Conversation

Start with a brief, digestible summary - NOT a wall of text. Example opening:

---

**Orient: What should you focus on?**

*[Current date/time]*

**Quick snapshot:**
- [X] task(s) in progress
- [X] committed tasks waiting
- [X] blocked item(s) needing attention
- [Today's calendar: X events / clear]

**The big picture:**
[1-2 sentences synthesizing the situation based on backlog + constraints. For example: "You have one active task that's nearly done, two committed tasks waiting, and a busy afternoon with meetings. Looks like a good morning for focused work."]

---

### Step 5: Facilitate the Decision

After the opening, guide the prioritization discussion. Ask targeted questions based on the situation:

**If there's active work:**
> You have [task] in progress. Is this still the priority, or has something changed?

**If there are blocked items:**
> [Task] is blocked by [blocker]. Is there anything you can do to unblock it today, or should we shelve it for now?

**If there's a time crunch:**
> You have [X hours] before [next commitment]. What's realistic to accomplish in that window?

**If there are multiple committed tasks:**
> You have [X] committed tasks. Based on deadlines and how you're feeling, which one should come first?

**If the backlog is light:**
> The committed work is minimal. Want to pull something from draft status, or is this a good time to rest/recharge?

**Energy-level check (always ask if not obvious):**
> How are you feeling? High energy for deep work, or more suited for lighter tasks today?

### Step 6: Help Make the Decision

Based on {USER_NAME}'s responses, help narrow down to a **single focus** for the session. The goal is to leave the conversation with clarity on:

1. **What to work on** - One primary focus
2. **What to defer** - Explicitly set aside other items
3. **Time boundary** - When to stop or reassess (e.g., "until lunch", "for the next 2 hours")

End with a clear statement:

> **Decision:** Focus on [task] for [time period]. We'll defer [other items] for now.

Or, if still undecided:

> Still figuring it out - what would help you decide?

---

## Conversation Principles

1. **Be concise.** {USER_NAME} may have limited time. Don't dump walls of text.
2. **Be opinionated.** Offer recommendations based on context, not just neutral options.
3. **Respect time constraints.** Factor in any constraints from the user's profile.
4. **One focus at a time.** Help narrow down to a single priority, not a list.
5. **Energy matters.** A tired person shouldn't tackle the hardest task.
6. **Blockers are urgent.** If something is blocked, address it or consciously shelve it.
7. **Draft items are not work.** Don't let draft items create pressure or guilt.

---

## Error Handling

| Issue | Response |
|-------|----------|
| **Backlog file missing** | "I couldn't find your backlog. Want me to run `/claude-code-skills:add` to set it up?" |
| **Backlog is empty** | "Your backlog is empty - nothing committed. Either add tasks with `/claude-code-skills:add` or take a well-deserved break." |
| **Calendar MCP unavailable** | Note "Calendar unavailable" and proceed with backlog-only prioritization. |
| **Reference files missing** | Proceed without that context - backlog is the primary source |
| **No tasks in progress or committed** | "You have no active or committed work. This is either a great sign or a prompt to review your draft ideas." |

Do not halt the conversation due to partial data. Work with what's available.

---

## Files Read

- `{BACKLOG_PATH}/*.md`
- `{REFERENCE_PATH}/identity/why.md`
- `{REFERENCE_PATH}/identity/constraints.md`
- `{REFERENCE_PATH}/identity/preferences.md`
- `{REFERENCE_PATH}/lessons/lessons.md`
- `{REFERENCE_PATH}/memories/memories.md`
- `{REFERENCE_PATH}/ways-of-working/workflows.md`
- `{REFERENCE_PATH}/ways-of-working/tools.md`

## Files Written

None. This is strictly read-only.

## Integrations

- **Google Calendar MCP** (when `{CALENDAR_INTEGRATION}` is `"google"`) - `mcp__google-calendar__get-current-time` and `mcp__google-calendar__list-events` for time context

---

## Example Conversations

### Example 1: Normal workday start

**User:** `/claude-code-skills:orient`

**Claude:**

> **Orient: What should you focus on?**
>
> *Monday, January 27, 2026 - 9:15 AM*
>
> **Quick snapshot:**
> - 1 task in progress (dev-org skills implementation)
> - 0 tasks waiting
> - 0 blocked items
> - Today: 2 calendar events (11am standup, 3pm pediatrician)
>
> **The big picture:**
> You have one active task with clear next steps, and a window of focused time this morning before standup. The afternoon is fragmented with appointments.
>
> You're working on "Implement remaining dev-org skills." The next step is building the orient skill. Does that still feel like the right priority, or has something come up?

**User:** Yeah, that's still the focus. I have about 90 minutes before standup.

**Claude:**

> 90 minutes is solid for focused work. The orient skill is well-scoped for that window.
>
> **Decision:** Focus on implementing `/claude-code-skills:orient` for the next 90 minutes. After standup, reassess given the afternoon appointments.
>
> Ready to dive in, or need anything else first?

---

### Example 2: Feeling overwhelmed

**User:** `/claude-code-skills:orient` - I'm feeling scattered today

**Claude:**

> **Orient: Let's get grounded**
>
> *Tuesday, January 28, 2026 - 2:30 PM*
>
> **Quick snapshot:**
> - 2 tasks in progress (may be contributing to the scattered feeling)
> - 3 committed tasks waiting
> - 1 blocked item
> - Today: 1 event remaining (4pm call)
>
> **The big picture:**
> You have two things "in progress" simultaneously, which can split focus. The blocked item (waiting on API access) is probably adding mental weight even though you can't act on it.
>
> A few questions:
> 1. Of the two in-progress tasks, which one would feel best to finish or make real progress on today?
> 2. The blocked item - can we consciously park that and stop thinking about it, or is there an action you can take?
> 3. How's your energy? Are you up for deep work, or would quick wins feel better right now?

**User:** Energy is low. I think I should finish the smaller one and park the blocked item.

**Claude:**

> Good call. Low energy + quick win = momentum.
>
> **Decision:** Focus on [smaller task] until 4pm. The blocked item is officially parked - nothing you can do until that API access comes through. The larger in-progress task can wait until tomorrow when you're fresher.
>
> Does that feel right?

---

### Example 3: Empty backlog

**User:** `/claude-code-skills:orient`

**Claude:**

> **Orient: Clear skies**
>
> *Wednesday, January 29, 2026 - 10:00 AM*
>
> **Quick snapshot:**
> - 0 tasks in progress
> - 0 committed tasks
> - 3 draft ideas on the backlog
> - Today: Clear calendar
>
> **The big picture:**
> You have no committed work right now. This is either a well-deserved break or a sign to review those draft ideas.
>
> Options:
> 1. **Rest** - No guilt. An empty backlog is an achievement.
> 2. **Promote a draft** - Review the 3 draft ideas and commit to one if it feels right.
> 3. **Something new** - Is there something on your mind that should be captured?
>
> What feels right?

---

## Reminders

- **This is a conversation, not a report.** Don't just dump status; facilitate a decision.
- **Read-only.** Orient never modifies files. Use `/claude-code-skills:add` for changes.
- **One priority.** Help narrow focus to a single task, not a to-do list.
- **Respect constraints.** Factor in any time/resource constraints from {USER_NAME}'s profile.
- **Energy matters.** The right task depends on how {USER_NAME} is feeling.
