# /add

## Purpose

Add new tasks or ideas to the backlog, or update the status of existing tasks. Handles the full lifecycle of backlog items.

## What It Does

1. Accepts task information (title, status, priority, notes)
2. Checks for duplicate tasks in the backlog
3. Creates a new task file or updates an existing one
4. For bug tasks, optionally creates verification tests
5. Commits changes to git

## When to Use

- Capturing a new task or idea
- Updating the status of an existing task (e.g., marking as done)
- Adding notes or blockers to a task
- Quick capture during work sessions

## Config Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `{BACKLOG_PATH}` | Directory for task files | `backlog/tasks/` |
| `{USER_NAME}` | Name for personalized messages | `"the user"` |

## Task Status Values

| Status | When to Use |
|--------|-------------|
| `draft` | Unconfirmed ideas, brainstorming (default for new items) |
| `not started` | Committed tasks ready to begin |
| `in progress` | Actively being worked on |
| `blocked` | Cannot continue due to dependency |
| `done` | Task completed |

## Dependencies

- Git repository for commit tracking
