# /orient

## Purpose

Review backlog, calendar, and context to facilitate a prioritization discussion. Helps you decide what to work on next at the start of a session.

## What It Does

1. Reads your backlog (task files) and reference layer (identity, lessons, memories)
2. Optionally fetches calendar data (if Google Calendar integration is configured)
3. Analyzes active, committed, blocked, and draft work
4. Opens a conversation to help narrow down to a single focus
5. Guides you to a decision with time boundaries

## When to Use

- Starting a work session and need to decide what to focus on
- Feeling overwhelmed and need help prioritizing
- Want to review commitments before making new ones
- Need a sanity check on current priorities

## Config Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `{REFERENCE_PATH}` | Path to reference layer files | `reference/` |
| `{BACKLOG_PATH}` | Path to task files | `backlog/tasks/` |
| `{USER_NAME}` | Name to use when addressing you | `"the user"` |
| `{CALENDAR_INTEGRATION}` | Calendar provider (`google` or `none`) | `"none"` |

## Dependencies

- Backlog task files in `{BACKLOG_PATH}/`
- Optional: Google Calendar MCP for time context
