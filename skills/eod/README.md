# /eod

## Purpose

End-of-day ritual to close out the workday cleanly. Processes pending lessons, checks for loose ends, and optionally summarizes accomplishments.

## What It Does

1. Processes lessons queued during the day (from `pending-review.md`)
2. Evaluates lessons for graduation to global `CLAUDE.md`
3. Checks for uncommitted git changes
4. Reviews in-progress tasks that may need status updates
5. Offers a day summary based on git commits and task updates

## When to Use

- At the end of your workday
- Before stepping away from a long session
- When you want to ensure nothing is left hanging

## Config Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `{REFERENCE_PATH}` | Path to reference layer | `reference/` |
| `{BACKLOG_PATH}` | Path to task files | `backlog/tasks/` |
| `{USER_NAME}` | Name used in documentation | `"the user"` |

## Lesson Graduation Criteria

A lesson graduates to global `CLAUDE.md` if it:
- Applies to **all sessions**, not just specific projects
- Represents a **recurring pattern** (happened more than once)
- Is **high-impact** (caused real problems when violated)

## Dependencies

- Pending review file at `{REFERENCE_PATH}/lessons/pending-review.md`
- Git repository for status checks
