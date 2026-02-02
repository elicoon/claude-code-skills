---
name: code-review
description: Invoke deep code review with consistent criteria
---

# /claude-code-skills:code-review

Wrapper skill that invokes `superpowers:code-reviewer` with dev-org conventions.

## When to Use

Use after completing significant implementation work:
- New features or components
- Bug fixes with substantial code changes
- Refactors that touch multiple files
- Before creating a PR

## When NOT to Use

- For quick single-line fixes
- For documentation-only changes
- When you haven't written any code yet (use brainstorming instead)

---

## Instructions for Claude

When this skill is invoked:

### Step 1: Identify Review Scope

Check if the user specified files or scope:

**With scope provided:** `/claude-code-skills:code-review src/feature/`
- Review the specified files/directory

**Without scope:** `/claude-code-skills:code-review`
- Check git status for recent changes
- If no uncommitted changes, ask what to review

### Step 2: Invoke superpowers:code-reviewer

Announce:
> Running deep code review using superpowers:code-reviewer...

Then invoke:
```
/superpowers:code-reviewer
```

### Step 3: Apply Dev-Org Review Criteria

In addition to standard code review, verify:

1. **Conventional commits** - Are commit messages using feat(), fix(), docs(), chore() prefixes?
2. **Documentation** - Are significant changes reflected in relevant docs/CLAUDE.md?
3. **Verification culture** - Does the code show actual results, not just claim "done"?
4. **No over-engineering** - Is the solution appropriately scoped to the problem?
5. **Security** - No obvious OWASP top 10 vulnerabilities?

### Step 4: Report

Present findings with:
- Issues found (with file:line references)
- Suggestions for improvement
- Verification that dev-org standards are met

---

## Examples

### Example 1: Review recent changes

User: `/claude-code-skills:code-review`

> Let me check what's changed...
>
> [checks git status, finds modified files]
>
> Running deep code review on the following files:
> - src/skills/new-feature/SKILL.md
> - hooks/new-hook.js
>
> [invokes superpowers:code-reviewer]
>
> **Review Complete**
>
> Findings:
> - [hook.js:42](hooks/new-hook.js#L42) - Missing error handling for file read
> - Commit message follows conventional commits ✓
> - No security issues found ✓
>
> Suggestions:
> - Add try-catch around fs.readFileSync at line 42

### Example 2: Review specific directory

User: `/claude-code-skills:code-review skills/orient/`

> Running deep code review on skills/orient/...
>
> [invokes superpowers:code-reviewer with path]

---

## Underlying Skill

This skill wraps `superpowers:code-reviewer`. For advanced review options, invoke that skill directly.
