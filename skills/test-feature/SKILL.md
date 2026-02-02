---
name: test-feature
description: Structured product/feature testing workflow
---

# /claude-code-skills:test-feature

Structured workflow for testing features end-to-end before considering them complete.

## When to Use

Use when:
- A feature implementation is "code complete"
- Before marking a task as done
- When you want to verify the full user experience
- After bug fixes to confirm the fix works

## When NOT to Use

- For unit tests (those should run during development)
- For code review (use `/claude-code-skills:code-review`)
- When you haven't built anything yet

---

## Instructions for Claude

When this skill is invoked:

### Step 1: Identify What to Test

Check if the user specified a feature:

**With feature specified:** `/claude-code-skills:test-feature user authentication`
- Test the specified feature

**Without specification:** `/claude-code-skills:test-feature`
- Check recent commits/changes for context
- Ask: "What feature should I test?"

### Step 1b: Check for UAT Checklist

After identifying the feature, look for an existing UAT checklist:

```bash
ls docs/plans/*<feature>*-checklist.md
```

**If checklist found:**
> Found UAT checklist: `docs/plans/<date>-<feature>-checklist.md`
> Using this as the test plan.

Read the checklist and use it as the test plan (skip Step 2).

**If no checklist found:**
Proceed to Step 2 (create ad-hoc test plan).

### Step 2b: Reset Checklist (if using UAT checklist)

Before testing, clear all checkmarks for a fresh run:

1. Read the checklist file
2. Replace all `- [x]` with `- [ ]`
3. Remove any status annotations (dates, notes)
4. Write the reset checklist back

> Checklist reset for fresh test run.

### Step 2: Create Test Plan

Before testing, outline what will be verified:

> **Test Plan for [Feature Name]**
>
> 1. [Primary use case]
> 2. [Edge case]
> 3. [Error handling]
> 4. [Integration points]

Get user confirmation before proceeding.

### Step 3: Execute Tests

For each test case:

1. **Describe** what you're testing
2. **Execute** the test (run commands, interact with UI, etc.)
3. **Observe** actual behavior
4. **Compare** to expected behavior
5. **Record** pass/fail with evidence

**Show actual output, not claims.** If testing a CLI:
```
$ command --flag
[actual output here]
```

If testing UI via browser:
- Use browser_snapshot to capture state
- Document what you see

**If using UAT checklist:**
For each test case ID, reference the UAT doc (`*-uat.md`) for detailed steps:
- Read the detailed steps from the UAT doc
- Execute those exact steps
- Capture evidence (screenshots, command output)

### Step 4: Report Results

Format:
> **Test Results: [Feature Name]**
>
> | Test Case | Expected | Actual | Status |
> |-----------|----------|--------|--------|
> | [case 1]  | [...]    | [...]  | ✓ Pass |
> | [case 2]  | [...]    | [...]  | ✗ Fail |
>
> **Issues Found:**
> - [Description with reproduction steps]
>
> **Recommendation:** [Ready to ship / Needs fixes]

**If using UAT checklist:**
Update the checklist file with results:
- `- [x] HP-1: User can upload video ✓ 2026-01-30`
- `- [ ] ERR-1: Invalid format shows error ✗ "Silent fail, no error message"`

For manual verification items, prompt the user with clickable links:

> **Manual Verification Required:**
>
> | ID | What to Verify | Where to Look |
> |----|----------------|---------------|
> | MAN-1 | [criteria from UAT] | [clickable file link](path/to/file.md) |
>
> Click each link, verify, then respond with pass/fail for each ID.

**Link format:** Use markdown links that open the relevant file:
- For UAT doc: `[Review test cases](docs/plans/<date>-<feature>-uat.md)`
- For generated files: `[Check output](path/to/generated/file.md)`
- For UI: Provide browser URL or take screenshot inline

**Example:**
> | ID | What to Verify | Where to Look |
> |----|----------------|---------------|
> | MAN-1 | Test cases are meaningful | [UAT doc](docs/plans/2026-01-30-feature-uat.md#test-cases) |
> | MAN-2 | Checklist is scannable | [Checklist](docs/plans/2026-01-30-feature-checklist.md) |

### Step 5: Handle Failures

If tests fail:
1. Document the failure with evidence
2. Create bug task with test + UAT (Step 5b)
3. Do NOT mark the original task as done

#### Step 5b: Create Bug Tasks for Failures

For each test failure, create a bug task in `backlog/tasks/`:

**Filename:** `bug-[short-description].md`

**Content:**
```markdown
### [Bug Title from test failure]

- **Project:** [project from feature context]
- **Status:** draft
- **Priority:** 2
- **Type:** bug
- **Added:** [date]
- **Updated:** [date]
- **Source:** test-feature ([feature name])
- **Test:** `tests/bugs/<slug>.test.ts`

#### Failure Details
- **Test case:** [which test case failed]
- **Expected:** [expected behavior]
- **Actual:** [actual behavior observed]
- **Evidence:** [command output, screenshot reference, etc.]

#### Proposed Fix
[Analysis of what went wrong and suggested code change]

#### UAT Verification
- [ ] [Reproduce original failure - should now work]
- [ ] [Verify expected behavior]
- [ ] [Check related functionality still works]
```

#### Step 5c: Create Bug Verification Tests

For each bug task, generate a test file:

**Test location:** Follow the project's test conventions. Default paths:
- `tests/bugs/<slug>.test.ts` for TypeScript projects
- `tests/bugs/<slug>.test.js` for JavaScript projects
- `tests/bugs/test_<slug>.py` for Python projects

**Test template:**
```typescript
/**
 * Bug verification test: [Bug Title]
 * Task: backlog/tasks/bug-<slug>.md
 * Source: test-feature ([feature name])
 *
 * This test fails when the bug is present and passes when fixed.
 * Run with: [appropriate test command]
 */

describe('[Bug Title]', () => {
  it('should [expected correct behavior]', () => {
    // Setup: recreate the conditions from the failed test

    // Action: perform the operation that failed

    // Assert: verify the expected (correct) behavior
  });
});
```

If unable to create tests (no test framework, unclear reproduction):
- Note in the task: "Manual verification required - [reason]"
- Still create the UAT checklist in the task

#### Step 5d: Updated Failure Report

When failures are found, include bug task summary:

> **Issues Found:**
>
> | Issue | Bug Task | Test | UAT Steps |
> |-------|----------|------|-----------|
> | [description] | `backlog/tasks/bug-xxx.md` | `tests/bugs/xxx.test.ts` | [N] steps |
>
> **Next Steps:**
> - Fix bugs (I can help)
> - Run `[test command]` to verify fixes
> - Complete UAT checklist in each bug task
> - Re-run `/claude-code-skills:test-feature` to confirm all tests pass

---

## Examples

### Example 1: Test dashboard feature

User: `/claude-code-skills:test-feature dashboard`

> **Test Plan for Dashboard**
>
> 1. Server starts without errors
> 2. Dashboard loads in browser
> 3. Backlog data displays correctly
> 4. Filters work (status, priority)
>
> Ready to proceed?

User: "yes"

> Testing server startup...
> ```
> $ node dashboard/serve.js
> Server running on http://localhost:3000
> ```
> ✓ Server starts
>
> Testing browser load...
> [takes browser_snapshot]
> ✓ Dashboard renders with task cards
>
> Testing data display...
> [checks displayed data against backlog/tasks/]
> ✓ 15 tasks displayed, matches backlog count
>
> **Test Results: Dashboard**
> | Test | Status |
> |------|--------|
> | Server startup | ✓ |
> | Browser load | ✓ |
> | Data display | ✓ |
> | Filters | ✓ |
>
> **Recommendation:** Ready to ship

### Example 2: Test with failures

User: `/claude-code-skills:test-feature context hook`

> Testing context monitor hook...
>
> ```
> $ node hooks/context-monitor.js stop < test-input.json
> Error: Cannot read properties of undefined (reading 'session_id')
> ```
>
> **Test Results: Context Hook**
> | Test | Status |
> |------|--------|
> | Stop event handling | ✗ Fail |
>
> **Issue:** Hook crashes when session_id is missing from input.
> **Location:** [hooks/context-monitor.js:149](hooks/context-monitor.js#L149)
>
> **Recommendation:** Needs fix. The hook should handle missing session_id gracefully.

---

## Key Principles

1. **Evidence over claims** - Always show actual output
2. **Test the user experience** - Not just "does code run" but "does it work as expected"
3. **Document failures** - Don't hide issues, surface them
4. **No premature completion** - Only mark done when tests pass
