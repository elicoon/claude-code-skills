---
name: write-plan
description: Create implementation plans with mandatory verification steps
---

# /claude-code-skills:write-plan

Wrapper for `superpowers:writing-plans` that enforces dev-org verification standards by automatically including code-review and test-feature as final tasks in every plan.

## When to Use

Use instead of `superpowers:writing-plans` directly. Same triggers:
- You have a spec or requirements for a multi-step task
- Before touching code
- After brainstorming, when ready to plan implementation

## When NOT to Use

- Pure research/documentation tasks (no code to verify)
- Trivial single-file changes

---

## Instructions for Claude

When this skill is invoked:

### Step 1: Invoke superpowers:writing-plans

Announce:
> I'm using the dev-org:write-plan skill to create an implementation plan with verification steps.

Then invoke:
```
/superpowers:writing-plans
```

Follow that skill's full process to create the plan.

### Step 2: Append Verification Tasks

After the plan is written but BEFORE presenting execution options, append these mandatory tasks to the plan file:

```markdown
---

## Verification (Mandatory)

> These tasks are required before considering the implementation complete.

### Task N+1: Code Review

**Invoke:** `/claude-code-skills:code-review`

Review all implementation work for:
- Conventional commits (feat/fix/docs/chore prefixes)
- No obvious security issues (OWASP top 10)
- No over-engineering beyond requirements
- Documentation updated where needed

**Expected:** All issues addressed before proceeding.

### Task N+2: Feature Testing

**Invoke:** `/claude-code-skills:test-feature [feature name]`

Test the complete user experience:
- Primary use cases work as expected
- Edge cases handled
- Error scenarios behave correctly
- Integration points function

**Expected:** All tests pass with evidence (actual output shown).

### Task N+3: Final Commit

After verification passes:
```bash
git status  # Verify clean state
git log --oneline -5  # Review commits
```

Mark task as done only after this step completes successfully.
```

### Step 3: Update Task Count

Update any "Total Tasks: X" in the plan header to include the verification tasks.

### Step 4: Present Execution Options

Now present the execution choice from superpowers:writing-plans:

> **Plan complete with verification steps.** Saved to `docs/plans/<filename>.md`
>
> Two execution options:
>
> **1. Subagent-Driven (this session)** - Fresh subagent per task, review between tasks
>
> **2. Parallel Session (separate)** - Open new session with executing-plans
>
> Which approach?

---

## Examples

### Example: Plan with verification appended

User invokes `/claude-code-skills:write-plan` for a new feature.

After superpowers:writing-plans creates:
```markdown
### Task 1: Create data model
### Task 2: Implement API endpoint
### Task 3: Add tests
```

This skill appends:
```markdown
---

## Verification (Mandatory)

### Task 4: Code Review
...

### Task 5: Feature Testing
...

### Task 6: Final Commit
...
```

---

## Why This Exists

The superpowers plugin is maintained upstream and gets updates. Rather than forking, this wrapper:
1. Preserves upstream improvements to writing-plans
2. Adds dev-org-specific verification requirements
3. Ensures code-review and test-feature are never skipped

---

## Underlying Skill

This skill wraps `superpowers:writing-plans`. For the core planning functionality, see that skill's documentation.

### Final Step: Generate UAT

After the implementation plan is written and saved:

> Implementation plan complete. Now generating UAT and test checklist...

Invoke `/claude-code-skills:uat` with the plan file:
- Pass the plan file path as argument
- Wait for test data confirmation
- Generate UAT doc and checklist

This ensures every plan has corresponding acceptance criteria.