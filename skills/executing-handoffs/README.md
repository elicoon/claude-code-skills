# /executing-handoffs

## Purpose

Orchestrate continuation of work from a handoff document. Keeps the main thread lightweight (coordination only) by delegating all substantive work to subagents.

## What It Does

1. Reads and digests the handoff document
2. Classifies work type (implementation, research, debugging, conversational, mixed)
3. Decomposes remaining work into delegatable tasks
4. Executes via subagents (Task tool), keeping main thread for coordination
5. Tracks progress and checkpoints with user at key decision points
6. Archives the handoff and offers new handoff if work remains

## When to Use

- Starting a session from a handoff document (primary use case)
- Resuming multi-session work
- Re-engaging after context gets heavy mid-session

## Work Types

| Work Type | Delegation Strategy |
|-----------|---------------------|
| Implementation | Subagents implement, test, and commit |
| Research | Subagents explore sources, analyze options |
| Debugging | Subagents investigate specific hypotheses |
| Conversational | Main thread handles; subagents do supporting work |

## Config Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `{REFERENCE_PATH}` | Path to reference layer | `reference/` |
| `{BACKLOG_PATH}` | Path to task files | `backlog/tasks/` |
| `{PLANS_PATH}` | Path to plans/handoff documents | `docs/plans/` |
| `{USER_NAME}` | Name of the user | `"the user"` |

## Main Thread Rules

- Read handoff and reference docs: **Main thread**
- Explore codebase, write code, run tests: **Subagent**
- Make decisions with user: **Main thread**
- Track progress, assess context: **Main thread**

## Dependencies

- Handoff document (from `/handoff` skill)
- Task tool for subagent dispatch
