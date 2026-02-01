# /review

## Purpose

Update the reference layer with memories, lessons learned, preferences, and the "why" behind decisions. Conducts a conversational reflection to extract and document learnings.

## What It Does

1. Analyzes session context to identify learnings (infers first, confirms second)
2. Classifies learnings into memories, lessons, or preferences
3. Checks for duplicates and graduation opportunities
4. Writes to appropriate reference files
5. Commits changes to git

## When to Use

- At the end of significant work sessions
- After project completions
- When you've had insights worth preserving
- When updating identity or preference documentation

## Config Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `{REFERENCE_PATH}` | Base path for reference files | `reference/` |
| `{BACKLOG_PATH}` | Path to task files (for context) | `backlog/tasks/` |
| `{USER_NAME}` | Name used in documentation | `"the user"` |

## Key Principles

- **Infer first, confirm second** - Claude proposes learnings based on session context, doesn't interrogate
- **Lessons are behavioral** - Not documentation facts, but transferable principles
- **Memories are about you** - Decisions, commitments, facts about you as a person
- **Graduated capture** - Patterns can graduate from memories to preferences to lessons

## Dependencies

- Reference layer files in `{REFERENCE_PATH}/`
- Git repository for commit tracking
