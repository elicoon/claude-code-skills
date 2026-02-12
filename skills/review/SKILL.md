---
name: review
description: Use when updating reference layer memories, lessons, preferences, or core identity documentation
---

# /claude-code-skills:review

Update the reference layer with memories, lessons learned, preferences, and the "why" behind decisions.

## Configuration

This skill reads `.atlas.yaml` from the project root if present. If no config file exists, default paths are used.

**Config variables used:**
- `{REFERENCE_PATH}` - Base path for reference files (default: `reference/`)
- `{BACKLOG_PATH}` - Path to task files (default: `backlog/tasks/`)
- `{USER_NAME}` - Name used in documentation (default: "the user")

## When to Use

Use this skill at the end of significant work sessions, project completions, or when you've had insights worth preserving. The review skill conducts a **conversational reflection** to extract and document learnings.

## Queuing Lessons for Later

**Default behavior:** When Claude notices a potential lesson during a session but shouldn't interrupt the current work, it can **append it to the queue file** for later review.

### Queue File

`{REFERENCE_PATH}/lessons/pending-review.md`

Queued items are processed during `/claude-code-skills:eod` (end-of-day wrap-up), not during `/review`.

### When to Queue vs. Capture Immediately

- **Queue it** (append to pending-review.md): When in the middle of other work (e.g., executing a handoff) and shouldn't interrupt
- **Capture immediately** (use /review): When the user explicitly invokes review, or at natural breakpoints

### Queue Format

```markdown
## [YYYY-MM-DD HH:MM] - [Session Context]
- **Type:** Lesson | Memory | Preference
- **Proposed:** [The thing to capture]
- **Context:** [What was happening when this was observed]

---
```

---

## Instructions for Claude

When this skill is invoked, follow these steps exactly:

### Step 0: Load Configuration

Before starting, check for `.atlas.yaml` in the project root:
- If found, read and use configured values
- If not found, use defaults:
  - `{REFERENCE_PATH}` → `reference/`
  - `{BACKLOG_PATH}` → `backlog/tasks/`
  - `{USER_NAME}` → "the user"

### Step 1: Determine Mode

Check if the user provided specific information with the command:

**Direct mode** (user provided info): The user included specific learnings, memories, or preferences to capture. Proceed to Step 2.

**Interactive mode** (no details provided): The user just invoked `/claude-code-skills:review` without specifics.

**Do NOT start by asking questions.** Instead, analyze the session context and propose learnings:

> Let me review what we worked on this session and propose some learnings to capture...
>
> [Analyze session, then present proposed entries per Step 3]

If the session had no significant work (e.g., user just started), then ask what they'd like to capture:

> This appears to be a fresh session. What would you like to review?
> 1. **Recent work** - Learnings from a previous session or project
> 2. **General insight** - A preference, decision, or realization
> 3. **Update existing** - Modify or expand existing reference entries

---

### Step 2: Read Current Reference State

Read all relevant reference files to understand current state:

```
{REFERENCE_PATH}/CONVENTIONS.md           # Classification rules and graduated capture pattern
{REFERENCE_PATH}/memories/memories.md
{REFERENCE_PATH}/lessons/lessons.md
{REFERENCE_PATH}/identity/preferences.md
{REFERENCE_PATH}/identity/profile.md
{REFERENCE_PATH}/identity/why.md
```

Also read recent backlog activity for context:

```
`{BACKLOG_PATH}/*.md` (read all task files for context)
```

Check for:
- Existing entries that might overlap with new learnings
- Current format and structure to maintain consistency
- Related context that should inform the new entries

---

### Step 3: Infer Learnings from Session Context

**Critical principle: Infer first, confirm second. Never interrogate.**

Claude has full session context. Use it. The user should not have to recall and articulate what Claude already observed.

#### Step 3a: Analyze Session Context

Review the current session to identify:

1. **What was accomplished** - Tasks completed, problems solved, features built
2. **Approaches that worked** - Patterns, methods, or strategies that succeeded
3. **Challenges encountered** - Where things were harder than expected, what failed first
4. **Decisions made** - Trade-offs, architectural choices, prioritization calls
5. **Facts discovered** - About tools, systems, people, or constraints
6. **Preferences expressed** - How the user reacted to suggestions, what they pushed back on

#### Step 3b: Draft Proposed Entries

Based on your analysis, draft specific entries. Be concrete:

- **Good:** "Lesson: Phased development worked well - built and validated orient skill before moving to add skill"
- **Bad:** "Lesson: Something about development approach" (too vague, requires user to fill in)

#### Step 3c: Present for Confirmation (Not Interrogation)

Present your proposed entries with enough context that the user can quickly confirm or adjust:

> Based on this session, I'd propose capturing:
>
> **Lessons:**
> - [Specific learning with context from session]
> - [Another specific learning]
>
> **Memories:**
> - [Specific fact about {USER_NAME} or decision they made]
>
> Does this capture the key learnings? Anything to add, remove, or rephrase?

#### When to Ask Questions

Only ask questions when there is **genuine ambiguity** that blocks classification or phrasing:

| Ambiguous Situation | Appropriate Question |
|---------------------|----------------------|
| Unclear if insight is a lesson vs. preference | "This could be framed as a lesson (how to approach X) or a preference (you prefer Y). Which feels more accurate?" |
| User's reasoning wasn't stated | "You chose X over Y - was that because of [A] or [B]?" |
| Multiple interpretations of a decision | "When you said 'keep it simple,' did you mean simple implementation or simple UX?" |
| Session had no clear learnings | "This session was mostly execution. Anything worth capturing that I might have missed?" |

**Never ask:**
- "What worked well?" (You observed what worked)
- "What was challenging?" (You saw the challenges)
- "Any decisions made?" (You were there for the decisions)

#### For Updates to Existing Entries

When the user wants to update existing entries (not capture new learnings), ask:
> Which reference file and entry do you want to update?
> - Memories (`{REFERENCE_PATH}/memories/memories.md`)
> - Lessons (`{REFERENCE_PATH}/lessons/lessons.md`)
> - Preferences (`{REFERENCE_PATH}/identity/preferences.md`)
> - Why/Motivations (`{REFERENCE_PATH}/identity/why.md`)
>
> What change would you like to make?

---

### Step 4: Classify and Draft Updates

Based on the conversation, classify the learnings into the appropriate reference files:

| Type of Learning | Target File | When to Use |
|------------------|-------------|-------------|
| **Memory** | `{REFERENCE_PATH}/memories/memories.md` | Facts about {USER_NAME} as a person - their decisions, commitments, life circumstances, relationships, things they've told you that you should remember about them |
| **Lesson** | `{REFERENCE_PATH}/lessons/lessons.md` | Behavioral and approach-level insights - how Claude or {USER_NAME}'s *approach* failed or succeeded, and what to do differently. Focus on transferable principles, NOT implementation details or documentation facts. |
| **Preference** | `{REFERENCE_PATH}/identity/preferences.md` | How {USER_NAME} likes to work, what frustrates or energizes them |
| **Profile** | `{REFERENCE_PATH}/identity/profile.md` | Biographical/personal facts - organizational style, writing voice, technical preferences, hobbies, social persona |
| **Why/Motivation** | `{REFERENCE_PATH}/identity/why.md` | Core motivations, what they're optimizing for |

**Critical distinction for Lessons vs. documentation:**

⚠️ **STOP AND ASK THESE QUESTIONS BEFORE PROPOSING ANY LESSON:**

1. **Is this generalizable?** Would this insight apply to a future session working on a *different* project? If it only matters in the context of this specific project (financial-analysis, golf-clip, etc.), it's project documentation, not a lesson.

2. **Is this a behavioral change?** Does this change how Claude should *approach* work? Or is it just a fact about how something works? Facts belong in docs, not lessons.

3. **Would a fresh Claude session benefit from this?** If the insight requires context about this specific project to be useful, it doesn't belong in the reference layer.

**Examples:**
- ✅ **Good lesson:** "Declared deployment 'working' after page loaded without testing core functionality. Define acceptance criteria before verification."
  - *Why good: Applies to ANY deployment, ANY project*
- ❌ **Bad lesson:** "Financial script needs 500-1000 patterns, not 50-100, because vendors map to categories."
  - *Why bad: Only relevant to financial-analysis project. Put this in the project's design doc.*
- ❌ **Bad lesson:** "Amazon transactions need MCP server integration for proper categorization."
  - *Why bad: Project-specific technical decision. Belongs in project docs or backlog.*

Lessons should answer: "What did I do wrong in my *approach*, and how should I *behave differently* next time?" — **agnostic of the specific project or implementation details.**

**Litmus test:** If you have to mention a specific project name or technology to explain the lesson, it's probably not generalizable enough.

**Critical distinction for Memories vs. session logs:**
- **Good memory:** "{USER_NAME} decided to prioritize mobile access over automation." (A fact about {USER_NAME}.)
- **Bad memory:** "Created 5 command files for the dev-org plugin." (A session changelog - this belongs in git history or handoff docs, not memories.)
- Memories should answer: "What should I remember about *{USER_NAME}*?"

**Before adding:** Check if a similar entry already exists. If so, consider updating the existing entry rather than creating a duplicate.

**Graduated Capture:** Check if the concept already exists in another file and should "graduate" to a new stage (per `{REFERENCE_PATH}/CONVENTIONS.md`):

| Current Location | Graduation Trigger | Action |
|------------------|-------------------|--------|
| Memory | Same pattern observed 2+ times | Graduate to Preference |
| Preference | Pattern violation caused problems | Graduate to Lesson |

When graduating an entry, note the progression in the new entry. Example:
> "This preference was first noted as a memory on 2026-01-15. It's now confirmed as a pattern — graduating to preferences."

The original entry stays (provides historical context); the new entry is the operational rule.

**Before proposing changes, confirm with the user:**

> Based on our conversation, I'd like to capture the following:
>
> **Memories** (to `{REFERENCE_PATH}/memories/memories.md`):
> - [Summary of memory entry]
>
> **Lessons** (to `{REFERENCE_PATH}/lessons/lessons.md`):
> - [Summary of lesson entry]
>
> **Preferences** (to `{REFERENCE_PATH}/identity/preferences.md`):
> - [Summary of preference update]
>
> Does this capture everything? Should I add, remove, or change anything?

Wait for user confirmation before proceeding to write.

---

### Step 5: Write Updates

Apply updates to the appropriate files, following their existing formats.

#### Writing to Memories (`{REFERENCE_PATH}/memories/memories.md`)

**Memories are about {USER_NAME} as a person** - their decisions, commitments, life facts, preferences expressed in conversation, and things they've shared that Claude should remember across sessions. They are NOT session changelogs or records of work performed.

Add new entries after the `## Memories` header, using the template:

```markdown
### [YYYY-MM-DD] - [Brief Title]
- **Context:** [What was happening when {USER_NAME} shared/decided this]
- **Key Decision/Fact:** [The thing to remember about {USER_NAME}]
- **Why It Matters:** [How this affects how Claude should work with {USER_NAME}]
```

#### Writing to Lessons (`{REFERENCE_PATH}/lessons/lessons.md`)

**Lessons are about behavioral approaches** - how Claude's or {USER_NAME}'s approach succeeded or failed, and what to do differently next time. They should be transferable principles that apply regardless of the specific technology or implementation. Never record documentation facts or technical trivia as lessons.

Add new entries either to an existing category or create a new one under `## Future Learnings`:

```markdown
### [YYYY-MM-DD] - [Project/Context]

- **Learning**: [What behavioral approach failed or succeeded, and what to do differently]
- **Context**: [Situation that led to this insight]
- **Application**: [How to behave differently going forward]
```

**Note:** For entries in existing project sections (like "From Traffic Control"), match the bullet-point style of that section. Use the full dated template only for new entries under "## Future Learnings".

Update `*Last updated: YYYY-MM-DD*` at the bottom of the file.

#### Writing to Preferences (`{REFERENCE_PATH}/identity/preferences.md`)

Either:
- Add a new section with a descriptive header
- Add bullet points to an existing relevant section
- Include quotes if the user expressed something memorable

#### Writing to Why (`{REFERENCE_PATH}/identity/why.md`)

Either:
- Add to an existing section
- Create a new subsection under relevant headers
- Update guiding principles if appropriate

---

### Step 6: Verify Changes (REQUIRED)

**This step is mandatory. Never skip it.**

After writing to each file:

1. Read back the modified file
2. Display the relevant section showing the new or updated content
3. Confirm the changes match what was intended

**Verification output format:**

> **Verification - `{REFERENCE_PATH}/memories/memories.md` after update:**
>
> ```markdown
> ### 2026-01-27 - [Title of new entry]
> - **Context:** ...
> - **Key Decision/Fact:** ...
> - **Why It Matters:** ...
> ```
>
> Changes confirmed.

Repeat for each file modified.

---

### Step 7: Commit to Git

After all updates are verified, commit with a descriptive message that summarizes what was captured.

**Commit message format:**

```
Review: [brief summary of what was captured]

Files updated:
- [list of files changed]
```

**Examples:**

```
Review: Capture learnings from dev-org skills implementation

Files updated:
- reference/memories/memories.md
- reference/lessons/lessons.md
```

```
Review: Document preference for verification culture

Files updated:
- reference/identity/preferences.md
```

---

### Step 8: Summary

After committing, provide a brief summary:

> **Review Complete**
>
> I've captured:
> - [X] memories to `{REFERENCE_PATH}/memories/memories.md`
> - [X] lessons to `{REFERENCE_PATH}/lessons/lessons.md`
> - [X] preference updates to `{REFERENCE_PATH}/identity/preferences.md`
>
> Committed with message: "[commit message]"
>
> Anything else you want to capture before we move on?

---

## File Paths

All file paths in this skill are relative to the dev-org repo root.

## Files Read

- `{REFERENCE_PATH}/CONVENTIONS.md` - Classification rules and graduated capture pattern
- `{REFERENCE_PATH}/memories/memories.md` - Existing memories
- `{REFERENCE_PATH}/lessons/lessons.md` - Existing lessons
- `{REFERENCE_PATH}/identity/preferences.md` - Existing preferences
- `{REFERENCE_PATH}/identity/profile.md` - Personal/biographical facts
- `{REFERENCE_PATH}/identity/why.md` - Core motivations
- `{BACKLOG_PATH}/*.md` - Recent work context (per-task files)

## Files Written

- `{REFERENCE_PATH}/memories/memories.md` - New memory entries
- `{REFERENCE_PATH}/lessons/lessons.md` - New lesson entries
- `{REFERENCE_PATH}/identity/preferences.md` - Updated preferences
- `{REFERENCE_PATH}/identity/why.md` - Updated motivations

## Integrations

- **Git** - Commit all reference updates with descriptive commit messages

---

## Error Handling

- **If a reference file does not exist:** Create it using the standard template from existing examples, then add the new entry.
- **If the user is unsure what to capture:** Offer to review recent git commits or the backlog for context on what work was done.
- **If classification is unclear:** Ask the user which file feels most appropriate, or suggest adding to multiple files if relevant.
- **If git commit fails:** Inform the user of the failure and suggest they commit manually with the appropriate message.

---

## Examples

### Example 1: Inference-first session review (the standard flow)

User: `/claude-code-skills:review`

*Context: Claude and {USER_NAME} just finished setting up dev-org skills. During the session, Claude observed: (1) they built orient skill first, validated it worked, then moved to add skill; (2) {USER_NAME} pushed back on overly prescriptive instructions; (3) {USER_NAME} explicitly said "I've been burned by 'done' claims" when adding verification.*

Response:
> Let me review what we worked on this session...
>
> We built out the dev-org skills system - orient, add, status, and review. Based on what I observed, I'd propose capturing:
>
> **Lessons** (to `{REFERENCE_PATH}/lessons/lessons.md`):
> - **Phased development worked well** - We built and validated orient before moving to add. This incremental approach caught issues early.
> - **Skill instruction balance** - You pushed back when instructions were too prescriptive ("this is too rigid"). The sweet spot is clear structure with room for judgment.
>
> **Memories** (to `{REFERENCE_PATH}/memories/memories.md`):
> - **Verification culture decision** - You made verification mandatory in all skills, citing past experiences with false "done" claims.
>
> **Preferences** (to `{REFERENCE_PATH}/identity/preferences.md`):
> - **Show, don't tell** - Always show actual results rather than claiming completion.
>
> Does this capture the key learnings? Anything to add, remove, or rephrase?

User: "That's good. Add that I want to avoid over-engineering - this is a knowledge repo, not an app."

Response:
> Got it. I'll add that as a preference. Here's the updated proposal:
>
> **Lessons:**
> - Phased development worked well
> - Skill instruction balance
>
> **Memories:**
> - Verification culture decision
>
> **Preferences:**
> - Show, don't tell
> - Avoid over-engineering - this is a knowledge repo, not an application
>
> Proceeding to write...

[Writes to files]

> **Verification - `{REFERENCE_PATH}/lessons/lessons.md` after update:**
>
> ```markdown
> ### 2026-01-27 - Dev-org Skills Development
>
> - **Learning**: Phased development works - build and validate one skill at a time before moving on
> - **Context**: Building dev-org skills (orient, add, status, review)
> - **Application**: Continue this pattern for future capability building
>
> - **Learning**: Skill instruction detail requires balance - too prescriptive creates rigidity, too loose creates inconsistency
> - **Context**: Writing skill markdown files
> - **Application**: Aim for clear structure with room for judgment
> ```
>
> Changes confirmed.
>
> [Commits: "Review: Capture learnings from dev-org skills implementation"]
>
> **Review Complete**
>
> I've captured:
> - 1 memory to `{REFERENCE_PATH}/memories/memories.md`
> - 2 lessons to `{REFERENCE_PATH}/lessons/lessons.md`
> - 2 preferences to `{REFERENCE_PATH}/identity/preferences.md`
>
> Committed with message: "Review: Capture learnings from dev-org skills implementation"

---

### Example 2: Direct mode with specific input

User: `/claude-code-skills:review` "I realized I work better when I can see my calendar and tasks together. Add that as a preference."

Response:
> Got it. Let me check the current preferences file...
>
> [reads file]
>
> I'll add this under "Daily Workflow Modes" since it relates to how you work. Here's what I'll add:
>
> **Preferences** (to `{REFERENCE_PATH}/identity/preferences.md`):
> - Works better when calendar and tasks are visible together - integrated view helps with prioritization
>
> Does this capture it correctly?

User: "Yes"

[Writes to file]

> **Verification - `{REFERENCE_PATH}/identity/preferences.md` after update:**
>
> ```markdown
> ## Daily Workflow Modes
>
> I work in multiple modes:
> - **Calendar-driven** - Reviewing calendar and slotting tasks into available time
> - **Gut feel** - Sometimes prioritization is intuitive
> - **Reactive** - Responding to what comes up
> - **Integrated view** - Works better when calendar and tasks are visible together; helps with prioritization
> ```
>
> Changes confirmed.
>
> [Commits: "Review: Add preference for integrated calendar/task view"]
>
> **Review Complete**

---

### Example 3: When clarifying questions ARE appropriate

User: `/claude-code-skills:review` "The Chrome extension project failed - I want to document why"

*Context: This references a project from a previous session. Claude doesn't have direct session context, so it needs some information.*

Response:
> I don't have context on the Chrome extension project from this session. Can you share what happened so I can draft the right lesson?

User: "I jumped straight into building without understanding the Chrome extension APIs. Spent a week fighting the manifest v3 restrictions."

Response:
> Got it - that's a clear pattern. Based on this, I'd propose:
>
> **Lessons** (to `{REFERENCE_PATH}/lessons/lessons.md`):
> - **Chrome Extension Project (Failed)**: Jumped into building without understanding platform constraints (manifest v3). Spent a week fighting restrictions that would have been obvious from reading docs first.
> - **Application**: Read platform docs and build minimal PoC before committing to full implementation. Reinforces existing "understand constraints first" principle.
>
> This echoes your lessons from Traffic Control. Should I capture it?

User: "Yes"

[Writes, verifies, commits]

*Note: Claude asked for context because it genuinely didn't have it (previous session). But it did NOT ask "What would you do differently?" - it inferred the application from the described failure.*

---

## Reminders

- **Infer first, confirm second** - Never ask "What worked well?" when you observed what worked. Propose specific entries based on session context.
- **Verification is mandatory** - Always show actual file contents after changes
- **Only ask when genuinely ambiguous** - Questions should clarify classification or phrasing, not extract information Claude already has
- **Classify appropriately** - Put learnings in the right file based on their nature
- **Confirm before writing** - Always show proposed changes and get user approval
- **Commit all changes** - Every update to reference files should be committed
- **Update timestamps** - Update "Last updated" fields where applicable
