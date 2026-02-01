# /test-feature

## Purpose

Structured end-to-end feature testing workflow. Executes test cases against implementation, reports results in table format, and creates bug tasks with verification tests for any failures.

## What It Does

1. Identifies what feature to test (from argument or recent changes)
2. Checks for existing UAT checklist (`docs/plans/*-checklist.md`)
3. If checklist found: resets checkmarks and uses as test plan
4. If no checklist: creates ad-hoc test plan covering primary use cases, edge cases, error handling, and integration points
5. Executes each test with actual output (commands, browser snapshots)
6. Reports results in a table format with pass/fail status
7. For failures:
   - Creates bug task in `backlog/tasks/bug-*.md`
   - Generates verification test in `tests/bugs/*.test.ts`
   - Includes UAT checklist in bug task
8. Provides manual verification prompts with clickable links for subjective items

## When to Use

- After feature implementation is code-complete
- After bug fixes to confirm the fix works
- Before marking any task as done
- When you want to verify the full user experience

## When NOT to Use

- For unit tests (those run during development)
- For code review (use `/code-review`)
- When no code has been built yet

## Dependencies

- Browser automation tools (for UI testing)
- Test framework matching project conventions (for bug verification tests)
